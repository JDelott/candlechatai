import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import yahooFinance from 'yahoo-finance2'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Define the shape of a Yahoo Finance quote result
type YahooQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  quoteType?: string;
  score?: number;
  typeDisp?: string;
  exchDisp?: string;
  sector?: string;
  sectorDisp?: string;
  industry?: string;
  industryDisp?: string;
}

// Simple sector queries
const SECTOR_QUERIES = {
  technology: 'sector:Technology',
  finance: 'sector:"Financial Services"',
  healthcare: 'sector:Healthcare',
  consumer: 'sector:Consumer',
  industrial: 'sector:Industrial',
  energy: 'sector:Energy',
  materials: 'sector:Materials',
  utilities: 'sector:Utilities',
  realestate: 'sector:"Real Estate"'
} as const

export async function POST(req: Request) {
  try {
    const { pattern, sector } = await req.json()
    
    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern is required' },
        { status: 400 }
      )
    }

    // Get stocks from Yahoo Finance based on sector
    let symbols: string[] = []
    
    try {
      // First try sector-based search
      const query = sector === 'all' 
        ? '' // Empty query returns popular stocks
        : SECTOR_QUERIES[sector as keyof typeof SECTOR_QUERIES] || ''
      
      const searchResults = await yahooFinance.search(query, {
        newsCount: 0,
        quotesCount: 100,
        enableFuzzyQuery: false
      })

      if (searchResults.quotes && searchResults.quotes.length > 0) {
        symbols = (searchResults.quotes as YahooQuote[])
          .filter(quote => quote?.symbol && typeof quote.symbol === 'string')
          .map(quote => quote.symbol!)
          .filter(symbol => symbol.length > 0)
      }

      // If sector search returns no results, fall back to top stocks
      if (symbols.length === 0) {
        console.log('Falling back to top stocks search')
        const topStocksResults = await yahooFinance.search('', {
          newsCount: 0,
          quotesCount: 50,
          enableFuzzyQuery: false
        })

        symbols = (topStocksResults.quotes as YahooQuote[])
          .filter(quote => quote?.symbol && typeof quote.symbol === 'string')
          .map(quote => quote.symbol!)
          .filter(symbol => symbol.length > 0)
      }
    } catch (error) {
      console.error('Yahoo Finance search error:', error)
      // Continue with default symbols if search fails
      symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
    }

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No stocks available for analysis' },
        { status: 400 }
      )
    }

    console.log(`Analyzing ${symbols.length} symbols for ${pattern} pattern`)

    // Fetch historical data for pattern analysis
    const stockDataPromises = symbols.map(async (symbol) => {
      try {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)

        const data = await yahooFinance.historical(symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        })

        return { symbol, data }
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error)
        return null
      }
    })

    const stocksData = (await Promise.all(stockDataPromises)).filter(Boolean)

    if (stocksData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch historical data for analysis' },
        { status: 400 }
      )
    }

    console.log(`Successfully fetched data for ${stocksData.length} stocks`)

    // Use Claude to analyze patterns
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a pattern analysis system that only outputs valid JSON.

For the following stock data, analyze for ${pattern} patterns:
${JSON.stringify(stocksData)}

Output a JSON array of matches in this exact format:
[
  {
    "symbol": "TICKER",
    "confidence": 85,
    "price": 150.25,
    "sector": "${sector}"
  }
]

Include only stocks where you find the pattern with high confidence (>70%).
Sort results by confidence descending.
Respond with ONLY the JSON array, no other text.`
      }]
    })

    const content = response.content[0]
    if (!content || content.type !== 'text') {
      throw new Error('Invalid response from Claude')
    }

    const matches = JSON.parse(content.text)
    console.log(`Found ${matches.length} pattern matches`)
    
    return NextResponse.json({ matches })
    
  } catch (error) {
    console.error('Pattern scan error:', error)
    return NextResponse.json(
      { 
        error: 'Pattern scan failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
