import { NextResponse } from 'next/server'
import yahooFinance from 'yahoo-finance2'

// Define the type for Yahoo Finance quote
interface YahooQuote {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    // Get historical data from Yahoo Finance
    const queryOptions = {
      period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      period2: new Date(), // now
      interval: '1d' as '1d' | '1wk' | '1mo' // Type assertion for valid intervals
    }

    const result = await yahooFinance.historical(symbol, queryOptions)
    
    // Transform the data to match the required format for lightweight-charts
    const chartData = result.map((quote: YahooQuote) => ({
      time: quote.date.toISOString().split('T')[0], // Format: YYYY-MM-DD
      open: Number(quote.open),
      high: Number(quote.high),
      low: Number(quote.low),
      close: Number(quote.close),
      volume: Number(quote.volume)
    }))

    return NextResponse.json(chartData)

  } catch (error) {
    console.error('Stock history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock history' },
      { status: 500 }
    )
  }
}
