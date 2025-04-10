import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const SECTOR_STOCKS_PATH = path.join(process.cwd(), 'data', 'sector-stocks.json')

// GET /api/sectors/stocks
export async function GET() {
  try {
    const data = await fs.readFile(SECTOR_STOCKS_PATH, 'utf8')
    return NextResponse.json(JSON.parse(data))
  } catch (error) {
    console.error('Error reading sector stocks:', error)
    return NextResponse.json({ error: 'Failed to load sector stocks' }, { status: 500 })
  }
}

// POST /api/sectors/stocks
export async function POST(req: Request) {
  try {
    const { sector, stock } = await req.json()
    
    const data = await fs.readFile(SECTOR_STOCKS_PATH, 'utf8')
    const sectorStocks = JSON.parse(data)
    
    if (!sectorStocks[sector]) {
      sectorStocks[sector] = []
    }
    
    sectorStocks[sector].push(stock)
    
    await fs.writeFile(SECTOR_STOCKS_PATH, JSON.stringify(sectorStocks, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating sector stocks:', error)
    return NextResponse.json({ error: 'Failed to update sector stocks' }, { status: 500 })
  }
}

// DELETE /api/sectors/stocks
export async function DELETE(req: Request) {
  try {
    const { sector, symbol } = await req.json()
    
    const data = await fs.readFile(SECTOR_STOCKS_PATH, 'utf8')
    const sectorStocks = JSON.parse(data)
    
    if (sectorStocks[sector]) {
      sectorStocks[sector] = sectorStocks[sector].filter((s: string) => s !== symbol)
    }
    
    await fs.writeFile(SECTOR_STOCKS_PATH, JSON.stringify(sectorStocks, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sector stock:', error)
    return NextResponse.json({ error: 'Failed to delete sector stock' }, { status: 500 })
  }
} 
