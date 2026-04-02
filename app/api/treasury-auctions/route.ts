import { NextResponse } from 'next/server'

// 强制动态渲染，绝对不能缓存宏观数据！
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 美国财政部官方API - Treasury Direct
// 专门抓取10年期国债拍卖数据

interface TreasuryDirectAuction {
  cusip: string
  issueDate: string
  securityType: string
  securityTerm: string
  maturityDate: string
  interestRate: string
  auctionDate: string
  highYield: string | null
  highDiscountRate: string | null
  highPrice: string | null
  allottedPct: string | null
  bidToCoverRatio: string | null
  totalAccepted: string | null
  totalTendered: string | null
  primaryDealerAccepted: string | null
  primaryDealerTendered: string | null
  directBidderAccepted: string | null
  directBidderTendered: string | null
  indirectBidderAccepted: string | null
  indirectBidderTendered: string | null
  averageMedianYield: string | null
  lowYield: string | null
}

type AlertLevel = 'NORMAL' | 'WARNING' | 'CRITICAL'

interface AuctionEvaluation {
  alertLevel: AlertLevel
  status: string
  action: string
}

function evaluateAuction(bidToCover: number, dealerRatio: number): AuctionEvaluation {
  // 核心公式：根据投标倍数和华尔街接盘比例判断危险等级
  if (bidToCover < 2.0 || dealerRatio > 20) {
    return {
      alertLevel: 'CRITICAL',
      status: '核爆警告 (流动性休克)',
      action: '系统濒临崩溃！准备满仓黄金(XAUUSD)，左侧准备接入硬核科技！'
    }
  } else if (bidToCover < 2.3 || dealerRatio > 15) {
    return {
      alertLevel: 'WARNING',
      status: '警戒提示 (买盘萎缩)',
      action: '密切关注明天的隔夜逆回购(RRP)和美元指数，子弹上膛。'
    }
  }
  return {
    alertLevel: 'NORMAL',
    status: '安全 (维持收息防守)',
    action: '底仓神华/海油不动，科技股继续装死。'
  }
}

export async function GET() {
  try {


    // 调用 Treasury Direct API，锁定 10年期国债
    const url = 'https://www.treasurydirect.gov/TA_WS/securities/search?format=json&securityType=Note&securityTerm=10-Year&days=180'


    // 明确设置 cache: 'no-store'，确保每次拿到最新鲜的开标结果
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Treasury Direct API 请求失败: ${response.status}`)
    }



    const data: TreasuryDirectAuction[] = await response.json()

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        message: '暂无拍卖数据',
        auctions: [],
        evaluation: null
      }, { status: 404 })
    }

    // 修复2：过滤区分出“已完成”的拍卖和“尚未开标的预告”
    const completedAuctions = data.filter(a => a.bidToCoverRatio && parseFloat(a.bidToCoverRatio) > 0)

    if (completedAuctions.length === 0) {
      throw new Error('近期没有找到已完成的拍卖数据')
    }

    // 取最新的一期开标结果
    const latestAuction = completedAuctions[0]

    // 提取核心数据
    const bidToCover = latestAuction.bidToCoverRatio ? parseFloat(latestAuction.bidToCoverRatio) : null
    const highYield = latestAuction.highYield ? parseFloat(latestAuction.highYield) : null
    const totalAccepted = latestAuction.totalAccepted ? parseFloat(latestAuction.totalAccepted) : null
    const primaryDealerAccepted = latestAuction.primaryDealerAccepted ? parseFloat(latestAuction.primaryDealerAccepted) : null
    const directBidderAccepted = latestAuction.directBidderAccepted ? parseFloat(latestAuction.directBidderAccepted) : null
    const indirectBidderAccepted = latestAuction.indirectBidderAccepted ? parseFloat(latestAuction.indirectBidderAccepted) : null

    // 处理所有近期拍卖数据
    const auctions = completedAuctions.slice(0, 10).map((auction: TreasuryDirectAuction) => {
      const btc = auction.bidToCoverRatio ? parseFloat(auction.bidToCoverRatio) : null
      const total = auction.totalAccepted ? parseFloat(auction.totalAccepted) : null
      const dealer = auction.primaryDealerAccepted ? parseFloat(auction.primaryDealerAccepted) : null
      const direct = auction.directBidderAccepted ? parseFloat(auction.directBidderAccepted) : null
      const indirect = auction.indirectBidderAccepted ? parseFloat(auction.indirectBidderAccepted) : null

      // 计算华尔街接盘比例
      const dealerRatio = (total && dealer) ? (dealer / total) * 100 : null

      // 计算各类买家比例
      const directRatio = (total && direct) ? (direct / total) * 100 : null
      const indirectRatio = (total && indirect) ? (indirect / total) * 100 : null

      // 评估状态
      let status: 'normal' | 'weak' | 'danger' = 'normal'
      let alertLevel: AlertLevel = 'NORMAL'

      if (btc !== null && dealerRatio !== null) {
        const eval_ = evaluateAuction(btc, dealerRatio)
        alertLevel = eval_.alertLevel
        if (alertLevel === 'CRITICAL') status = 'danger'
        else if (alertLevel === 'WARNING') status = 'weak'
      }

      return {
        date: auction.auctionDate,
        type: `${auction.securityTerm} ${auction.securityType}`,
        bidToCover: btc ?? 0,
        rate: auction.highYield ? parseFloat(auction.highYield) : null,
        dealerRatio: dealerRatio ? parseFloat(dealerRatio.toFixed(2)) : null,
        directRatio: directRatio ? parseFloat(directRatio.toFixed(2)) : null,
        indirectRatio: indirectRatio ? parseFloat(indirectRatio.toFixed(2)) : null,
        totalAccepted: total,
        status,
        alertLevel,
        // 保留tail字段兼容旧组件（用dealer ratio估算）
        tail: dealerRatio && dealerRatio > 15 ? (dealerRatio - 10) / 5 : 0.5
      }
    }).filter((a: { bidToCover: number }) => a.bidToCover > 0)

    // 如果最新数据还不完整（预告期），返回提示
    if (!bidToCover || !totalAccepted || !primaryDealerAccepted) {
      return NextResponse.json({
        success: true,
        message: '本期拍卖详细接盘数据尚未公布，请开标后重试。',
        auctions,
        latestAuction: {
          auctionDate: latestAuction.auctionDate,
          securityTerm: latestAuction.securityTerm,
          dataAvailable: false
        },
        evaluation: null,
        source: 'Treasury Direct',
        timestamp: new Date().toISOString()
      })
    }

    // 计算华尔街接盘比例
    const dealerRatio = (primaryDealerAccepted / totalAccepted) * 100
    const directRatio = directBidderAccepted ? (directBidderAccepted / totalAccepted) * 100 : 0
    const indirectRatio = indirectBidderAccepted ? (indirectBidderAccepted / totalAccepted) * 100 : 0

    // 宏观裁判引擎：自动打分评判
    const evaluation = evaluateAuction(bidToCover, dealerRatio)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      source: 'Treasury Direct',
      // 最新一期详细数据
      latestAuction: {
        auctionDate: latestAuction.auctionDate,
        securityTerm: latestAuction.securityTerm,
        bidToCover,
        highYield,
        dealerRatio: parseFloat(dealerRatio.toFixed(2)),
        directRatio: parseFloat(directRatio.toFixed(2)),
        indirectRatio: parseFloat(indirectRatio.toFixed(2)),
        raw: {
          totalAccepted,
          primaryDealerAccepted,
          directBidderAccepted,
          indirectBidderAccepted
        },
        dataAvailable: true
      },
      // 警报评估
      evaluation,
      // 近期所有拍卖列表
      auctions,
      // 汇总统计
      summary: {
        avgBidToCover: auctions.length > 0
          ? (auctions.reduce((sum: number, a: { bidToCover: number }) => sum + a.bidToCover, 0) / auctions.length).toFixed(2)
          : '0',
        hasWarning: auctions.some((a: { alertLevel: AlertLevel }) => a.alertLevel !== 'NORMAL'),
        criticalCount: auctions.filter((a: { alertLevel: AlertLevel }) => a.alertLevel === 'CRITICAL').length,
        warningCount: auctions.filter((a: { alertLevel: AlertLevel }) => a.alertLevel === 'WARNING').length,
        totalAuctions: auctions.length
      }
    })

  } catch (error) {
    console.error('Treasury API error:', error)

    // 返回模拟数据作为备用
    return NextResponse.json({
      success: false,
      auctions: [
        { date: '2026-03-20', type: '10-Year Note', bidToCover: 2.45, rate: 4.38, dealerRatio: 12.5, status: 'normal', alertLevel: 'NORMAL', tail: 0.5 },
        { date: '2026-03-13', type: '10-Year Note', bidToCover: 2.21, rate: 4.62, dealerRatio: 16.2, status: 'weak', alertLevel: 'WARNING', tail: 1.2 },
        { date: '2026-03-06', type: '10-Year Note', bidToCover: 2.58, rate: 4.25, dealerRatio: 11.8, status: 'normal', alertLevel: 'NORMAL', tail: 0.3 },
      ],
      latestAuction: null,
      evaluation: {
        alertLevel: 'NORMAL',
        status: '安全 (维持收息防守)',
        action: '底仓神华/海油不动，科技股继续装死。'
      },
      summary: {
        avgBidToCover: '2.41',
        hasWarning: true,
        criticalCount: 0,
        warningCount: 1,
        totalAuctions: 3
      },
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}
