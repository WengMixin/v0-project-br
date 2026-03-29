import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// 美联储官员发言日历API
// 数据来源：美联储官网日历
interface FedEvent {
  date: string
  time?: string
  speaker: string
  title: string
  type: 'speech' | 'testimony' | 'press_conference' | 'minutes' | 'statement'
  url?: string
}

// 美联储官网日历API
async function fetchFedCalendar(): Promise<FedEvent[]> {
  try {
    // 尝试从美联储官网获取日历数据
    const response = await fetch(
      'https://www.federalreserve.gov/json/ne-events.json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        next: { revalidate: 3600 } // 缓存1小时
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      // 解析美联储日历格式
      return parseCalendarData(data)
    }
  } catch (error) {
    console.error('[v0] Fed calendar fetch error:', error)
  }
  
  // 返回备用数据
  return getFallbackEvents()
}

function parseCalendarData(data: unknown): FedEvent[] {
  const events: FedEvent[] = []
  
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item.d && item.t) {
        events.push({
          date: item.d,
          time: item.time || undefined,
          speaker: extractSpeaker(item.t),
          title: item.t,
          type: detectEventType(item.t),
          url: item.l || undefined
        })
      }
    }
  }
  
  return events.slice(0, 20) // 最近20条
}

function extractSpeaker(title: string): string {
  const speakers = [
    'Powell', 'Waller', 'Williams', 'Barr', 'Bowman',
    'Cook', 'Jefferson', 'Kugler', 'Mester', 'Bostic',
    'Daly', 'Harker', 'Kashkari', 'Logan', 'Goolsbee'
  ]
  
  for (const speaker of speakers) {
    if (title.toLowerCase().includes(speaker.toLowerCase())) {
      return speaker
    }
  }
  
  return 'Fed Official'
}

function detectEventType(title: string): FedEvent['type'] {
  const lower = title.toLowerCase()
  if (lower.includes('testimony')) return 'testimony'
  if (lower.includes('press conference')) return 'press_conference'
  if (lower.includes('minutes')) return 'minutes'
  if (lower.includes('statement')) return 'statement'
  return 'speech'
}

function getFallbackEvents(): FedEvent[] {
  const today = new Date()
  return [
    {
      date: today.toISOString().split('T')[0],
      speaker: 'Powell',
      title: '请检查美联储官网获取最新日程',
      type: 'speech',
      url: 'https://www.federalreserve.gov/newsevents/calendar.htm'
    }
  ]
}

export async function GET() {
  try {
    const events = await fetchFedCalendar()
    
    return NextResponse.json({
      success: true,
      events,
      source: 'Federal Reserve',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[v0] Fed calendar error:', error)
    return NextResponse.json({
      success: false,
      events: getFallbackEvents(),
      error: 'Failed to fetch calendar',
      timestamp: new Date().toISOString()
    })
  }
}
