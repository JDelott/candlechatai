import { useState } from 'react'

type PatternType = {
  name: string
  description: string
  category: 'bullish' | 'bearish' | 'continuation'
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
  }
]

export function PatternScannerView() {
  const [selectedPattern, setSelectedPattern] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<Array<{
    symbol: string
    confidence: number
    price: number
  }>>([])
  const [activeCategory, setActiveCategory] = useState<'bullish' | 'bearish' | 'continuation' | 'all'>('all')

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
      const data = await response.json()
      setScanResults(data.matches)
    } catch (error) {
      console.error('Pattern scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const filteredPatterns = CANDLESTICK_PATTERNS.filter(pattern => 
    activeCategory === 'all' || pattern.category === activeCategory
  )

  return (
    <div className="grid grid-cols-4 gap-4 py-4">
      {/* Left sidebar */}
      <div className="space-y-4">
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
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100'
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
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
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
              <div className="text-sm text-gray-500">
                {CANDLESTICK_PATTERNS.find(p => p.name === selectedPattern)?.description}
              </div>
            </div>
          </div>
        )}

        {scanResults.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Scan Results</h3>
            <div className="grid grid-cols-2 gap-4">
              {scanResults.map((result) => (
                <div
                  key={result.symbol}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-lg">{result.symbol}</div>
                    <div className="text-sm text-green-500">{result.confidence}% match</div>
                  </div>
                  <div className="text-2xl font-bold">${result.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
