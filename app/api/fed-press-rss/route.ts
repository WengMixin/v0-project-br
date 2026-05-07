import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

const FED_PRESS_RSS =
  'https://www.federalreserve.gov/feeds/press_all.xml'

interface RssItem {
  title: string
  link: string
  pubDate?: string
}

function parseFedPressXml(xml: string, maxItems = 8): RssItem[] {
  const items: RssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = m[1]
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
    const linkMatch = block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)
    const dateMatch = block.match(/<pubDate>([^<]*)<\/pubDate>/i)
    const title = titleMatch?.[1]?.trim().replace(/<!\[CDATA\[|\]\]>/g, '') || ''
    const link = linkMatch?.[1]?.trim() || ''
    if (title) items.push({ title, link, pubDate: dateMatch?.[1]?.trim() })
  }
  return items
}

export async function GET() {
  try {
    const response = await fetch(FED_PRESS_RSS, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MacroMonitor/1.0)' },
      next: { revalidate: 900 },
    })
    if (!response.ok) {
      return NextResponse.json(
        { success: false, items: [], error: `RSS HTTP ${response.status}` },
        { status: 502 }
      )
    }
    const xml = await response.text()
    const items = parseFedPressXml(xml, 10)
    return NextResponse.json({
      success: true,
      items,
      source: FED_PRESS_RSS,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[fed-press-rss]', e)
    return NextResponse.json(
      {
        success: false,
        items: [],
        error: e instanceof Error ? e.message : 'fetch failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
