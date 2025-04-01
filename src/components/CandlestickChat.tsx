"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createChart, IChartApi, ISeriesApi, LineStyle, SeriesOptionsMap } from 'lightweight-charts'

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

interface IndicatorState {
  enabled: boolean
  period?: number
  type?: 'sma' | 'ema'
}

interface Indicators {
  ma: IndicatorState & { type: 'sma' | 'ema' }
  rsi: IndicatorState
  macd: IndicatorState
  bollinger: IndicatorState
}

// Add interface for Bollinger Bands data
interface BollingerBandsData {
  time: string
  upper: number | null
  middle: number | null
  lower: number | null
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
  const [indicators, setIndicators] = useState<Indicators>({
    ma: { enabled: false, period: 20, type: 'sma' },
    rsi: { enabled: false, period: 14 },
    macd: { enabled: false },
    bollinger: { enabled: false, period: 20 }
  })
  const indicatorSeriesRefs = useRef<{
    ma?: ISeriesApi<'Line'>
    rsi?: ISeriesApi<'Line'>
    macd?: {
      macd?: ISeriesApi<'Line'>
      signal?: ISeriesApi<'Line'>
      histogram?: ISeriesApi<'Histogram'>
    }
    bollinger?: {
      upper?: ISeriesApi<'Line'>
      middle?: ISeriesApi<'Line'>
      lower?: ISeriesApi<'Line'>
    }
  }>({})

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

  const updateIndicators = useCallback(() => {
    if (!chartData.length || !chartRef.current) {
      console.log('No chart data or chart ref')
      return
    }

    console.log('Updating indicators:', indicators)

    // Helper function to safely remove series
    const removeSeries = (series: ISeriesApi<keyof SeriesOptionsMap> | undefined) => {
      if (series && chartRef.current) {
        try {
          chartRef.current.removeSeries(series)
        } catch (error) {
          console.warn('Error removing series:', error)
        }
      }
    }

    // Clear existing indicators
    const clearExistingIndicators = () => {
      // Clear MA
      if (indicatorSeriesRefs.current.ma) {
        removeSeries(indicatorSeriesRefs.current.ma)
        indicatorSeriesRefs.current.ma = undefined
      }

      // Clear RSI
      if (indicatorSeriesRefs.current.rsi) {
        removeSeries(indicatorSeriesRefs.current.rsi)
        indicatorSeriesRefs.current.rsi = undefined
      }

      // Clear MACD
      if (indicatorSeriesRefs.current.macd) {
        if (indicatorSeriesRefs.current.macd.macd) {
          removeSeries(indicatorSeriesRefs.current.macd.macd)
        }
        if (indicatorSeriesRefs.current.macd.signal) {
          removeSeries(indicatorSeriesRefs.current.macd.signal)
        }
        if (indicatorSeriesRefs.current.macd.histogram) {
          removeSeries(indicatorSeriesRefs.current.macd.histogram)
        }
        indicatorSeriesRefs.current.macd = undefined
      }

      // Clear Bollinger Bands
      if (indicatorSeriesRefs.current.bollinger) {
        if (indicatorSeriesRefs.current.bollinger.upper) {
          removeSeries(indicatorSeriesRefs.current.bollinger.upper)
        }
        if (indicatorSeriesRefs.current.bollinger.middle) {
          removeSeries(indicatorSeriesRefs.current.bollinger.middle)
        }
        if (indicatorSeriesRefs.current.bollinger.lower) {
          removeSeries(indicatorSeriesRefs.current.bollinger.lower)
        }
        indicatorSeriesRefs.current.bollinger = undefined
      }
    }

    // Clear existing indicators first
    clearExistingIndicators()

    const calculateSMA = (data: CandleData[], period: number) => {
      return data.map((candle, index) => {
        if (index < period - 1) return { time: candle.time, value: null }
        const sum = data.slice(index - period + 1, index + 1).reduce((acc, curr) => acc + curr.close, 0)
        return { time: candle.time, value: sum / period }
      }).filter(item => item.value !== null)
    }

    const calculateEMA = (data: CandleData[], period: number) => {
      const multiplier = 2 / (period + 1)
      let ema = data[0].close
      return data.map((candle) => {
        ema = (candle.close - ema) * multiplier + ema
        return { time: candle.time, value: ema }
      })
    }

    const calculateRSI = (data: CandleData[], period: number) => {
      let gains = 0
      let losses = 0
      const rsiData = []

      for (let i = 1; i < data.length; i++) {
        const difference = data[i].close - data[i - 1].close
        if (difference > 0) gains += difference
        else losses -= difference

        if (i >= period) {
          const avgGain = gains / period
          const avgLoss = losses / period
          const rs = avgGain / avgLoss
          const rsi = 100 - (100 / (1 + rs))
          rsiData.push({ time: data[i].time, value: rsi })

          gains -= (data[i - period + 1].close - data[i - period].close > 0) 
            ? data[i - period + 1].close - data[i - period].close 
            : 0
          losses -= (data[i - period + 1].close - data[i - period].close < 0) 
            ? data[i - period].close - data[i - period + 1].close 
            : 0
        }
      }
      return rsiData
    }

    const calculateBollingerBands = (data: CandleData[], period: number): BollingerBandsData[] => {
      const sma = calculateSMA(data, period)
      return data.map((candle, index) => {
        if (index < period - 1) {
          return {
            time: candle.time,
            upper: null,
            middle: null,
            lower: null
          }
        }

        const slice = data.slice(index - period + 1, index + 1)
        const middle = sma[index - period + 1]?.value // Account for filtered SMA data
        if (!middle) return { time: candle.time, upper: null, middle: null, lower: null }

        const standardDeviation = Math.sqrt(
          slice.reduce((acc, curr) => acc + Math.pow(curr.close - middle, 2), 0) / period
        )

        return {
          time: candle.time,
          upper: middle + (2 * standardDeviation),
          middle: middle,
          lower: middle - (2 * standardDeviation)
        }
      }).filter(item => item.upper !== null && item.middle !== null && item.lower !== null)
    }

    // Moving Average
    if (indicators.ma.enabled) {
      console.log('Adding MA indicator')
      const maData = indicators.ma.type === 'sma' 
        ? calculateSMA(chartData, indicators.ma.period!)
        : calculateEMA(chartData, indicators.ma.period!)
      
      indicatorSeriesRefs.current.ma = chartRef.current.addLineSeries({
        color: '#2962FF',
        lineWidth: 2,
        title: `${indicators.ma.type.toUpperCase()}(${indicators.ma.period})`
      })
      indicatorSeriesRefs.current.ma.setData(maData)
    }

    // RSI
    if (indicators.rsi.enabled) {
      console.log('Adding RSI indicator')
      const rsiData = calculateRSI(chartData, indicators.rsi.period!)
      indicatorSeriesRefs.current.rsi = chartRef.current.addLineSeries({
        color: '#E91E63',
        lineWidth: 2,
        title: `RSI(${indicators.rsi.period})`
      })
      indicatorSeriesRefs.current.rsi.setData(rsiData)
    }

    // Bollinger Bands
    if (indicators.bollinger.enabled) {
      console.log('Adding Bollinger Bands')
      const bbands = calculateBollingerBands(chartData, indicators.bollinger.period!)
      
      const upperSeries = chartRef.current.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Upper'
      })

      const middleSeries = chartRef.current.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        title: 'BB Middle'
      })

      const lowerSeries = chartRef.current.addLineSeries({
        color: '#9C27B0',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Lower'
      })

      indicatorSeriesRefs.current.bollinger = {
        upper: upperSeries,
        middle: middleSeries,
        lower: lowerSeries
      }

      // Type-safe mapping of Bollinger Bands data
      upperSeries.setData(bbands.map((b: BollingerBandsData) => ({ 
        time: b.time, 
        value: b.upper as number 
      })))
      middleSeries.setData(bbands.map((b: BollingerBandsData) => ({ 
        time: b.time, 
        value: b.middle as number 
      })))
      lowerSeries.setData(bbands.map((b: BollingerBandsData) => ({ 
        time: b.time, 
        value: b.lower as number 
      })))
    }
  }, [chartData, indicators])

  useEffect(() => {
    updateIndicators()
  }, [indicators, updateIndicators])

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
            {/* Moving Average */}
            <div className="flex items-center justify-between">
              <label className="text-sm">Moving Average</label>
              <div className="flex items-center gap-2">
                <select 
                  className="text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1"
                  value={indicators.ma.type}
                  onChange={(e) => {
                    setIndicators(prev => ({
                      ...prev,
                      ma: { ...prev.ma, type: e.target.value as 'sma' | 'ema' }
                    }))
                  }}
                >
                  <option value="sma">SMA</option>
                  <option value="ema">EMA</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={indicators.ma.period}
                  onChange={(e) => {
                    setIndicators(prev => ({
                      ...prev,
                      ma: { ...prev.ma, period: parseInt(e.target.value) }
                    }))
                  }}
                  className="w-16 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1"
                />
                <input 
                  type="checkbox"
                  checked={indicators.ma.enabled}
                  onChange={(e) => {
                    setIndicators(prev => ({
                      ...prev,
                      ma: { ...prev.ma, enabled: e.target.checked }
                    }))
                  }}
                  className="toggle toggle-sm"
                />
              </div>
            </div>

            {/* RSI */}
            <div className="flex items-center justify-between">
              <label className="text-sm">RSI</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={indicators.rsi.period}
                  onChange={(e) => {
                    setIndicators(prev => ({
                      ...prev,
                      rsi: { ...prev.rsi, period: parseInt(e.target.value) }
                    }))
                  }}
                  className="w-16 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1"
                />
                <input 
                  type="checkbox"
                  checked={indicators.rsi.enabled}
                  onChange={(e) => {
                    setIndicators(prev => ({
                      ...prev,
                      rsi: { ...prev.rsi, enabled: e.target.checked }
                    }))
                  }}
                  className="toggle toggle-sm"
                />
              </div>
            </div>

            {/* Bollinger Bands */}
            <div className="flex items-center justify-between">
              <label className="text-sm">Bollinger Bands</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={indicators.bollinger.period}
                  onChange={(e) => {
                    setIndicators(prev => ({
                      ...prev,
                      bollinger: { ...prev.bollinger, period: parseInt(e.target.value) }
                    }))
                  }}
                  className="w-16 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1"
                />
                <input 
                  type="checkbox"
                  checked={indicators.bollinger.enabled}
                  onChange={(e) => {
                    setIndicators(prev => ({
                      ...prev,
                      bollinger: { ...prev.bollinger, enabled: e.target.checked }
                    }))
                  }}
                  className="toggle toggle-sm"
                />
              </div>
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
