import { NextResponse } from 'next/server'

// 美国财政部官方API - 无需API Key
// 文档: https://fiscaldata.treasury.gov/api-documentation/

interface TreasuryAuctionData {
  auction_date: string
  security_type: string
  security_term: string
  bid_to_cover_ratio: string | null
  high_investment_rate: string | null
  high_discount_rate: string | null
  offering_amt: string
  allotted_pct: string | null
}

interface TreasuryApiResponse {
  data?: TreasuryAuctionData[]
  meta?: {
    total_count: number
  }
}

export async function GET() {
  try {
    // 获取最近的国债拍卖数据
    const url = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?sort=-auction_date&page[size]=20&filter=security_type:in:(Note,Bond)'
    
    const response = await fetch(url, {
      next: { revalidate: 3600 } // 缓存1小时
    })
    
    if (!response.ok) {
      throw new Error(`Treasury API error: ${response.status}`)
    }
    
    const data: TreasuryApiResponse = await response.json()
    
    // 处理拍卖数据
    const auctions = (data.data || []).map((auction: TreasuryAuctionData) => {
      const bidToCover = auction.bid_to_cover_ratio 
        ? parseFloat(auction.bid_to_cover_ratio) 
        : null
      
      // 计算状态
      let status: 'normal' | 'weak' | 'danger' = 'normal'
      if (bidToCover !== null) {
        if (bidToCover < 2.0) status = 'danger'
        else if (bidToCover < 2.3) status = 'weak'
      }
      
      return {
        date: auction.auction_date,
        type: `${auction.security_term} ${auction.security_type}`,
        bidToCover,
        rate: auction.high_investment_rate 
          ? parseFloat(auction.high_investment_rate)
          : auction.high_discount_rate 
            ? parseFloat(auction.high_discount_rate)
            : null,
        offeringAmount: parseFloat(auction.offering_amt),
        status
      }
    }).filter((a: { bidToCover: number | null }) => a.bidToCover !== null)
    
    // 计算平均投标倍数
    const avgBidToCover = auctions.length > 0
      ? auctions.reduce((sum: number, a: { bidToCover: number | null }) => sum + (a.bidToCover || 0), 0) / auctions.length
      : 0
    
    // 检查是否有危险信号
    const hasWarning = auctions.some((a: { status: string }) => a.status === 'weak' || a.status === 'danger')
    
    return NextResponse.json({
      auctions: auctions.slice(0, 10),
      summary: {
        avgBidToCover: avgBidToCover.toFixed(2),
        hasWarning,
        totalAuctions: data.meta?.total_count || auctions.length
      },
      source: 'Treasury Direct',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Treasury API error:', error)
    
    // 返回模拟数据作为备用
    return NextResponse.json({
      auctions: [
        { date: '2026-03-20', type: '10-Year Note', bidToCover: 2.45, rate: 4.38, status: 'normal' },
        { date: '2026-03-13', type: '30-Year Bond', bidToCover: 2.21, rate: 4.62, status: 'weak' },
        { date: '2026-03-06', type: '10-Year Note', bidToCover: 2.58, rate: 4.25, status: 'normal' },
      ],
      summary: {
        avgBidToCover: '2.41',
        hasWarning: true,
        totalAuctions: 3
      },
      source: 'fallback',
      error: 'Using fallback data',
      timestamp: new Date().toISOString()
    })
  }
}
