import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface CandleData {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export async function POST(req: Request) {
  try {
    const { messages, chartData, symbol } = await req.json()
    const lastMessage = messages[messages.length - 1]

    const recentCandles = (chartData as CandleData[])
      .map((candle) => `${candle.time}: O${candle.open} H${candle.high} L${candle.low} C${candle.close}`)
      .join('\n')

    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{
        role: "user",
        content: `You are a candlestick expert. Analyze ${symbol} data:

${recentCandles}

Question: ${lastMessage.content}

Format your response exactly like this:

PATTERN
- Primary pattern: [key pattern name or "None"]
- Supporting patterns: [secondary patterns or "None"]

TREND ANALYSIS
- Direction: [Uptrend/Downtrend/Sideways]
- Strength: [Strong/Moderate/Weak]
- Key levels: [Support/Resistance prices]

SIGNALS
- Bullish: [List key bullish indicators]
- Bearish: [List key bearish indicators]
- Volume: [Volume analysis]

RECOMMENDATION
[One clear, actionable trading recommendation]

Keep total response under 150 words. Use precise price levels where relevant.`
      }]
    })

    return NextResponse.json({ content: response.content })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}
