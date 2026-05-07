/** Latest + prior FRED observation for dashboard metrics */

export interface FredLatestPair {
  seriesId: string
  value: number
  previousValue: number
  change: number
  changePercent: number
  date: string
}

export async function fetchFredLatestPair(
  seriesId: string,
  apiKey: string,
  limit = 5
): Promise<FredLatestPair | null> {
  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${apiKey}&file_type=json&limit=${limit}&sort_order=desc`
    const response = await fetch(url, { next: { revalidate: 300 } })
    if (!response.ok) return null
    const data = (await response.json()) as {
      observations?: { date: string; value: string }[]
    }
    const obs = (data.observations || []).filter((o) => o.value !== '.')
    if (obs.length === 0) return null
    const v0 = parseFloat(obs[0].value)
    const v1 = obs.length > 1 ? parseFloat(obs[1].value) : v0
    const change = v0 - v1
    const changePercent = v1 !== 0 ? (change / v1) * 100 : 0
    return {
      seriesId,
      value: v0,
      previousValue: v1,
      change,
      changePercent,
      date: obs[0].date,
    }
  } catch {
    return null
  }
}
