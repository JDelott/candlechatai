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
  const [timeframe, setTimeframe] = useState('1Y')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStockData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const endDate = Math.floor(Date.now() / 1000)
      let startDate = endDate

      // Calculate start date based on timeframe
      switch (timeframe) {
        case '1W':
          startDate = endDate - (7 * 24 * 60 * 60)
          break
        case '1M':
          startDate = endDate - (30 * 24 * 60 * 60)
          break
        case '3M':
          startDate = endDate - (90 * 24 * 60 * 60)
          break
        case '6M':
          startDate = endDate - (180 * 24 * 60 * 60)
          break
        case '1Y':
          startDate = endDate - (365 * 24 * 60 * 60)
          break
        case 'ALL':
          startDate = 0 // Get all available data
          break
      }
      
      const response = await fetch(
        `/api/stock/chart?symbol=${symbol}&startDate=${startDate}&endDate=${endDate}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch stock data')
      }

      const data = await response.json()

      if (!data.chart?.result?.[0]?.indicators?.quote?.[0]) {
        throw new Error('Invalid data format received')
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
      setError('Failed to load stock data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [symbol, timeframe])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#ffffff' },
        textColor: 'black',
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    })
    
    // Add resize observer
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0].target === chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    })

    resizeObserver.observe(chartContainerRef.current)
    
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
      resizeObserver.disconnect()
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
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-4rem)] p-4 bg-gray-50 dark:bg-gray-900">
      {/* Analysis Parameters Panel - Enhanced */}
      <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-bold text-lg">Analysis Setup</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure your view</p>
        </div>
        
        <div className="p-4 space-y-6 flex-1">
          {/* Stock Search */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-2">Stock Symbol</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="AAPL, MSFT, GOOGL..."
                className="w-full px-3 py-2 pl-9 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => handleStockSelect(result)}
                    className="w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium">{result.symbol}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe Pills */}
          <div>
            <label className="block text-sm font-medium mb-2">Timeframe</label>
            <div className="grid grid-cols-2 gap-2">
              {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors
                    ${timeframe === tf 
                      ? 'bg-blue-500 text-white shadow-md' 
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Chart Style</label>
            <select 
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              defaultValue="candlestick"
            >
              <option value="candlestick">Candlestick</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
            </select>
          </div>
        </div>

        {/* New Technical Indicators Section */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium mb-3">Technical Indicators</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Moving Average</label>
              <select className="text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1">
                <option value="sma">SMA</option>
                <option value="ema">EMA</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">RSI</label>
              <input type="checkbox" className="toggle toggle-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">MACD</label>
              <input type="checkbox" className="toggle toggle-sm" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Bollinger Bands</label>
              <input type="checkbox" className="toggle toggle-sm" />
            </div>
          </div>
        </div>

        {/* New Alert Settings */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium mb-3">Price Alerts</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Above"
                className="flex-1 px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              />
              <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg">Set</button>
            </div>
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Below"
                className="flex-1 px-3 py-1 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              />
              <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg">Set</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Panel - Enhanced */}
      <div className="col-span-7 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col">
        {/* New Quick Stats Bar */}
        <div className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Open</div>
            <div className="font-semibold">$178.23</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">High</div>
            <div className="font-semibold text-green-500">$180.54</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Low</div>
            <div className="font-semibold text-red-500">$176.89</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Volume</div>
            <div className="font-semibold">2.3M</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Change</div>
            <div className="font-semibold text-green-500">+2.34%</div>
          </div>
        </div>

        {/* Existing Chart Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-bold">{symbol}</h2>
            <span className="text-gray-500 dark:text-gray-400">{currentStockName}</span>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm">Updating...</span>
            </div>
          )}
        </div>

        {/* Chart Area with New Tools */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 p-2 border-b border-gray-100 dark:border-gray-700">
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="h-4 border-r border-gray-200 dark:border-gray-700"></div>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-4">
            {error ? (
              <div className="h-full flex items-center justify-center text-red-500">{error}</div>
            ) : (
              <div ref={chartContainerRef} className="h-full w-full" />
            )}
          </div>
        </div>
      </div>

      {/* AI Analysis Panel - Enhanced */}
      <div className="col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col">
        {/* New Analysis Tabs */}
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="flex">
            <button className="px-4 py-3 text-sm font-medium border-b-2 border-blue-500">AI Chat</button>
            <button className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Patterns</button>
            <button className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Signals</button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            <div className="absolute inset-0 overflow-y-auto">
              <div className="p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`rounded-lg ${
                      message.role === 'assistant'
                        ? 'bg-gradient-to-br from-blue-50/50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20'
                        : 'bg-gray-50 dark:bg-gray-700/20'
                    }`}
                  >
                    <div className="p-3 text-sm">
                      {message.role === 'assistant' ? (
                        <div className="space-y-2">
                          {message.content.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) {
                              return (
                                <h4 key={i} className="font-semibold text-gray-900 dark:text-gray-100 mt-3">
                                  {line.replace('# ', '')}
                                </h4>
                              )
                            } else if (line.startsWith('- ')) {
                              return (
                                <div key={i} className="flex gap-2 ml-2">
                                  <span>•</span>
                                  <span>{line.replace('- ', '')}</span>
                                </div>
                              )
                            } else if (line.trim() === '') {
                              return <div key={i} className="h-2" />
                            } else {
                              return <p key={i}>{line}</p>
                            }
                          })}
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSubmit(e)}
                placeholder="Ask about patterns, trends, or signals..."
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              />
              <button
                onClick={(e: React.MouseEvent) => handleSubmit(e)}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
