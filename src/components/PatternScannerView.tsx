import { useState, useRef, useEffect, useMemo } from 'react'
import { createChart, IChartApi } from 'lightweight-charts'
import { SectorStockManager } from './SectorStockManager'

type PatternType = {
  name: string
  description: string
  category: 'bullish' | 'bearish' | 'continuation'
}

type ChartDataPoint = {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type PatternPoint = {
  date: string
  price: number
  significance: string
}

interface PatternMatch {
  symbol: string
  confidence: number
  price: number
  sector: string
  patternComplete: boolean
  volumeConfirms: boolean
  chartData: ChartDataPoint[]
  analysis: {
    description: string
    keyLevels: {
      support: number
      resistance: number
      breakoutTarget: number
    }
    formationPeriod: {
      start: string
      end: string
    }
    patternPoints: PatternPoint[]
    volumeAnalysis: string
  }
}



// Using the existing patterns from PatternScanner.tsx
const CANDLESTICK_PATTERNS: PatternType[] = [
  {
    name: 'Rising Wedge',
    description: 'Bearish pattern with converging trendlines both pointing upward',
    category: 'bearish'
  },
  {
    name: 'Falling Wedge',
    description: 'Bullish pattern with converging trendlines both pointing downward',
    category: 'bullish'
  },
  {
    name: 'Ascending Triangle',
    description: 'Bullish pattern with horizontal resistance and rising support',
    category: 'bullish'
  },
  {
    name: 'Descending Triangle',
    description: 'Bearish pattern with horizontal support and falling resistance',
    category: 'bearish'
  },
  {
    name: 'Inverse Head and Shoulders',
    description: 'Bullish reversal pattern with three troughs, middle being lowest',
    category: 'bullish'
  },
  {
    name: 'Head and Shoulders',
    description: 'Bearish reversal pattern with three peaks, middle being highest',
    category: 'bearish'
  },
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

const MARKET_SECTORS = [
  { id: 'all', name: 'All Sectors' },
  { id: 'technology', name: 'Technology' },
  { id: 'finance', name: 'Financial Services' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'consumer', name: 'Consumer' },
  { id: 'industrial', name: 'Industrial' },
  { id: 'energy', name: 'Energy' },
  { id: 'materials', name: 'Materials' },
  { id: 'utilities', name: 'Utilities' },
  { id: 'realestate', name: 'Real Estate' }
] as const

type SectorId = typeof MARKET_SECTORS[number]['id']

export function PatternScannerView() {
  const [selectedPattern, setSelectedPattern] = useState<string>('')
  const [selectedSector, setSelectedSector] = useState<SectorId>('all')
  const [activeCategory, setActiveCategory] = useState<'all' | 'bullish' | 'bearish' | 'continuation'>('all')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<PatternMatch[]>([])
  const [isSectorManagerOpen, setIsSectorManagerOpen] = useState(false)
  const chartContainers = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const charts = useRef<{ [key: string]: IChartApi }>({})
  
  const filteredPatterns = useMemo(() => {
    if (activeCategory === 'all') return CANDLESTICK_PATTERNS
    return CANDLESTICK_PATTERNS.filter(pattern => pattern.category === activeCategory)
  }, [activeCategory])

  const handleScan = async () => {
    if (!selectedPattern) return
    setIsScanning(true)
    try {
      const response = await fetch('/api/patterns/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pattern: selectedPattern,
          sector: selectedSector
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Scan failed')
      }

      const data = await response.json()
      setScanResults(data.matches)
    } catch (error) {
      console.error('Pattern scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }

  // Function to set chart container reference
  const setChartRef = (symbol: string) => (node: HTMLDivElement | null) => {
    if (node !== null) {
      chartContainers.current[symbol] = node
    }
  }

  // Initialize and update charts
  useEffect(() => {
    // Clean up old charts
    Object.values(charts.current).forEach(chart => chart.remove())
    charts.current = {}

    // Create new charts for results
    scanResults.forEach(result => {
      const container = chartContainers.current[result.symbol]
      if (!container || !result.chartData?.length) return

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 250,
        layout: {
          background: { color: '#ffffff' },
          textColor: '#333',
        },
        grid: {
          vertLines: { color: '#f0f0f0' },
          horzLines: { color: '#f0f0f0' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      })

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })

      // Only set data if it exists
      if (Array.isArray(result.chartData) && result.chartData.length > 0) {
        candlestickSeries.setData(result.chartData)
      }

      charts.current[result.symbol] = chart
    })

    // Handle resize
    const handleResize = () => {
      Object.entries(charts.current).forEach(([symbol, chart]) => {
        const container = chartContainers.current[symbol]
        if (container) {
          chart.applyOptions({ width: container.clientWidth })
        }
      })
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      Object.values(charts.current).forEach(chart => chart.remove())
      charts.current = {}
    }
  }, [scanResults])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 py-6">
      {/* Left sidebar with controls */}
      <div className="lg:col-span-1 space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-6">Pattern Scanner</h2>
        
        {/* Pattern Categories */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
          <div className="flex flex-wrap gap-2">
            {['all', 'bullish', 'bearish', 'continuation'].map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category as typeof activeCategory)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${activeCategory === category 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Pattern Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pattern</label>
          <select
            value={selectedPattern}
            onChange={(e) => setSelectedPattern(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
          >
            <option value="">Choose a pattern...</option>
            {filteredPatterns.map((pattern) => (
              <option key={pattern.name} value={pattern.name}>
                {pattern.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sector Selection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Market Sector</label>
            <button
              onClick={() => setIsSectorManagerOpen(true)}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Manage Stocks
            </button>
          </div>
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value as SectorId)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
          >
            {MARKET_SECTORS.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={!selectedPattern || isScanning}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
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
            'Find Patterns'
          )}
        </button>

        {/* Pattern Description */}
        {selectedPattern && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-2">{selectedPattern}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {CANDLESTICK_PATTERNS.find(p => p.name === selectedPattern)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Results Grid */}
      <div className="lg:col-span-3">
        {scanResults.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {scanResults.map((match) => (
              <div key={match.symbol} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        {match.symbol}
                        <span className="text-sm font-normal text-gray-500">
                          {match.sector}
                        </span>
                      </h3>
                      <p className="text-lg font-medium mt-1">
                        ${match.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium
                        ${match.confidence >= 90 
                          ? 'bg-green-100 text-green-800' 
                          : match.confidence >= 80 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {match.confidence}% Confidence
                      </div>
                      <span className={`mt-2 px-3 py-1 rounded-full text-xs
                        ${match.patternComplete 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {match.patternComplete ? 'Pattern Complete' : 'Pattern Forming'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div ref={setChartRef(match.symbol)} className="w-full h-[250px]" />

                {/* Analysis */}
                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Analysis</h4>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">{match.analysis.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Key Levels */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Key Levels</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Support</span>
                          <span className="font-medium">${match.analysis.keyLevels.support.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Resistance</span>
                          <span className="font-medium">${match.analysis.keyLevels.resistance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Target</span>
                          <span className="font-medium text-green-600">${match.analysis.keyLevels.breakoutTarget.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pattern Points */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Pattern Points</h4>
                      <div className="space-y-2">
                        {match.analysis.patternPoints.map((point, index) => (
                          <div key={index} className="text-sm">
                            <div className="font-medium">{point.significance}</div>
                            <div className="text-gray-500">
                              ${point.price.toFixed(2)} on {new Date(point.date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Volume Analysis */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Volume Analysis</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{match.analysis.volumeAnalysis}</p>
                  </div>

                  {/* Formation Period */}
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-700">
                    Pattern formed {new Date(match.analysis.formationPeriod.start).toLocaleDateString()} 
                    to {new Date(match.analysis.formationPeriod.end).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              {isScanning ? (
                <div className="space-y-3">
                  <svg className="animate-spin h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p>Scanning markets for patterns...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="h-8 w-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Select a pattern and click scan to begin analysis</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sector Stock Manager Modal */}
      <SectorStockManager
        isOpen={isSectorManagerOpen}
        onClose={() => setIsSectorManagerOpen(false)}
        onAddStock={(stock) => {
          // Handle adding new stock to sector
          console.log('Added stock:', stock)
        }}
      />
    </div>
  )
}
