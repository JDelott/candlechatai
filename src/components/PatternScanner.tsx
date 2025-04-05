import { useState } from 'react'

type PatternType = {
  name: string
  description: string
  category: 'bullish' | 'bearish' | 'continuation'
}

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
  // Add more patterns as needed
]

export function PatternScanner() {
  const [selectedPattern, setSelectedPattern] = useState<string>('')
  const [isScanning, setIsScanning] = useState(false)
  const [results, setResults] = useState<Array<{
    symbol: string
    name: string
    confidence: number
    price: number
  }>>([])

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
      setResults(data.matches)
    } catch (error) {
      console.error('Pattern scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Select Pattern</label>
        <select
          value={selectedPattern}
          onChange={(e) => setSelectedPattern(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <option value="">Choose a pattern...</option>
          {CANDLESTICK_PATTERNS.map((pattern) => (
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
        {isScanning ? 'Scanning...' : 'Scan Markets'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Matches Found</h3>
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.symbol}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{result.symbol}</div>
                  <div className="text-sm text-gray-500">{result.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${result.price}</div>
                  <div className="text-sm text-green-500">{result.confidence}% match</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
