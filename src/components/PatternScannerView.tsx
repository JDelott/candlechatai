import { useState, useRef, useEffect } from 'react'
import { createChart, ColorType, IChartApi } from 'lightweight-charts'
import Link from 'next/link'

type PatternType = {
  name: string
  description: string
  category: 'bullish' | 'bearish' | 'continuation'
}

type ChartData = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type ScanResult = {
  symbol: string
  confidence: number
  price: number
  chartData: ChartData[]
}

type ApiScanMatch = {
  symbol: string
  confidence: number
  price: number
}

// Using the existing patterns from PatternScanner.tsx
const CANDLESTICK_PATTERNS: PatternType[] = [
  {
    name: 'Hammer',
    description: 'Bullish reversal pattern with a small body and long lower shadow',
    category: 'bullish'
  },
  {
    name: 'Shooting Star',
    description: 'Bearish reversal pattern with a small body and long upper shadow',
    category: 'bearish'
  },
  {
    name: 'Doji',
    description: 'Indecision pattern with opening and closing prices nearly equal',
    category: 'continuation'
  },
  {
    name: 'Engulfing Bullish',
    description: 'A bullish candlestick that completely engulfs the previous bearish candle',
    category: 'bullish'
  },
  {
    name: 'Engulfing Bearish',
    description: 'A bearish candlestick that completely engulfs the previous bullish candle',
    category: 'bearish'
  }
]

export function PatternScannerView() {
  const [selectedPattern, setSelectedPattern] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [activeCategory, setActiveCategory] = useState<'bullish' | 'bearish' | 'continuation' | 'all'>('all')
  const chartRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const handleScan = async () => {
    if (!selectedPattern) return
    setIsScanning(true)
    try {
      const response = await fetch('/api/patterns/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: selectedPattern })
      })
      
      if (!response.ok) throw new Error('Scan failed')
      const data: { matches: ApiScanMatch[] } = await response.json()
      
      // Fetch chart data for each match
      const resultsWithCharts = await Promise.all(
        data.matches.map(async (match) => {
          const chartResponse = await fetch(`/api/stock/history?symbol=${match.symbol}`)
          const chartData: ChartData[] = await chartResponse.json()
          return {
            ...match,
            chartData: chartData.slice(-30) // Last 30 days
          }
        })
      )
      
      setScanResults(resultsWithCharts)
    } catch (error) {
      console.error('Pattern scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    // Cleanup previous charts
    const charts: IChartApi[] = []

    // Create mini charts for each result
    scanResults.forEach((result) => {
      const container = chartRefs.current.get(result.symbol)
      if (!container) return

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 200,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#999',
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        rightPriceScale: {
          borderVisible: false,
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
        },
      })

      const candlestickSeries = chart.addCandlestickSeries()
      candlestickSeries.setData(result.chartData)
      
      charts.push(chart)
    })

    // Cleanup function
    return () => {
      charts.forEach(chart => chart.remove())
    }
  }, [scanResults])

  const setChartRef = (symbol: string) => (el: HTMLDivElement | null) => {
    if (el) {
      chartRefs.current.set(symbol, el)
    } else {
      chartRefs.current.delete(symbol)
    }
  }

  const filteredPatterns = CANDLESTICK_PATTERNS.filter(pattern => 
    activeCategory === 'all' || pattern.category === activeCategory
  )

  return (
    <div className="grid grid-cols-4 gap-4 py-4">
      {/* Left sidebar */}
      <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
        <div>
          <h3 className="text-lg font-semibold mb-4">Pattern Categories</h3>
          <div className="space-y-2">
            {['all', 'bullish', 'bearish', 'continuation'].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category as typeof activeCategory)}
                className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${activeCategory === category 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)} Patterns
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Select Pattern</label>
          <select
            value={selectedPattern}
            onChange={(e) => setSelectedPattern(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <option value="">Choose a pattern...</option>
            {filteredPatterns.map((pattern) => (
              <option key={pattern.name} value={pattern.name}>
                {pattern.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleScan}
          disabled={!selectedPattern || isScanning}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
        >
          {isScanning ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Scanning...</span>
            </div>
          ) : (
            'Scan Markets'
          )}
        </button>
      </div>

      {/* Main content area */}
      <div className="col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Pattern Scanner</h2>
        
        {selectedPattern && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Selected Pattern</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="font-medium">{selectedPattern}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {CANDLESTICK_PATTERNS.find(p => p.name === selectedPattern)?.description}
              </div>
            </div>
          </div>
        )}

        {scanResults.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold mb-4">Scan Results</h3>
            <div className="grid grid-cols-2 gap-4">
              {scanResults.map((result) => (
                <Link
                  href={`/dashboard?symbol=${result.symbol}`}
                  key={result.symbol}
                  className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-lg">{result.symbol}</div>
                      <div className="text-2xl font-bold mb-2">${result.price.toFixed(2)}</div>
                      <div className="text-sm text-green-500">{result.confidence}% match</div>
                    </div>
                    <div className="text-sm px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      View Details
                    </div>
                  </div>
                  
                  {/* Mini Chart */}
                  <div 
                    ref={setChartRef(result.symbol)}
                    className="w-full h-[200px] mt-4"
                  />
                  
                  {/* Pattern Indicators */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600">
                      Volume: {(result.chartData[result.chartData.length - 1].volume / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600">
                      30D High: ${Math.max(...result.chartData.map(d => d.high)).toFixed(2)}
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600">
                      30D Low: ${Math.min(...result.chartData.map(d => d.low)).toFixed(2)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : !isScanning && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            Select a pattern and click &quot;Scan Markets&quot; to find matching stocks
          </div>
        )}
      </div>
    </div>
  )
}
