import test from 'node:test'
import assert from 'node:assert/strict'

import { PAY_TYPE, RATE_MODE } from '../src/core/constants.js'
import { calcLoan, computeResult, buildCompareItem } from '../src/core/calc.js'
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
    'comRate', 'fundRate', 'salary', 'gjjMonth', 'originPay', 'selfPay',
    'rateOrigin', 'rateSelf', 'totalInt'
  ])
  assert.equal(item.payType, '等额本息')
  assert.equal(item.down, 45)
  assert.equal(item.loanTotal, 255)
  assert.equal(item.com, 195)
  assert.equal(item.originPay, round2(res.origin))
  assert.equal(typeof item.rateOrigin, 'number')

  const principal = buildCompareItem({ ...COMBO_SETTINGS, payMode: PAY_TYPE.PRINCIPAL }, computeResult({ ...COMBO_SETTINGS, payMode: PAY_TYPE.PRINCIPAL }))
  assert.equal(principal.payType, '等额本金')

  const noSalary = buildCompareItem({ ...COMBO_SETTINGS, monthSalary: 0 }, computeResult({ ...COMBO_SETTINGS, monthSalary: 0 }))
  assert.equal(noSalary.rateOrigin, '--')
  assert.equal(noSalary.rateSelf, '--')
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
