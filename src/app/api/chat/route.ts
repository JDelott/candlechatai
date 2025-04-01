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
    const { messages, chartData, symbol, indicators = {
      rsi: { enabled: false, period: 14 },
      ma: { enabled: false, type: 'sma', period: 20 },
      macd: { enabled: false },
      bollinger: { enabled: false, period: 20 }
    }} = body

    // Format candlestick data
    const recentCandles = chartData.slice(-20).map((candle: CandleData): FormattedCandle => ({
      date: candle.time,
      open: candle.open.toFixed(2),
      high: candle.high.toFixed(2),
      low: candle.low.toFixed(2),
      close: candle.close.toFixed(2)
    }))

    // Build technical analysis section based on enabled indicators
    let technicalSection = ''
    if (indicators.rsi.enabled && indicators.rsi.currentValue) {
      technicalSection += `\nRSI (${indicators.rsi.period}): ${indicators.rsi.currentValue} (oversold < 30, overbought > 70)`
    }

    if (indicators.ma.enabled && indicators.ma.currentValue) {
      const currentPrice = chartData.slice(-1)[0].close.toFixed(2)
      const maDeviation = ((chartData.slice(-1)[0].close - parseFloat(indicators.ma.currentValue)) / parseFloat(indicators.ma.currentValue) * 100).toFixed(2)
      technicalSection += `\n${indicators.ma.type.toUpperCase()}(${indicators.ma.period}): ${indicators.ma.currentValue}`
      technicalSection += `\nCurrent Price: ${currentPrice} (${maDeviation}% from MA)`
    }

    if (indicators.bollinger.enabled && indicators.bollinger.currentValues) {
      const { upper, middle, lower } = indicators.bollinger.currentValues
      const currentPrice = chartData.slice(-1)[0].close.toFixed(2)
      technicalSection += `\nBollinger Bands (${indicators.bollinger.period}, 2 SD):`
      technicalSection += `\n  - Upper Band: ${upper.toFixed(2)}`
      technicalSection += `\n  - Middle Band: ${middle.toFixed(2)}`
      technicalSection += `\n  - Lower Band: ${lower.toFixed(2)}`
      technicalSection += `\n  - Current Price: ${currentPrice} (${
        currentPrice > upper ? 'ABOVE upper band' :
        currentPrice < lower ? 'BELOW lower band' :
        'WITHIN bands'
      })`
    }

    let analysisPrompt = ''
    if (indicators.rsi.enabled || indicators.ma.enabled || indicators.bollinger.enabled) {
      analysisPrompt = `\nPlease provide:${
        indicators.rsi.enabled ? '\n1. EXACT interpretation of current RSI - is it oversold, overbought, or neutral?' : ''
      }${
        indicators.ma.enabled ? `\n2. Price position relative to ${indicators.ma.type.toUpperCase()}(${indicators.ma.period}) and what the deviation suggests` : ''
      }${
        indicators.bollinger.enabled ? '\n3. Position relative to Bollinger Bands and volatility implications' : ''
      }${
        indicators.rsi.enabled || indicators.ma.enabled || indicators.bollinger.enabled ? '\n4. Combined signal strength (Strong/Moderate/Weak Buy/Sell)' : ''
      }\n5. Specific warning signals or divergences if present`
    }

    const systemPrompt = `You are a technical analysis expert specializing in candlestick patterns and market analysis. 
    You are analyzing ${symbol} stock data.
    ${technicalSection ? '\nCurrent Technical Indicators:' + technicalSection : ''}
    
    Recent candlesticks:
    ${JSON.stringify(recentCandles, null, 2)}
    
    Please analyze:
    1. Any significant candlestick patterns
    2. The meaning and implications of these patterns
    3. Key price levels and trends
    4. Overall technical outlook${analysisPrompt}
    
    Format your response in clear sections with exact numbers and definitive signals.`

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
