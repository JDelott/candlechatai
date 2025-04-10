import { useState } from 'react'

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

type SectorStock = {
  symbol: string
  name: string
  sector: SectorId
}

export function SectorStockManager({ 
  isOpen, 
  onClose,
  onAddStock 
}: { 
  isOpen: boolean
  onClose: () => void
  onAddStock: (stock: SectorStock) => void 
}) {
  const [selectedSector, setSelectedSector] = useState<SectorId>('technology')
  const [newSymbol, setNewSymbol] = useState('')
  const [newName, setNewName] = useState('')
  const [sectorStocks, setSectorStocks] = useState<Record<SectorId, SectorStock[]>>({
    technology: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'technology' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'technology' },
      // ... other tech stocks
    ],
    finance: [
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'finance' },
      { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'finance' },
      // ... other finance stocks
    ],
    healthcare: [],
    consumer: [],
    industrial: [],
    energy: [],
    materials: [],
    utilities: [],
    realestate: [],
    all: []
  })

  const handleAddStock = () => {
    if (!newSymbol || !newName) return

    const newStock = {
      symbol: newSymbol.toUpperCase(),
      name: newName,
      sector: selectedSector
    }

    setSectorStocks(prev => ({
      ...prev,
      [selectedSector]: [...prev[selectedSector], newStock]
    }))
    onAddStock(newStock)
    setNewSymbol('')
    setNewName('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Manage Sector Stocks</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sector Selection */}
        <div className="mb-4">
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value as SectorId)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            {MARKET_SECTORS.filter(sector => sector.id !== 'all').map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </select>
        </div>

        {/* Add New Stock */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="Symbol (e.g., AAPL)"
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Company Name"
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          />
          <button
            onClick={handleAddStock}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add
          </button>
        </div>

        {/* Stock List */}
        <div className="max-h-96 overflow-y-auto">
          {sectorStocks[selectedSector]?.map((stock) => (
            <div
              key={stock.symbol}
              className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <div>
                <div className="font-medium">{stock.symbol}</div>
                <div className="text-sm text-gray-500">{stock.name}</div>
              </div>
              <button
                onClick={() => {
                  setSectorStocks(prev => ({
                    ...prev,
                    [selectedSector]: prev[selectedSector].filter(s => s.symbol !== stock.symbol)
                  }))
                }}
                className="text-red-500 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 
