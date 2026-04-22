/**
 * Markdown「宏观狙击战报」生成：对齐站内可拉取的雷达数据；
 * 新闻/地缘段落需后续 RSS 接入，此处为占位提示。
 */

import type { SniperRadarPayload, SniperQuoteRow } from '@/hooks/use-market-data'

export interface CpiBrief {
  headline: number | null
  core: number | null
  coreMonthly: number | null
  date?: string
  nextReleaseDate?: string | null
}

export interface MarketBriefForSniper {
  us10y?: { value: number; changePercent: number }
  dxy?: { value: number; changePercent: number }
  gold?: { value: number; changePercent: number }
  goldDetails?: { isBackwardation?: boolean; spread?: number | null }
}

function fmtNum(n: number | null | undefined, digits = 2, prefix = ''): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `${prefix}${n.toFixed(digits)}`
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function rowRadar(category: string, indicator: string, reading: string, move: string): string {
  const catCell = category ? `**${category}**` : ''
  return `| ${catCell} | ${indicator} | **${reading}** | ${move} |`
}

function stagnationRows(
  oil: number | null | undefined,
  gas: number | null | undefined,
  y10: number | null | undefined,
  hy: number | null | undefined
): string {
  const hyN = hy ?? null
  const oilN = oil ?? null
  const gasN = gas ?? null
  const y10N = y10 ?? null
  const oilOk = oilN != null && oilN > 90
  const gasOk = gasN != null && gasN > 3.8
  const y10Ok = y10N != null && y10N > 4.0
  const hyOk = hyN != null && hyN > 350
  return `| 原油 > $90 | ${oilOk ? '✅' : '❌'} ${fmtNum(oilN, 2, '$')}/桶 | 能源通胀硬化 |
| 汽油 > $3.80 | ${gasOk ? '✅' : '❌'} ${fmtNum(gasN, 3, '$')}/加仑 | 选民痛苦指数 |
| 10Y > 4.0% | ${y10Ok ? '✅' : '❌'} ${fmtNum(y10N, 2)}% | 融资成本 |
| HY OAS > 350bps | ${hyOk ? '✅' : '❌'} ${hyN != null ? `~${Math.round(hyN)} bps` : '—'} | 信用压力 |`
}

export function buildSniperWarfareMarkdown(opts: {
  radar: SniperRadarPayload | null | undefined
  cpi: CpiBrief
  market: MarketBriefForSniper | null | undefined
  generatedAt?: Date
}): string {
  const now = opts.generatedAt ?? new Date()
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const r = opts.radar

  const brentSpot = r?.brentSpot.value
  const brentPrev = r?.brentSpot.previousClose
  const brentDod = r?.brentSpot.changePercent
  const brentYoy = r?.brentSpot.yoyPercent
  const spread = r?.brentSpotMinusFuturesUsd
  const itaP = r?.ita.price
  const qqqP = r?.qqq.price
  const ratio = r?.itaQqqRatio

  let verdict = '🟡 **观察 — 数据部分缺失或待确认**'
  if (brentSpot != null && brentPrev != null && itaP != null && qqqP != null && ratio != null) {
    const spotUp = (brentDod ?? 0) > 0.5
    const itaDown = (r?.ita.changePercent ?? 0) < -1
    if (spotUp && itaDown && ratio < 0.38) {
      verdict = '🔴 **高度警戒 — 现货偏强 vs 战争溢价回落（假 TACO 情景需人工核对新闻）**'
    } else if (!spotUp && ratio > 0.36) {
      verdict = '🟢 **缓和 — 油价回落且 ITA/QQQ 未极端背离（仍需地缘与信用确认）**'
    }
  }

  const md: string[] = []
  md.push(`# 宏观狙击战报 | ${dateStr}（${weekday}）`)
  md.push('')
  md.push(`**副手评级（自动草稿）：** ${verdict}`)
  md.push('')
  md.push('---')
  md.push('')
  md.push('## 今日雷达数据摘要')
  md.push('')
  md.push('| 雷达类别 | 指标 | 读数 | 异动 |')
  md.push('|---------|------|------|------|')

  md.push(
    rowRadar(
      '物理通胀',
      '布伦特原油现货 (FRED)',
      brentSpot != null ? `$${brentSpot.toFixed(2)}/桶` : '—',
      brentDod != null ? `${fmtPct(brentDod)}（同比 ${brentYoy != null ? fmtPct(brentYoy) : '—'}）` : '—'
    )
  )
  md.push(
    rowRadar(
      '',
      '布伦特前收 (现货序列)',
      brentPrev != null ? `$${brentPrev.toFixed(2)}/桶` : '—',
      r?.brentSpot.spotDate ? `截至 ${r.brentSpot.spotDate}` : '—'
    )
  )
  md.push(
    rowRadar(
      '',
      '全美汽油均价 (FRED GASREGW)',
      r?.gasolineAaa.price != null ? `$${r.gasolineAaa.price.toFixed(3)}/加仑` : '—',
      r?.gasolineAaa.changePercent != null ? fmtPct(r.gasolineAaa.changePercent) : '—'
    )
  )
  md.push(
    rowRadar(
      '信用流动性',
      '10年期美债收益率',
      opts.market?.us10y != null ? `${opts.market.us10y.value.toFixed(2)}%` : '—',
      opts.market?.us10y != null ? fmtPct(opts.market.us10y.changePercent) : '—'
    )
  )
  md.push(
    rowRadar(
      '',
      '高收益债利差 HY OAS (FRED)',
      r?.hyOas.price != null ? `~${Math.round(r.hyOas.price)} bps` : '—',
      r?.hyOas.changePercent != null ? fmtPct(r.hyOas.changePercent) : '—'
    )
  )
  md.push(
    rowRadar(
      '资金底牌',
      '军工 ETF (ITA)',
      itaP != null ? `$${itaP.toFixed(2)}` : '—',
      r?.ita.changePercent != null ? fmtPct(r.ita.changePercent) : '—'
    )
  )
  md.push(
    rowRadar(
      '',
      '纳斯达克100 (QQQ)',
      qqqP != null ? `$${qqqP.toFixed(2)}` : '—',
      r?.qqq.changePercent != null ? fmtPct(r.qqq.changePercent) : '—'
    )
  )
  md.push(
    rowRadar(
      '',
      'ITA / QQQ 比值',
      ratio != null ? ratio.toFixed(3) : '—',
      spread != null ? `布伦特现货−期货: ${spread >= 0 ? '+' : ''}${spread.toFixed(2)} $/桶` : '—'
    )
  )

  const hk = r?.hk
  if (hk) {
    const lines: [string, string, SniperQuoteRow][] = [
      ['**港股底仓**', '价值黄金 (03081)', hk.valueGold03081],
      ['', '中国神华 (01088)', hk.chinaShenhua01088],
      ['', '中国移动 (00941)', hk.chinaMobile00941],
      ['', '紫金矿业 (02899)', hk.zijinMining02899],
    ]
    for (const [cat, label, q] of lines) {
      md.push(
        rowRadar(
          cat || '',
          label,
          q.price != null ? `${q.price.toFixed(2)} HKD` : '—',
          q.changePercent != null ? fmtPct(q.changePercent) : '—'
        )
      )
    }
  }

  md.push('')
  md.push('**期现结构（布伦特）：** 现货 − 前月期货 = ' + (spread != null ? `${spread >= 0 ? '+' : ''}${spread.toFixed(2)} $/桶` : '—') + '（正数通常表示现货溢价 / backwardation 方向，需结合交割与统计口径解读）。')
  md.push('')
  md.push('**关键新闻（未接入自动源 — 请粘贴或后续接 RSS）：**')
  md.push('1. _在此填写特朗普 / 伊朗 / IMF / 零售销售等标题与来源日期_')
  md.push('2. _CNN / 路透等链接可附在导出后版本_')
  md.push('')
  md.push('---')
  md.push('')
  md.push('## 模块一：宏观象限与概率定调（草稿）')
  md.push('')
  md.push('### 1.1 战争溢价与 ITA/QQQ')
  md.push('')
  md.push(
    ratio != null && itaP != null && qqqP != null
      ? `**计算：** ITA / QQQ = ${itaP.toFixed(2)} / ${qqqP.toFixed(2)} = **${ratio.toFixed(3)}**`
      : '**计算：** ITA/QQQ 数据不全，无法自动计算比值。'
  )
  md.push('')
  md.push('> 以下为模板句式，请根据当日新闻与上述表格人工润色。')
  md.push('')
  md.push('### 1.2 滞胀诊断（阈值表）')
  md.push('')
  md.push('| 滞胀诊断指标 | 当前读数 | 阈值参考 |')
  md.push('|-------------|---------|---------|')
  md.push(stagnationRows(brentSpot, r?.gasolineAaa.price ?? null, opts.market?.us10y?.value ?? null, r?.hyOas.price ?? null))
  md.push('')
  md.push('### 1.3 流动性危机概率（示意表 — 概率需人工修订）')
  md.push('')
  md.push('| 情景 | 概率 | 触发条件 |')
  md.push('|------|------|---------|')
  md.push('| 流动性危机（Credit Event） | _待填_% | HY OAS 突破 400bps + 原油破 $110 |')
  md.push('| 深度滞胀 | _待填_% | 原油 $95–105 + 10Y 4.2–4.5% + 盈利下修 |')
  md.push('| 轻度滞胀 | _待填_% | 原油回落至 $85–95 |')
  md.push('| 重回复苏/放水 | _待填_% | 10Y 跌破 3.8% + 联储降息信号 |')
  md.push('')
  md.push('---')
  md.push('')
  md.push('## 模块二：核心指标异动警报（草稿）')
  md.push('')
  md.push('| 指标 A | 指标 B | 备注 |')
  md.push('|--------|--------|------|')
  md.push(
    `| 布伦特现货 ${brentSpot != null ? `$${brentSpot.toFixed(2)}` : '—'} | ITA ${itaP != null ? `$${itaP.toFixed(2)}` : '—'} | 若现货强而 ITA 弱，提示「叙事 vs 物理」背离，需人工定性 |`
  )
  md.push('')
  md.push(`**黄金期现：** ${opts.market?.goldDetails?.isBackwardation ? '现货升水（backwardation）' : '未判定危机贴水'}；现货黄金约 $${opts.market?.gold?.value?.toFixed(0) ?? '—'}。`)
  md.push('')
  md.push('---')
  md.push('')
  md.push('## 模块三：凯利与战术指令（模板 — 必须人工覆盖）')
  md.push('')
  md.push('| 标的 | 核心逻辑 | 胜率 p | 赔率 b | 建议 |')
  md.push('|------|---------|--------|--------|------|')
  md.push('| 03081 / 01088 / 00941 / 02899 | _自填_ | _%_ | _%_ | 重仓 / 减仓 / 观望 |')
  md.push('')
  md.push('### 战略现金出击条件（勾选表）')
  md.push('')
  md.push('| 条件 | 触发 | 当前 |')
  md.push('|------|------|------|')
  md.push(`| A 布伦特跌破 $92 | 真撤军供给缓和 | ${brentSpot != null && brentSpot < 92 ? '✅' : '❌'} ${brentSpot != null ? `$${brentSpot.toFixed(2)}` : '—'} |`)
  md.push(`| B 10Y 跌破 4.00% | 降息预期 | ${opts.market?.us10y != null && opts.market.us10y.value < 4 ? '✅' : '❌'} ${opts.market?.us10y != null ? `${opts.market.us10y.value.toFixed(2)}%` : '—'} |`)
  md.push(`| C HY OAS < 250 bps | 信用改善 | ${r?.hyOas.price != null && r.hyOas.price < 250 ? '✅' : '❌'} ${r?.hyOas.price != null ? `~${Math.round(r.hyOas.price)}` : '—'} |`)
  md.push(`| D ITA/QQQ > 0.36 | 战争溢价重定价 | ${ratio != null && ratio > 0.36 ? '✅' : '❌'} ${ratio != null ? ratio.toFixed(3) : '—'} |`)
  md.push(`| E QQQ 站稳 $660 | 科技突破 | ${qqqP != null && qqqP >= 660 ? '✅' : '❌'} ${qqqP != null ? `$${qqqP.toFixed(2)}` : '—'} |`)
  md.push('')
  md.push('---')
  md.push('')
  md.push('## 附：明日观察清单（模板）')
  md.push('')
  md.push('| 时间 | 观察标的 | 关键价位/事件 |')
  md.push('|------|---------|---------------|')
  md.push('| 盘前 | 布伦特现货 | 是否站稳关键整数关口 |')
  md.push('| 开盘 | ITA | 是否延续波动 |')
  md.push('| 盘中 | 02899 | 关键港股支撑 |')
  md.push('')
  md.push('---')
  md.push('')
  md.push('## CPI 快照（站内）')
  md.push('')
  md.push(`- Headline: ${opts.cpi.headline ?? '—'}% · Core: ${opts.cpi.core ?? '—'}% · 核心环比: ${opts.cpi.coreMonthly ?? '—'}%`)
  md.push(`- 数据日期: ${opts.cpi.date ?? '—'} · 下次发布: ${opts.cpi.nextReleaseDate ?? '—'}`)
  md.push('')
  if (r?.dataNotes?.length) {
    md.push('## 数据说明')
    md.push('')
    for (const n of r.dataNotes) md.push(`- ${n}`)
    md.push('')
  }
  md.push(`*战报生成时间：${now.toLocaleString('zh-CN')}*`)
  md.push('*数据来源：本站 /api/market-data（FRED、Yahoo、FMP 等）；新闻段落未自动抓取*')
  md.push('')
  md.push('*数据仅供参考，不构成投资建议 · 投资有风险，入市需谨慎*')

  return md.join('\n')
}
