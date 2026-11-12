import test from 'node:test'
import assert from 'node:assert/strict'

import { PAY_TYPE, RATE_MODE } from '../src/core/constants.js'
import { calcLoan, computeResult, buildCompareItem, solveMaxHousePrice, MAX_PRICE_W } from '../src/core/calc.js'
import { fmtMoney, fmtMoneyPlain, fmtPercent, fmtWan, round2 } from '../src/core/format.js'

const COMBO_SETTINGS = {
  housePrice: 300,
  downRate: 15,
  fundAmt: 60,
  loanYear: 30,
  lprVal: 3.5,
  bpVal: -45,
  comRateDirect: 3.05,
  fundRate: 2.6,
  monthSalary: 30000,
  monthGjj: 4000,
  rateMode: RATE_MODE.LPR,
  payMode: PAY_TYPE.INTEREST
}

function closeTo(actual, expected, relative = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= Math.abs(expected) * relative,
    `期望 ${expected}，实际 ${actual}`
  )
}

test('等额本息: 100万/30年/4.9%', () => {
  // 参考公式精确值为 5307.2672；任务书中的 5313.4~5313.6 与 4.9% 组合不符，按源公式取真实值
  const res = calcLoan(100, 30, 4.9, PAY_TYPE.INTEREST)
  assert.ok(res.monthly > 5307.2 && res.monthly < 5307.4, `monthly=${res.monthly}`)
  closeTo(res.totalPay, res.monthly * 360, 1e-6)
  closeTo(res.totalInt, res.totalPay - 1e6, 1e-6)
  assert.equal(res.months, 360)
  assert.equal(res.lastMonth, null)
})

test('等额本金: 100万/30年/4.9%', () => {
  const interest = calcLoan(100, 30, 4.9, PAY_TYPE.INTEREST)
  const res = calcLoan(100, 30, 4.9, PAY_TYPE.PRINCIPAL)
  const expectedFirst = 1000000 / 360 + (1000000 * 0.049) / 12
  closeTo(res.monthly, expectedFirst, 1e-6)
  assert.ok(res.lastMonth < res.monthly)
  assert.ok(res.totalInt < interest.totalInt)
  closeTo(res.totalPay, 1e6 + res.totalInt, 1e-9)
})

test('等额本息 r === 0 时月供为 p/n，不再出现 NaN', () => {
  const res = calcLoan(100, 30, 0, PAY_TYPE.INTEREST)
  assert.equal(res.monthly, 1000000 / 360)
  assert.equal(res.totalInt, 0)
  assert.ok(Number.isFinite(res.totalPay))
})

test('本金/年限为 0 或负数时全部归零且保持有限', () => {
  const cases = [
    [0, 30, 4.9],
    [100, 0, 4.9],
    [-100, 30, 4.9],
    [100, -30, 4.9],
    [100, 30, 0]
  ]
  for (const [principal, years, rate] of cases) {
    for (const payType of [PAY_TYPE.INTEREST, PAY_TYPE.PRINCIPAL]) {
      const res = calcLoan(principal, years, rate, payType)
      const finite =
        Number.isFinite(res.monthly) &&
        Number.isFinite(res.totalPay) &&
        Number.isFinite(res.totalInt) &&
        Number.isFinite(res.months)
      assert.ok(finite, `存在非有限数: ${JSON.stringify(res)}`)
      if (principal <= 0 || years <= 0) {
        assert.equal(res.monthly, 0)
        assert.equal(res.lastMonth, 0)
        assert.equal(res.totalPay, 0)
        assert.equal(res.totalInt, 0)
      }
    }
  }
})

test('非有限数输入归零处理', () => {
  for (const bad of [NaN, Infinity, 'undefined', null]) {
    const res = calcLoan(bad, 30, 4.9, PAY_TYPE.INTEREST)
    assert.equal(res.monthly, 0)
    assert.equal(res.totalPay, 0)
    assert.equal(res.totalInt, 0)
    assert.ok(Number.isFinite(res.months))
  }
})

test('computeResult 组合贷拆分', () => {
  const res = computeResult(COMBO_SETTINGS)
  assert.equal(res.totalLoanW, 255)
  assert.equal(res.downW, 45)
  assert.equal(res.comW, 195)
  closeTo(res.comRate, 3.05, 1e-12)
  assert.equal(res.fundW, 60)
  assert.equal(res.months, 360)
  assert.deepEqual(res.fundLoan, calcLoan(60, 30, 2.6, PAY_TYPE.INTEREST))
  assert.deepEqual(res.comLoan, calcLoan(195, 30, 3.05, PAY_TYPE.INTEREST))
  closeTo(res.origin, res.fundMonthly + res.comMonthly, 1e-12)
  closeTo(res.totalInterestW, (res.fundLoan.totalInt + res.comLoan.totalInt) / 10000, 1e-12)
})

test('公积金冲抵: 完全覆盖 / 部分覆盖 / 超额', () => {
  const base = computeResult({ ...COMBO_SETTINGS, monthGjj: 0 })
  const { origin, fundMonthly, comMonthly } = base

  const full = computeResult({ ...COMBO_SETTINGS, monthGjj: origin + 100 })
  assert.equal(full.selfPay, 0)
  assert.equal(full.gjjUsedFund, fundMonthly)
  assert.equal(full.gjjUsedCom, Math.min(origin - fundMonthly, comMonthly))
  assert.ok(full.selfPay >= 0)

  const partial = computeResult({ ...COMBO_SETTINGS, monthGjj: fundMonthly + comMonthly / 2 })
  assert.equal(partial.gjjUsedFund, fundMonthly)
  closeTo(partial.gjjUsedCom, comMonthly / 2, 1e-12)
  closeTo(partial.selfPay, comMonthly / 2, 1e-12)
  assert.ok(partial.selfPay > 0)

  const over = computeResult({ ...COMBO_SETTINGS, monthGjj: origin * 1.5 })
  assert.equal(over.selfPay, 0)
  assert.ok(over.selfPay >= 0)
})

test('公积金贷款超过贷款总额时按总额封顶，不放大利息', () => {
  const settings = { ...COMBO_SETTINGS, housePrice: 100, downRate: 15, fundAmt: 500 }
  const res = computeResult(settings)

  assert.equal(res.totalLoanW, 85)
  assert.equal(res.fundW, 85)
  assert.equal(res.comW, 0)
  closeTo(res.origin, calcLoan(85, settings.loanYear, settings.fundRate, settings.payMode).monthly, 1e-12)

  const uncappedMonthly = calcLoan(500, settings.loanYear, settings.fundRate, settings.payMode).monthly
  assert.ok(res.origin < uncappedMonthly)
})

test('公积金贷款为负数时归零，商贷不被放大', () => {
  const res = computeResult({ ...COMBO_SETTINGS, fundAmt: -100 })

  assert.equal(res.fundW, 0)
  assert.equal(res.comW, res.totalLoanW)
  closeTo(res.origin, calcLoan(res.totalLoanW, COMBO_SETTINGS.loanYear, res.comRate, COMBO_SETTINGS.payMode).monthly, 1e-12)
})

test('对比项的公积金金额取实际生效值', () => {
  const settings = { ...COMBO_SETTINGS, housePrice: 100, downRate: 15, fundAmt: 500 }
  const item = buildCompareItem(settings, computeResult(settings))
  assert.equal(item.fund, 85)
  assert.equal(item.com, 0)
  assert.equal(item.loanTotal, 85)
})

test('salary = 0 时占比为 null', () => {
  const res = computeResult({ ...COMBO_SETTINGS, monthSalary: 0 })
  assert.equal(res.rateOrigin, null)
  assert.equal(res.rateSelf, null)
})

test('salary > 0 时占比按税后收入计算', () => {
  const res = computeResult(COMBO_SETTINGS)
  closeTo(res.rateOrigin, (res.origin / 30000) * 100, 1e-12)
  closeTo(res.rateSelf, (res.selfPay / 30000) * 100, 1e-12)
})

test('税前收入决定银行偿贷比，且以原月供为准', () => {
  const res = computeResult({ ...COMBO_SETTINGS, monthPreTaxSalary: 40000 })
  closeTo(res.ratePreTax, (res.origin / 40000) * 100, 1e-12)
  assert.ok(res.ratePreTax < res.rateOrigin)
  assert.ok(res.ratePreTax > res.rateSelf)
})

test('未填税前收入时 bankRatio 为 null', () => {
  assert.equal(computeResult(COMBO_SETTINGS).ratePreTax, null)
  assert.equal(computeResult({ ...COMBO_SETTINGS, monthPreTaxSalary: -1 }).ratePreTax, null)
})

test('bankRatio 与税前收入无关，只取决于月供', () => {
  const low = computeResult({ ...COMBO_SETTINGS, monthPreTaxSalary: 20000 })
  const high = computeResult({ ...COMBO_SETTINGS, monthPreTaxSalary: 80000 })
  assert.ok(low.ratePreTax > high.ratePreTax)
  assert.equal(low.origin, high.origin)
})

test('等额本金模式下 origin 取首月月供', () => {
  const res = computeResult({ ...COMBO_SETTINGS, payMode: PAY_TYPE.PRINCIPAL })
  assert.equal(res.fundLoan.lastMonth < res.fundLoan.monthly, true)
  assert.equal(res.comLoan.lastMonth < res.comLoan.monthly, true)
  closeTo(res.origin, res.fundLoan.monthly + res.comLoan.monthly, 1e-12)
  const interestMode = computeResult({ ...COMBO_SETTINGS, payMode: PAY_TYPE.INTEREST })
  assert.ok(res.origin > interestMode.origin)
})

test('computeResult 忽略 loanType', () => {
  const withTab = computeResult({ ...COMBO_SETTINGS, loanType: 'fund' })
  const withoutTab = computeResult(COMBO_SETTINGS)
  assert.deepEqual(withTab, withoutTab)
})

test('buildCompareItem 字段与中文 payType', () => {
  const res = computeResult(COMBO_SETTINGS)
  const item = buildCompareItem(COMBO_SETTINGS, res)
  assert.deepEqual(Object.keys(item), [
    'housePrice', 'downRate', 'down', 'loanTotal', 'fund', 'com', 'year', 'payType',
    'comRate', 'fundRate', 'originPay', 'selfPay',
    'rateOrigin', 'rateSelf', 'ratePreTax', 'totalInt'
  ])
  assert.equal(item.payType, '等额本息')
  assert.equal(item.down, 45)
  assert.equal(item.loanTotal, 255)
  assert.equal(item.com, 195)
  assert.equal(item.originPay, round2(res.origin))
  assert.equal(typeof item.rateOrigin, 'number')
  assert.equal(item.ratePreTax, '--')

  for (const sensitive of ['salary', 'preTaxSalary', 'gjjMonth']) {
    assert.equal(sensitive in item, false, `对比项不应包含敏感字段 ${sensitive}`)
  }

  const principal = buildCompareItem({ ...COMBO_SETTINGS, payMode: PAY_TYPE.PRINCIPAL }, computeResult({ ...COMBO_SETTINGS, payMode: PAY_TYPE.PRINCIPAL }))
  assert.equal(principal.payType, '等额本金')

  const noSalary = buildCompareItem({ ...COMBO_SETTINGS, monthSalary: 0 }, computeResult({ ...COMBO_SETTINGS, monthSalary: 0 }))
  assert.equal(noSalary.rateOrigin, '--')
  assert.equal(noSalary.rateSelf, '--')

  const withPreTax = buildCompareItem({ ...COMBO_SETTINGS, monthPreTaxSalary: 40000 }, computeResult({ ...COMBO_SETTINGS, monthPreTaxSalary: 40000 }))
  assert.equal(typeof withPreTax.ratePreTax, 'number')
})

test('totalPayW 等于总贷款 + 总利息', () => {
  const res = computeResult(COMBO_SETTINGS)
  closeTo(res.totalPayW, res.totalLoanW + res.totalInterestW, 1e-9)
})

test('solveMaxHousePrice 反解回原房价', () => {
  const res = computeResult(COMBO_SETTINGS)
  const solved = solveMaxHousePrice(res.origin, COMBO_SETTINGS)
  assert.ok(Math.abs(solved - COMBO_SETTINGS.housePrice) <= 0.01, `反解房价=${solved}`)
})

test('solveMaxHousePrice 随目标月供单调不减', () => {
  const low = solveMaxHousePrice(6000, COMBO_SETTINGS)
  const high = solveMaxHousePrice(9000, COMBO_SETTINGS)
  assert.ok(high >= low, `high=${high} low=${low}`)
  assert.ok(high > low)
})

test('solveMaxHousePrice 非法目标月供返回 0', () => {
  for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(solveMaxHousePrice(bad, COMBO_SETTINGS), 0, `输入 ${bad}`)
  }
})

test('solveMaxHousePrice 目标超出测算上限时返回 MAX_PRICE_W', () => {
  assert.equal(MAX_PRICE_W, 10000)
  assert.equal(solveMaxHousePrice(1e9, COMBO_SETTINGS), MAX_PRICE_W)
})

test('solveMaxHousePrice 尊重贷款年限：20 年可买房价低于 30 年', () => {
  const p30 = solveMaxHousePrice(8000, COMBO_SETTINGS)
  const p20 = solveMaxHousePrice(8000, { ...COMBO_SETTINGS, loanYear: 20 })
  assert.ok(p20 < p30, `20年=${p20} 30年=${p30}`)
})

test('solveMaxHousePrice 反解结果的月供不超过目标', () => {
  const target = 8000
  const solved = solveMaxHousePrice(target, COMBO_SETTINGS)
  const actual = computeResult({ ...COMBO_SETTINGS, housePrice: solved }).origin
  assert.ok(actual <= target + 1e-6, `实际月供=${actual} 目标=${target}`)
})

test('format 工具', () => {
  assert.equal(fmtMoney(5313.449), '5,313.45')
  assert.equal(fmtMoney(-1234567.891), '-1,234,567.89')
  assert.equal(fmtMoney(NaN), '--')
  assert.equal(fmtMoneyPlain(5313.449), '5313.45')
  assert.equal(fmtMoneyPlain(Infinity), '--')
  assert.equal(fmtPercent(3.05), '3.05%')
  assert.equal(fmtPercent(null), '--')
  assert.equal(fmtPercent(undefined), '--')
  assert.equal(fmtWan(300), '300 万')
  assert.equal(fmtWan(NaN), '0 万')
  assert.equal(round2(1.005), 1)
  assert.equal(round2('2.345'), 2.35)
  assert.equal(round2(NaN), 0)
})
