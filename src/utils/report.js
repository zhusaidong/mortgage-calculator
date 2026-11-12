// 报告数据模型（纯函数，不依赖 DOM，可在 Node 中导入测试）
import { fmtMoney, fmtWan, fmtPercent } from '../core/format.js'
import { computeResult } from '../core/calc.js'
import { PAY_TYPE } from '../core/constants.js'

const WAN = 10000

function toNum(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function finiteOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function money(value) {
  return `¥${fmtMoney(toNum(value))}`
}

function wan(value) {
  return fmtWan(toNum(value), 2)
}

function percent(value, digits = 1) {
  return fmtPercent(toNum(value), digits)
}

// 收入为 0/缺失时计算层返回 null，这里保持 '--'，绝不打印 0%
function ratio(value) {
  if (value === null || value === undefined) return '--'
  const n = Number(value)
  return Number.isFinite(n) ? fmtPercent(n, 1) : '--'
}

/** 贷款类型文案 */
export function loanTypeLabel(value) {
  if (value === 'commercial') return '商业贷款'
  if (value === 'fund') return '公积金贷款'
  return '组合贷款'
}

/** 还款方式文案 */
export function payTypeLabel(value) {
  return value === 'equalPrincipal' ? '等额本金' : '等额本息'
}

/** 本地时间 'YYYY-MM-DD HH:mm'（补零） */
export function formatReportTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (!Number.isFinite(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 文件名基名 '房贷测算报告_YYYY-MM-DD_HH-mm' */
export function reportFileBase(date = new Date()) {
  const text = formatReportTime(date)
  if (!text) return '房贷测算报告'
  const [day, time] = text.split(' ')
  return `房贷测算报告_${day}_${time.replace(':', '-')}`
}

function buildComparison(settings, mode, label) {
  const result = computeResult({ ...settings, payMode: mode })
  const isPrincipal = mode === PAY_TYPE.PRINCIPAL
  const lastPay = isPrincipal
    ? toNum(result.fundLoan?.lastMonth) + toNum(result.comLoan?.lastMonth)
    : result.origin

  return {
    mode,
    label,
    firstPay: result.origin,
    lastPay,
    totalInterest: toNum(result.totalInterestW) * WAN,
    totalPay: toNum(result.totalPayW) * WAN
  }
}

/**
 * 组装报告展示模型
 * @param {object} settings 参数配置
 * @param {object} result computeResult 的结果
 * @param {object} schedule buildAmortization 的结果
 * @param {Date} now 生成时间
 */
export function buildReportModel(settings, result, schedule, now = new Date()) {
  const s = settings || {}
  const r = result || {}
  const sch = schedule || { rows: [], years: [], totals: {} }
  const totals = sch.totals || {}

  const payMode = s.payMode === PAY_TYPE.PRINCIPAL ? PAY_TYPE.PRINCIPAL : PAY_TYPE.INTEREST
  const isPrincipal = payMode === PAY_TYPE.PRINCIPAL

  const params = [
    { label: '房屋总价(万)', value: wan(s.housePrice) },
    { label: '首付比例', value: percent(s.downRate) },
    { label: '首付金额(万)', value: wan(r.downW) },
    { label: '贷款总额(万)', value: wan(r.totalLoanW) },
    { label: '公积金贷款(万)', value: wan(r.fundW) },
    { label: '商业贷款(万)', value: wan(r.comW) },
    { label: '贷款年限(年)', value: `${toNum(s.loanYear)} 年` },
    { label: '商贷利率', value: percent(r.comRate, 2) },
    { label: '公积金利率', value: percent(s.fundRate, 2) },
    { label: '公积金月缴存(元)', value: money(s.monthGjj) },
    { label: '税后月收入(元)', value: money(s.monthSalary) },
    { label: '税前月收入(元)', value: money(s.monthPreTaxSalary) }
  ]

  const metrics = [
    {
      label: isPrincipal ? '首月应还(元)' : '每月应还(元)',
      value: money(r.origin),
      tone: 'primary'
    }
  ]

  if (isPrincipal) {
    metrics.push({
      label: '末月应还(元)',
      value: money(toNum(r.fundLoan?.lastMonth) + toNum(r.comLoan?.lastMonth)),
      tone: 'default'
    })
  }

  metrics.push(
    { label: '抵扣后自付(元)', value: money(r.selfPay), tone: 'default' },
    { label: '总利息', value: money(toNum(r.totalInterestW) * WAN), tone: 'warning' },
    { label: '总还款', value: money(toNum(r.totalPayW) * WAN), tone: 'default' },
    { label: '月供占税后', value: ratio(r.rateOrigin), tone: 'default' },
    { label: '银行偿贷比', value: ratio(r.ratePreTax), tone: 'default' }
  )

  return {
    title: '房贷测算报告',
    subtitle: '本地计算生成 · 仅供参考',
    generatedAt: formatReportTime(now),
    loanTypeLabel: loanTypeLabel(r.loanType || s.loanType),
    payTypeLabel: payTypeLabel(payMode),
    payMode,
    params,
    metrics,
    totals: {
      principal: finiteOr(totals.principal, toNum(r.totalLoanW) * WAN),
      interest: finiteOr(totals.interest, toNum(r.totalInterestW) * WAN),
      pay: finiteOr(totals.pay, toNum(r.totalPayW) * WAN),
      selfPay: finiteOr(totals.selfPay, toNum(r.selfPay) * toNum(r.months))
    },
    years: sch.years || [],
    comparisons: [
      buildComparison(s, PAY_TYPE.INTEREST, '等额本息'),
      buildComparison(s, PAY_TYPE.PRINCIPAL, '等额本金')
    ]
  }
}
