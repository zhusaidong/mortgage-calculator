import { PAY_TYPE, DEFAULT_SETTINGS } from './constants.js'
import { computeResult } from './calc.js'

const MONTHS_PER_YEAR = 12
const WAN = 10000
// 仅为吸收浮点残差，不用于四舍五入金额
const FLOAT_EPS = 1e-9

// 非有限数归零：输入框可能产生 ''/undefined，导致 NaN 渗透进还款计划
function finiteOrZero(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function finiteOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function emptyAmortization() {
  return {
    rows: [],
    years: [],
    totals: { pay: 0, principal: 0, interest: 0, gjjOffset: 0, selfPay: 0 }
  }
}

/**
 * 单笔贷款的逐月还款计划
 * @param {number} principalWan 本金（万元）
 * @param {number} years 年限
 * @param {number} annualRatePercent 年利率（百分数，例如 3.05 表示 3.05%）
 * @param {'equalPrincipalInterest'|'equalPrincipal'} payType
 * @returns {Array<{ month:number, pay:number, principal:number, interest:number, remain:number }>}
 *   month: 1..n；pay/principal/interest/remain 单位均为元；remain 为当月还款后的剩余本金
 */
export function buildLoanSchedule(principalWan, years, annualRatePercent, payType) {
  const p = finiteOrZero(principalWan) * WAN
  const months = Math.round(finiteOrZero(years) * MONTHS_PER_YEAR)
  const r = finiteOrZero(annualRatePercent) / 100 / MONTHS_PER_YEAR

  // 边界修复：本金或期数为 0/负数时不产生任何行，避免 NaN/Infinity
  if (p <= 0 || months < 1) return []

  const rows = []

  if (payType === PAY_TYPE.PRINCIPAL) {
    // 等额本金：每月本金固定，利息按剩余本金计算；末月本金吸收浮点残差
    const base = p / months
    let remain = p
    for (let i = 1; i <= months; i++) {
      const interest = remain * r
      const principal = i === months ? remain : base
      rows.push({ month: i, pay: principal + interest, principal, interest, remain: i === months ? 0 : remain - principal })
      remain = i === months ? 0 : remain - principal
    }
    return rows
  }

  // 等额本息：月供固定，r === 0 时退化为 p/n，末月吸收残差使剩余本金精确归零
  const factor = Math.pow(1 + r, months)
  const pay = r === 0 ? p / months : (p * r * factor) / (factor - 1)

  let remain = p
  for (let i = 1; i <= months; i++) {
    const interest = remain * r
    const principal = i === months ? remain : pay - interest
    const monthPay = i === months ? principal + interest : pay
    const nextRemain = i === months ? 0 : remain - principal
    // 浮点残差可能让剩余本金出现极小负数，归零但不做金额四舍五入
    rows.push({ month: i, pay: monthPay, principal, interest, remain: nextRemain < 0 && nextRemain > -FLOAT_EPS ? 0 : nextRemain })
    remain = nextRemain
  }
  return rows
}

/**
 * 整笔房贷（公积金 + 商贷）的合并还款计划
 * @param {object} settings 结构同 DEFAULT_SETTINGS
 * @returns {{
 *   rows: Array<{
 *     month: number, year: number,
 *     fundPay: number, comPay: number, pay: number,
 *     fundPrincipal: number, comPrincipal: number, principal: number,
 *     fundInterest: number, comInterest: number, interest: number,
 *     gjjOffset: number, selfPay: number, remain: number
 *   }>,
 *   years: Array<{ year:number, pay:number, principal:number, interest:number, gjjOffset:number, selfPay:number, remain:number }>,
 *   totals: { pay:number, principal:number, interest:number, gjjOffset:number, selfPay:number }
 * }}
 */
export function buildAmortization(settings = {}) {
  // 复用 computeResult 的利率口径与公积金封顶规则，避免重复实现拆单逻辑
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const res = computeResult(s)
  const months = Math.round(finiteOr(res.months, 0))

  if (!(res.totalLoanW > 0) || months < 1) return emptyAmortization()

  const payType = s.payMode === PAY_TYPE.PRINCIPAL ? PAY_TYPE.PRINCIPAL : PAY_TYPE.INTEREST
  const fundRate = finiteOr(s.fundRate, DEFAULT_SETTINGS.fundRate)
  const monthGjj = finiteOrZero(s.monthGjj)
  const scheduleYears = months / MONTHS_PER_YEAR

  const fundSchedule = buildLoanSchedule(res.fundW, scheduleYears, fundRate, payType)
  const comSchedule = buildLoanSchedule(res.comW, scheduleYears, res.comRate, payType)

  if (fundSchedule.length === 0 && comSchedule.length === 0) return emptyAmortization()

  const zeroRow = { pay: 0, principal: 0, interest: 0, remain: 0 }
  const rows = []
  const totals = { pay: 0, principal: 0, interest: 0, gjjOffset: 0, selfPay: 0 }

  for (let i = 0; i < months; i++) {
    const fund = fundSchedule[i] || zeroRow
    const com = comSchedule[i] || zeroRow

    const fundPay = fund.pay
    const comPay = com.pay
    const pay = fundPay + comPay
    const fundPrincipal = fund.principal
    const comPrincipal = com.principal
    const principal = fundPrincipal + comPrincipal
    const fundInterest = fund.interest
    const comInterest = com.interest
    const interest = fundInterest + comInterest

    // 冲抵顺序固定：先公积金月供，再商贷月供
    const fundOffset = Math.min(monthGjj, fundPay)
    const comOffset = Math.min(Math.max(monthGjj - fundPay, 0), comPay)
    const gjjOffset = fundOffset + comOffset
    const selfPay = Math.max(0, pay - gjjOffset)

    const row = {
      month: i + 1,
      year: Math.ceil((i + 1) / MONTHS_PER_YEAR),
      fundPay,
      comPay,
      pay,
      fundPrincipal,
      comPrincipal,
      principal,
      fundInterest,
      comInterest,
      interest,
      gjjOffset,
      selfPay,
      remain: fund.remain + com.remain
    }

    rows.push(row)
    totals.pay += row.pay
    totals.principal += row.principal
    totals.interest += row.interest
    totals.gjjOffset += row.gjjOffset
    totals.selfPay += row.selfPay
  }

  // 按自然年聚合：每年 12 个月，最后一年可能不足 12 个月
  const years = []
  for (let start = 0; start < rows.length; start += MONTHS_PER_YEAR) {
    const chunk = rows.slice(start, start + MONTHS_PER_YEAR)
    const year = Math.ceil(chunk[0].month / MONTHS_PER_YEAR)
    const summary = { year, pay: 0, principal: 0, interest: 0, gjjOffset: 0, selfPay: 0, remain: chunk[chunk.length - 1].remain }
    for (const row of chunk) {
      summary.pay += row.pay
      summary.principal += row.principal
      summary.interest += row.interest
      summary.gjjOffset += row.gjjOffset
      summary.selfPay += row.selfPay
    }
    years.push(summary)
  }

  return { rows, years, totals }
}
