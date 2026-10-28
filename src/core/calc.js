import { PAY_TYPE, RATE_MODE, DEFAULT_SETTINGS } from './constants.js'

const MONTHS_PER_YEAR = 12
const WAN = 10000

// 非有限数归零：旧版输入框可能产生 ''/undefined，导致 NaN 渗透进计算
function finiteOrZero(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function finiteOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * 单笔贷款计算
 * @param {number} principalWan 本金（万元）
 * @param {number} years 年限
 * @param {number} annualRatePercent 年利率（百分数，例如 3.05 表示 3.05%）
 * @param {'equalPrincipalInterest'|'equalPrincipal'} payType
 * @returns {{ monthly:number, lastMonth:number|null, totalPay:number, totalInt:number, months:number }}
 */
export function calcLoan(principalWan, years, annualRatePercent, payType) {
  const p = finiteOrZero(principalWan) * WAN
  const n = finiteOrZero(years) * MONTHS_PER_YEAR
  const r = finiteOrZero(annualRatePercent) / 100 / MONTHS_PER_YEAR

  // 边界修复：本金或期数为 0/负数时不再产生 NaN/Infinity
  if (p <= 0 || n <= 0) {
    return { monthly: 0, lastMonth: 0, totalPay: 0, totalInt: 0, months: n }
  }

  if (payType === PAY_TYPE.INTEREST) {
    // 修复：旧版 r === 0 时分母为 0 得到 NaN
    if (r === 0) {
      const monthly = p / n
      return {
        monthly,
        lastMonth: null,
        totalPay: monthly * n,
        totalInt: monthly * n - p,
        months: n
      }
    }
    const factor = Math.pow(1 + r, n)
    const monthly = (p * r * factor) / (factor - 1)
    const totalPay = monthly * n
    return {
      monthly,
      lastMonth: null,
      totalPay,
      totalInt: totalPay - p,
      months: n
    }
  }

  const base = p / n
  let remain = p
  let totalInt = 0
  let first = 0
  let last = 0
  for (let i = 0; i < n; i++) {
    const interest = remain * r
    const monthlyPay = base + interest
    totalInt += interest
    remain -= base
    if (i === 0) first = monthlyPay
    if (i === n - 1) last = monthlyPay
  }
  return {
    monthly: first,
    lastMonth: last,
    totalPay: p + totalInt,
    totalInt,
    months: n
  }
}

/**
 * 根据完整配置计算整笔房贷的拆分明细与月供
 * @param {object} settings 结构同 DEFAULT_SETTINGS
 * @returns {object}
 */
export function computeResult(settings = {}) {
  const s = { ...DEFAULT_SETTINGS, ...settings }

  const housePrice = finiteOr(s.housePrice, DEFAULT_SETTINGS.housePrice)
  const downRate = finiteOr(s.downRate, DEFAULT_SETTINGS.downRate)
  const fundAmt = finiteOr(s.fundAmt, DEFAULT_SETTINGS.fundAmt)
  const loanYear = finiteOr(s.loanYear, DEFAULT_SETTINGS.loanYear)
  const lprVal = finiteOr(s.lprVal, DEFAULT_SETTINGS.lprVal)
  const bpVal = finiteOr(s.bpVal, DEFAULT_SETTINGS.bpVal)
  const comRateDirect = finiteOr(s.comRateDirect, DEFAULT_SETTINGS.comRateDirect)
  const fundRate = finiteOr(s.fundRate, DEFAULT_SETTINGS.fundRate)
  const monthSalary = finiteOr(s.monthSalary, DEFAULT_SETTINGS.monthSalary)
  const monthPreTaxSalary = finiteOr(s.monthPreTaxSalary, DEFAULT_SETTINGS.monthPreTaxSalary)
  const monthGjj = finiteOr(s.monthGjj, DEFAULT_SETTINGS.monthGjj)
  const payMode = s.payMode === PAY_TYPE.PRINCIPAL ? PAY_TYPE.PRINCIPAL : PAY_TYPE.INTEREST
  const rateMode =
    s.rateMode === RATE_MODE.LPR || s.rateMode === RATE_MODE.DIRECT
      ? s.rateMode
      : DEFAULT_SETTINGS.rateMode

  const totalLoanW = housePrice * (1 - downRate / 100)
  const downW = (housePrice * downRate) / 100
  const comW = Math.max(0, totalLoanW - fundAmt)
  const comRate = rateMode === RATE_MODE.LPR ? lprVal + bpVal / 100 : comRateDirect

  const fundLoan = calcLoan(fundAmt, loanYear, fundRate, payMode)
  const comLoan = calcLoan(comW, loanYear, comRate, payMode)
  const fundMonthly = fundLoan.monthly
  const comMonthly = comLoan.monthly
  const origin = fundMonthly + comMonthly

  // 公积金冲抵顺序不可变：先公积金月供，再商贷月供
  let remainGjj = monthGjj
  const gjjUsedFund = Math.min(remainGjj, fundMonthly)
  remainGjj -= gjjUsedFund
  const gjjUsedCom = Math.min(remainGjj, comMonthly)
  const selfPay = Math.max(0, origin - gjjUsedFund - gjjUsedCom)

  const rateOrigin = monthSalary > 0 ? (origin / monthSalary) * 100 : null
  const rateSelf = monthSalary > 0 ? (selfPay / monthSalary) * 100 : null
  const ratePreTax = monthPreTaxSalary > 0 ? (origin / monthPreTaxSalary) * 100 : null
  const totalInterestW = (fundLoan.totalInt + comLoan.totalInt) / WAN

  return {
    comRate,
    totalLoanW,
    downW,
    comW,
    fundW: fundAmt,
    comMonthly,
    fundMonthly,
    origin,
    gjjUsedFund,
    gjjUsedCom,
    selfPay,
    rateOrigin,
    rateSelf,
    ratePreTax,
    totalInterestW,
    fundLoan,
    comLoan,
    months: loanYear * MONTHS_PER_YEAR
  }
}

/**
 * 生成「加入对比」用的快照对象
 * @param {object} settings 结构同 DEFAULT_SETTINGS
 * @param {object} result computeResult 的返回值
 * @returns {object}
 */
export function buildCompareItem(settings, result) {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const payType = s.payMode === PAY_TYPE.PRINCIPAL ? '等额本金' : '等额本息'

  return {
    housePrice: round2Value(s.housePrice),
    downRate: round2Value(s.downRate),
    down: round2Value(result.downW),
    loanTotal: round2Value(result.totalLoanW),
    fund: round2Value(s.fundAmt),
    com: round2Value(result.comW),
    year: round2Value(s.loanYear),
    payType,
    comRate: round2Value(result.comRate),
    fundRate: round2Value(s.fundRate),
    originPay: round2Value(result.origin),
    selfPay: round2Value(result.selfPay),
    rateOrigin: result.rateOrigin === null || result.rateOrigin === undefined ? '--' : round2Value(result.rateOrigin),
    rateSelf: result.rateSelf === null || result.rateSelf === undefined ? '--' : round2Value(result.rateSelf),
    ratePreTax: result.ratePreTax === null || result.ratePreTax === undefined ? '--' : round2Value(result.ratePreTax),
    totalInt: round2Value(result.totalInterestW)
  }
}

function round2Value(n) {
  const v = Number(n)
  return Number.isFinite(v) ? Number(v.toFixed(2)) : 0
}
