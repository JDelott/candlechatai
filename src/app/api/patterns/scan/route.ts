import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import yahooFinance from 'yahoo-finance2'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Define the shape of a Yahoo Finance quote result
type YahooQuote = {
  symbol?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  shortName?: string;
  longName?: string;
  sector?: string;
  industry?: string;
}

// Updated sector queries with more specific search terms
const SECTOR_QUERIES = {
  technology: {
    query: 'sector:"Technology"',
    defaultStocks: ['AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'CRM', 'ADBE', 'INTC', 'AMD', 'CSCO']
  },
  finance: {
    query: 'sector:"Financial Services"',
    defaultStocks: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'C', 'SCHW', 'AXP', 'V']
  },
  healthcare: {
    query: 'sector:"Healthcare"',
    defaultStocks: ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'LLY']
  },
  consumer: {
    query: 'sector:"Consumer Cyclical" OR sector:"Consumer Defensive"',
    defaultStocks: ['AMZN', 'HD', 'NKE', 'MCD', 'SBUX', 'TGT', 'WMT', 'PG', 'KO', 'PEP']
  },
  industrial: {
    query: 'sector:"Industrials"',
    defaultStocks: ['BA', 'HON', 'UPS', 'CAT', 'DE', 'LMT', 'GE', 'MMM', 'RTX', 'UNP']
  },
  energy: {
    query: 'sector:"Energy"',
    defaultStocks: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'PSX', 'VLO', 'OXY']
  },
  materials: {
    query: 'sector:"Basic Materials"',
    defaultStocks: ['LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'DOW', 'NUE', 'CTVA', 'VMC']
  },
  utilities: {
    query: 'sector:"Utilities"',
    defaultStocks: ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'PEG', 'WEC']
  },
  realestate: {
    query: 'sector:"Real Estate"',
    defaultStocks: ['PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'O', 'DLR', 'WELL', 'AVB', 'EQR']
  }
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

    let symbols: string[] = []
    
    try {
      if (sector === 'all') {
        // Get top stocks from each sector
        symbols = Object.values(SECTOR_QUERIES)
          .flatMap(sectorInfo => sectorInfo.defaultStocks)
          .slice(0, 50) // Limit to top 50 stocks across sectors
      } else {
        const sectorInfo = SECTOR_QUERIES[sector as keyof typeof SECTOR_QUERIES]
        if (!sectorInfo) {
          throw new Error(`Invalid sector: ${sector}`)
        }

        // Try to get stocks via search first
        const searchResults = await yahooFinance.search(sectorInfo.query, {
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

        // If search fails or returns no results, use default stocks for the sector
        if (symbols.length === 0) {
          console.log(`Using default stocks for sector: ${sector}`)
          symbols = [...sectorInfo.defaultStocks]
        }
      }
    } catch (error) {
      console.error('Stock search error:', error)
      // Use default stocks for the selected sector or general defaults
      const defaults = sector === 'all' || !SECTOR_QUERIES[sector as keyof typeof SECTOR_QUERIES]
        ? ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'] as string[]
        : [...SECTOR_QUERIES[sector as keyof typeof SECTOR_QUERIES].defaultStocks]
      symbols = defaults
    }

    if (symbols.length === 0) {
      return NextResponse.json(
        { error: 'No stocks available for analysis' },
        { status: 400 }
      )
    }

    console.log(`Analyzing ${symbols.length} symbols for ${pattern} pattern in ${sector} sector`)

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
