// 长图导出：Canvas 2D 绘制 + 下载（仅在浏览器中调用）
import { fmtMoney, fmtPercent } from '../core/format.js'
import { reportFileBase } from './report.js'

const WIDTH = 1080
const PADDING = 56
const CONTENT_W = WIDTH - PADDING * 2
const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
const HEADER_H = 150
const BLOCK_GAP = 30
const HEADING_H = 44
const CARD_H = 104
const CARD_GAP = 16
const PARAM_ROW_H = 40
const BAR_H = 36
const TABLE_HEAD_H = 40
const ROW_H = 34
const FOOT_LINE_H = 18
const BOTTOM_PAD = 40

const COLOR = {
  bg: '#ffffff',
  text: '#111827',
  sub: '#6b7280',
  divider: '#e5e7eb',
  accent: '#2b7bce',
  interest: '#e8890c',
  card: '#f8fafc',
  foot: '#9ca3af',
  headerBg: '#eef2f7'
}

const DISCLAIMER = '提前还款、利率重定价与各地政策差异均可能影响实际结果，本报告仅供参考。'

function toNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function moneyText(value) {
  return `¥${fmtMoney(toNum(value))}`
}

function setFont(ctx, size, weight = '400', color = COLOR.text) {
  ctx.font = `${weight} ${size}px ${FONT}`
  ctx.fillStyle = color
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** 按像素宽度折行，中文按字符逐个累加，供页脚与副标题使用 */
export function wrapText(ctx, text, maxWidth) {
  const chars = Array.from(String(text ?? ''))
  const lines = []
  let line = ''
  for (const ch of chars) {
    if (ch === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    const test = line + ch
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function displayYears(years) {
  const list = Array.isArray(years) ? years : []
  if (list.length <= 40) return list.map((data) => ({ type: 'row', data }))
  return [
    ...list.slice(0, 35).map((data) => ({ type: 'row', data })),
    { type: 'ellipsis' },
    ...list.slice(-3).map((data) => ({ type: 'row', data }))
  ]
}

function pickMetrics(metrics) {
  const list = Array.isArray(metrics) ? metrics : []
  const monthly = list[0]
  const selfPay = list.find((item) => item.label.startsWith('抵扣后自付'))
  const interest = list.find((item) => item.label.startsWith('总利息'))
  const pay = list.find((item) => item.label.startsWith('总还款'))
  return [monthly, selfPay, interest, pay].filter(Boolean)
}

function computeHeight(model, rows, footerLines) {
  const params = Array.isArray(model.params) ? model.params.length : 0
  let height = HEADER_H + 30
  height += HEADING_H + CARD_H * 2 + CARD_GAP + BLOCK_GAP
  height += HEADING_H + params * PARAM_ROW_H + BLOCK_GAP
  height += HEADING_H + BAR_H + 40 + BLOCK_GAP
  height += HEADING_H + TABLE_HEAD_H + rows.length * ROW_H + BLOCK_GAP
  height += 22 + footerLines.length * FOOT_LINE_H + 6 + FOOT_LINE_H + BOTTOM_PAD
  return Math.ceil(height)
}

function drawHeading(ctx, text, y) {
  ctx.fillStyle = COLOR.accent
  roundRect(ctx, PADDING, y + 12, 4, 20, 2)
  ctx.fill()
  setFont(ctx, 22, '700', COLOR.text)
  ctx.textBaseline = 'middle'
  ctx.fillText(text, PADDING + 14, y + 22)
  ctx.textBaseline = 'alphabetic'
  return y + HEADING_H
}

function drawLegend(ctx, x, y, color, text) {
  ctx.fillStyle = color
  roundRect(ctx, x, y - 12, 14, 14, 3)
  ctx.fill()
  setFont(ctx, 17, '400', COLOR.sub)
  ctx.fillText(text, x + 22, y)
}

function drawHeader(ctx, model) {
  ctx.fillStyle = COLOR.accent
  ctx.fillRect(0, 0, WIDTH, HEADER_H)

  setFont(ctx, 38, '700', '#ffffff')
  ctx.fillText(model.title, PADDING, 72)

  setFont(ctx, 18, '400', 'rgba(255,255,255,0.92)')
  const lines = wrapText(ctx, model.subtitle, CONTENT_W - 260)
  lines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, PADDING, 104 + index * 22)
  })

  ctx.textAlign = 'right'
  setFont(ctx, 16, '400', 'rgba(255,255,255,0.9)')
  ctx.fillText(`生成时间 ${model.generatedAt}`, WIDTH - PADDING, 72)
  ctx.textAlign = 'left'
}

function drawMetrics(ctx, model, y) {
  y = drawHeading(ctx, '核心指标', y)
  const cards = pickMetrics(model.metrics)
  const cardW = (CONTENT_W - CARD_GAP) / 2

  cards.forEach((item, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const x = PADDING + col * (cardW + CARD_GAP)
    const top = y + row * (CARD_H + CARD_GAP)

    ctx.fillStyle = COLOR.card
    roundRect(ctx, x, top, cardW, CARD_H, 12)
    ctx.fill()

    setFont(ctx, 18, '400', COLOR.sub)
    ctx.fillText(item.label, x + 24, top + 40)
    setFont(ctx, 30, '700', COLOR.text)
    ctx.fillText(item.value, x + 24, top + 80)
  })

  return y + CARD_H * 2 + CARD_GAP + BLOCK_GAP
}

function drawParams(ctx, model, y) {
  y = drawHeading(ctx, '测算参数', y)
  const params = Array.isArray(model.params) ? model.params : []

  ctx.textBaseline = 'middle'
  params.forEach((item) => {
    setFont(ctx, 18, '400', COLOR.sub)
    ctx.textAlign = 'left'
    ctx.fillText(item.label, PADDING, y + PARAM_ROW_H / 2)

    setFont(ctx, 18, '500', COLOR.text)
    ctx.textAlign = 'right'
    ctx.fillText(item.value, PADDING + CONTENT_W, y + PARAM_ROW_H / 2)
    ctx.textAlign = 'left'

    ctx.strokeStyle = COLOR.divider
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PADDING, y + PARAM_ROW_H)
    ctx.lineTo(PADDING + CONTENT_W, y + PARAM_ROW_H)
    ctx.stroke()

    y += PARAM_ROW_H
  })
  ctx.textBaseline = 'alphabetic'

  return y + BLOCK_GAP
}

function drawStructure(ctx, model, y) {
  y = drawHeading(ctx, '本息结构', y)
  const principal = toNum(model.totals?.principal)
  const interest = toNum(model.totals?.interest)
  const total = principal + interest
  const principalW = total > 0 ? CONTENT_W * (principal / total) : 0
  const interestPct = total > 0 ? fmtPercent((interest / total) * 100, 1) : '--'

  ctx.fillStyle = COLOR.accent
  ctx.fillRect(PADDING, y, principalW, BAR_H)
  ctx.fillStyle = COLOR.interest
  ctx.fillRect(PADDING + principalW, y, CONTENT_W - principalW, BAR_H)

  const legendY = y + BAR_H + 26
  drawLegend(ctx, PADDING, legendY, COLOR.accent, `本金 ${moneyText(principal)}`)
  drawLegend(ctx, PADDING + CONTENT_W / 2, legendY, COLOR.interest, `利息 ${moneyText(interest)}（${interestPct}）`)

  return y + BAR_H + 40 + BLOCK_GAP
}

function drawTable(ctx, model, rows, y) {
  y = drawHeading(ctx, '年度还款汇总', y)
  const columns = [
    { key: 'year', label: '年份', align: 'left', ratio: 0.14 },
    { key: 'pay', label: '月供', align: 'right', ratio: 0.22 },
    { key: 'principal', label: '本金', align: 'right', ratio: 0.22 },
    { key: 'interest', label: '利息', align: 'right', ratio: 0.22 },
    { key: 'remain', label: '剩余本金', align: 'right', ratio: 0.2 }
  ]
  const xs = []
  let cursor = PADDING
  columns.forEach((col) => {
    xs.push(cursor)
    cursor += CONTENT_W * col.ratio
  })

  ctx.fillStyle = COLOR.headerBg
  ctx.fillRect(PADDING, y, CONTENT_W, TABLE_HEAD_H)
  setFont(ctx, 17, '600', COLOR.sub)
  ctx.textBaseline = 'middle'
  columns.forEach((col, index) => {
    ctx.textAlign = col.align
    const x = col.align === 'right' ? xs[index] + CONTENT_W * col.ratio : xs[index]
    ctx.fillText(col.label, x, y + TABLE_HEAD_H / 2)
  })
  ctx.textAlign = 'left'

  let rowTop = y + TABLE_HEAD_H
  rows.forEach((item, index) => {
    if (item.type === 'ellipsis') {
      ctx.fillStyle = COLOR.card
      ctx.fillRect(PADDING, rowTop, CONTENT_W, ROW_H)
      setFont(ctx, 17, '400', COLOR.sub)
      ctx.textAlign = 'center'
      ctx.fillText('……', PADDING + CONTENT_W / 2, rowTop + ROW_H / 2)
      ctx.textAlign = 'left'
    } else {
      if (index % 2 === 1) {
        ctx.fillStyle = COLOR.card
        ctx.fillRect(PADDING, rowTop, CONTENT_W, ROW_H)
      }
      const row = item.data || {}
      const cells = {
        year: `第 ${toNum(row.year)} 年`,
        pay: moneyText(row.pay),
        principal: moneyText(row.principal),
        interest: moneyText(row.interest),
        remain: moneyText(row.remain)
      }
      setFont(ctx, 17, '400', COLOR.text)
      columns.forEach((col, colIndex) => {
        ctx.textAlign = col.align
        const x = col.align === 'right' ? xs[colIndex] + CONTENT_W * col.ratio : xs[colIndex]
        setFont(ctx, 17, col.key === 'year' ? '500' : '400', col.key === 'year' ? COLOR.text : COLOR.sub)
        ctx.fillText(cells[col.key], x, rowTop + ROW_H / 2)
      })
      ctx.textAlign = 'left'
    }
    rowTop += ROW_H
  })
  ctx.textBaseline = 'alphabetic'

  return rowTop + BLOCK_GAP
}

function drawFooter(ctx, model, footerLines, y) {
  ctx.strokeStyle = COLOR.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PADDING, y)
  ctx.lineTo(PADDING + CONTENT_W, y)
  ctx.stroke()

  y += 22
  setFont(ctx, 12, '400', COLOR.foot)
  footerLines.forEach((line) => {
    ctx.fillText(line, PADDING, y)
    y += FOOT_LINE_H
  })

  y += 6
  ctx.fillText(`生成时间：${model.generatedAt}`, PADDING, y)
}

function drawReport(ctx, model, rows, footerLines) {
  drawHeader(ctx, model)

  let y = HEADER_H + 30
  y = drawMetrics(ctx, model, y)
  y = drawParams(ctx, model, y)
  y = drawStructure(ctx, model, y)
  y = drawTable(ctx, model, rows, y)
  drawFooter(ctx, model, footerLines, y)
}

/**
 * 绘制报告长图
 * @param {object} model buildReportModel 的结果
 * @returns {HTMLCanvasElement|null}
 */
export function renderReportImage(model) {
  if (typeof document === 'undefined' || !model) return null

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const rows = displayYears(model.years)
  setFont(ctx, 12, '400', COLOR.foot)
  const footerLines = wrapText(ctx, DISCLAIMER, CONTENT_W)
  const height = computeHeight(model, rows, footerLines)
  const dprValue = typeof window !== 'undefined' ? Number(window.devicePixelRatio) : 1
  const dpr = Number.isFinite(dprValue) && dprValue > 0 ? Math.min(dprValue, 2) : 1

  canvas.width = Math.round(WIDTH * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${WIDTH}px`
  canvas.style.height = `${height}px`

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = COLOR.bg
  ctx.fillRect(0, 0, WIDTH, height)
  drawReport(ctx, model, rows, footerLines)

  return canvas
}

/**
 * 下载报告长图
 * @param {object} model buildReportModel 的结果
 * @returns {boolean} 是否已发起下载
 */
export function downloadReportImage(model) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false

  const canvas = renderReportImage(model)
  if (!canvas || typeof canvas.toBlob !== 'function') return false

  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${reportFileBase(new Date())}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 'image/png')

  return true
}
