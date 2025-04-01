"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface CandleData {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export function CandlestickChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [symbol, setSymbol] = useState('AAPL')
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartData, setChartData] = useState<CandleData[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{symbol: string, name: string}>>([])
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const [currentStockName, setCurrentStockName] = useState('Apple Inc.')

  const fetchStockData = useCallback(async () => {
    try {
      const endDate = Math.floor(Date.now() / 1000)
      const startDate = endDate - (365 * 24 * 60 * 60) // 1 year of data
      
      const response = await fetch(
        `/api/stock/chart?symbol=${symbol}&startDate=${startDate}&endDate=${endDate}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.chart?.result?.[0]?.indicators?.quote?.[0]) {
        console.error('Invalid response:', data)
        return
      }

      const quotes = data.chart.result[0]
      const timestamps = quotes.timestamp
      const quote = quotes.indicators.quote[0]

      const candleData = timestamps.map((timestamp: number, i: number) => ({
        time: new Date(timestamp * 1000).toISOString().split('T')[0],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i]
      })).filter((candle: CandleData) => 
        candle.open && candle.high && candle.low && candle.close
      )

      setChartData(candleData)
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(candleData)
      }
    } catch (error) {
      console.error('Error fetching stock data:', error)
    }
  }, [symbol])

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
    
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries

    fetchStockData()

    return () => {
      chart.remove()
    }
  }, [fetchStockData])

  useEffect(() => {
    fetchStockData()
  }, [fetchStockData])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSearchResults([])
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
          symbol: symbol
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

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/stock/search?q=${query}`)
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Search error:', data)
        // Optionally show error to user
        return
      }

      if (data.results) {
        setSearchResults(data.results)
      } else {
        console.error('Unexpected response format:', data)
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    }
  }

  const handleStockSelect = async (result: { symbol: string, name: string }) => {
    setSymbol(result.symbol)
    setCurrentStockName(result.name)
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Ticker Search */}
      <div className="relative mb-6" ref={dropdownRef}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search stocks..."
          className="w-full px-4 py-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg"
        />
        
        {searchResults.length > 0 && (
          <div className="absolute top-full mt-1 w-full max-h-96 overflow-y-auto bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-10">
            {searchResults.map((result) => (
              <button
                key={result.symbol}
                onClick={() => handleStockSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 flex flex-col"
              >
                <span className="font-medium">{result.symbol}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{result.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stock Info and Chart */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline">
          <h2 className="text-2xl font-bold mr-2">{symbol}</h2>
          <span className="text-gray-600 dark:text-gray-400">{currentStockName}</span>
        </div>
        <div ref={chartContainerRef} className="w-full h-[300px]" />
      </div>

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
