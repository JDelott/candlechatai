import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

interface CandleData {
  time: string
  open: number
  high: number
  low: number
  close: number
}

interface FormattedCandle {
  date: string
  open: string
  high: string
  low: string
  close: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, chartData, symbol } = body

    // Format the candlestick data for the prompt
    const recentCandles = chartData.slice(-20).map((candle: CandleData): FormattedCandle => ({
      date: candle.time,
      open: candle.open.toFixed(2),
      high: candle.high.toFixed(2),
      low: candle.low.toFixed(2),
      close: candle.close.toFixed(2)
    }))

    const systemPrompt = `You are a technical analysis expert specializing in candlestick patterns and market analysis. 
    You are analyzing ${symbol} stock data.
    
    Here are the recent candlesticks:
    ${JSON.stringify(recentCandles, null, 2)}
    
    Please analyze:
    1. Any significant candlestick patterns
    2. The meaning and implications of these patterns
    3. Key price levels and trends
    4. Overall technical outlook

    Format your response in clear sections with headers.`

    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: systemPrompt + "\n\n" + messages[messages.length - 1].content
        }
      ]
    })

    if (!response.content[0]) {
      throw new Error('No response content received')
    }

    const content = response.content[0]
    if ('text' in content) {
      return NextResponse.json({
        content: content.text
      })
    }

    throw new Error('Unexpected response type')

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 })
  }
}
