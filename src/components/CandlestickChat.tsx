"use client"

import { useState } from 'react'
import { createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface TimeSeriesData {
  '1. open': string
  '2. high': string
  '3. low': string
  '4. close': string
}

interface AlphaVantageResponse {
  'Time Series (Daily)': {
    [key: string]: TimeSeriesData
  }
}

interface CandleData {
  time: string
  open: number
  high: number
  low: number
  close: number
}

interface CandlestickSeries {
  setData: (data: CandleData[]) => void
}

export function CandlestickChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartData, setChartData] = useState<CandleData[]>([])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: 'black',
      },
      width: chartContainerRef.current.clientWidth,
      height: 300
    })

    const candlestickSeries = (chart as unknown as { 
      addCandlestickSeries(options: {
        upColor: string
        downColor: string
        borderVisible: boolean
        wickUpColor: string
        wickDownColor: string
      }): CandlestickSeries 
    }).addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    })

    // Fetch some initial stock data
    async function fetchStockData() {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=${process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY}`
      )
      const data: AlphaVantageResponse = await response.json()
      
      const candleData = Object.entries(data['Time Series (Daily)']).map(([date, values]) => ({
        time: date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close'])
      })).reverse()

      setChartData(candleData)
      candlestickSeries.setData(candleData)
    }

    fetchStockData()

    return () => {
      chart.remove()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Include last 20 candles in the request for context
      const recentCandles = chartData.slice(-20)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          chartData: recentCandles,
          symbol: 'AAPL'
        })
      })

      if (!response.ok) throw new Error('Failed to fetch response')

      const data = await response.json()
      const assistantContent = typeof data.content === 'object' ? data.content[0].text : data.content
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: assistantContent
      }])
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Chart */}
      <div ref={chartContainerRef} className="w-full h-[300px] mb-4" />

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-gray-100 dark:bg-gray-900 ml-auto'
                : 'bg-gray-50 dark:bg-gray-900/50'
            } max-w-[80%] ${message.role === 'assistant' ? 'font-mono whitespace-pre-line' : ''}`}
          >
            {message.role === 'assistant' ? (
              <div className="space-y-4">
                {message.content.split('\n\n').map((section, idx) => {
                  const [title, ...content] = section.split('\n')
                  return (
                    <div key={idx} className="space-y-1">
                      <h3 className="font-bold text-sm">{title}</h3>
                      <div className="pl-4 text-sm text-gray-600 dark:text-gray-400">
                        {content.join('\n')}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about candlestick patterns..."
            className="flex-1 p-3 border bg-white dark:bg-black font-mono"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 font-mono hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
