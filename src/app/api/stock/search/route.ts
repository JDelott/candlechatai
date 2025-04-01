import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`)
    const data = await response.json()
    
    if (!data.quotes) {
      return NextResponse.json({ results: [] })
    }

    const results = data.quotes.map((quote: { 
      symbol: string;
      shortname?: string;
      longname?: string;
    }) => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname || quote.symbol
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Failed to search stocks' }, { status: 500 })
  }
}
