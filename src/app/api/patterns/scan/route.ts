import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// List of major stocks to scan (you can expand this)
const STOCKS_TO_SCAN = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META',
  'NVDA', 'TSLA', 'JPM', 'V', 'WMT'
]

export async function POST(req: Request) {
  try {
    const { pattern } = await req.json()
    
    // Fetch data for all stocks in parallel
    const stockDataPromises = STOCKS_TO_SCAN.map(async (symbol) => {
      const endDate = Math.floor(Date.now() / 1000)
      const startDate = endDate - (30 * 24 * 60 * 60) // 30 days ago
      
      // Use direct Yahoo Finance API instead of internal route
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          }
        }
      )
      
      if (!response.ok) return null
      const data = await response.json()
      return { symbol, data }
    })

    const stocksData = (await Promise.all(stockDataPromises)).filter(Boolean)
    
    // Use Claude to analyze patterns with a more structured prompt
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
    "price": 150.25
  }
]

Include only stocks where you find the pattern with high confidence (>70%).
Respond with ONLY the JSON array, no other text.`
      }]
    })

    if (!response.content[0]) {
      throw new Error('No response content received')
    }

    const content = response.content[0]
    if ('text' in content) {
      try {
        // Clean the response text to ensure it only contains the JSON
        const cleanedText = content.text.trim()
          .replace(/^```json\s*/, '') // Remove potential markdown JSON block start
          .replace(/\s*```$/, '')     // Remove potential markdown JSON block end
        
        const matches = JSON.parse(cleanedText)
        if (!Array.isArray(matches)) {
          throw new Error('Response is not an array')
        }
        
        return NextResponse.json({ matches })
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return NextResponse.json({ matches: [] })
      }
    }

    throw new Error('Unexpected response type')
  } catch (error) {
    console.error('Pattern scan error:', error)
    return NextResponse.json({ error: 'Failed to scan patterns' }, { status: 500 })
  }
}
