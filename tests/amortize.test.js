import test from 'node:test'
import assert from 'node:assert/strict'

import { PAY_TYPE, RATE_MODE } from '../src/core/constants.js'
import { calcLoan, computeResult } from '../src/core/calc.js'
import { buildLoanSchedule, buildAmortization } from '../src/core/amortize.js'

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

function sumBy(rows, key) {
  return rows.reduce((acc, row) => acc + row[key], 0)
}

function assertFiniteTree(value, path = 'root') {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} 出现非有限数 ${value}`)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertFiniteTree(item, `${path}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) assertFiniteTree(item, `${path}.${key}`)
  }
}

test('等额本息单笔: 360 行，本金利息合计正确，末月剩余本金为 0', () => {
  const rows = buildLoanSchedule(100, 30, 4.9, PAY_TYPE.INTEREST)
  const ref = calcLoan(100, 30, 4.9, PAY_TYPE.INTEREST)

  assert.equal(rows.length, 360)
  rows.forEach((row, i) => assert.equal(row.month, i + 1))
  closeTo(sumBy(rows, 'principal'), 1000000, 1e-9)
  closeTo(sumBy(rows, 'interest'), ref.totalInt, 1e-9)
  closeTo(sumBy(rows, 'pay'), ref.totalPay, 1e-9)
  assert.equal(rows.at(-1).remain, 0)
  for (const row of rows) {
    assert.ok(row.remain >= 0, `remain=${row.remain}`)
    assert.ok(row.principal > 0, `principal=${row.principal}`)
  }
})

test('等额本金: 首末月月供对齐 calcLoan，月供递减，总利息低于等额本息', () => {
  const rows = buildLoanSchedule(100, 30, 4.9, PAY_TYPE.PRINCIPAL)
  const ref = calcLoan(100, 30, 4.9, PAY_TYPE.PRINCIPAL)

  assert.equal(rows.length, 360)
  closeTo(rows[0].pay, ref.monthly, 1e-9)
  closeTo(rows.at(-1).pay, ref.lastMonth, 1e-9)
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].pay <= rows[i - 1].pay + 1e-9, `第 ${i + 1} 月月供上升`)
  }
  closeTo(sumBy(rows, 'principal'), 1000000, 1e-9)
  closeTo(sumBy(rows, 'interest'), ref.totalInt, 1e-9)
  assert.equal(rows.at(-1).remain, 0)

  const equalInterest = buildLoanSchedule(100, 30, 4.9, PAY_TYPE.INTEREST)
  assert.ok(sumBy(rows, 'interest') < sumBy(equalInterest, 'interest'))
})

test('等额本息整笔对账: totals 与 computeResult 一致（组合贷）', () => {
  const res = computeResult(COMBO_SETTINGS)
  const plan = buildAmortization(COMBO_SETTINGS)

  assert.ok(res.fundW > 0 && res.comW > 0)
  assert.equal(plan.rows.length, 360)
  closeTo(plan.totals.pay, res.totalPayW * 10000, 1e-9)
  closeTo(plan.totals.interest, res.totalInterestW * 10000, 1e-9)
  closeTo(plan.totals.principal, res.totalLoanW * 10000, 1e-9)
})

test('等额本金整笔对账: totals 与 computeResult 一致（组合贷）', () => {
  const settings = { ...COMBO_SETTINGS, payMode: PAY_TYPE.PRINCIPAL }
  const res = computeResult(settings)
  const plan = buildAmortization(settings)

  assert.equal(plan.rows.length, 360)
  closeTo(plan.totals.pay, res.totalPayW * 10000, 1e-9)
  closeTo(plan.totals.interest, res.totalInterestW * 10000, 1e-9)
  closeTo(plan.totals.principal, res.totalLoanW * 10000, 1e-9)
})

test('零利率: 月供为 p/n，利息为 0，不出现 NaN', () => {
  for (const payType of [PAY_TYPE.INTEREST, PAY_TYPE.PRINCIPAL]) {
    const rows = buildLoanSchedule(100, 30, 0, payType)
    assert.equal(rows.length, 360)
    closeTo(sumBy(rows, 'principal'), 1000000, 1e-9)
    assert.equal(sumBy(rows, 'interest'), 0)
    assert.equal(rows.at(-1).remain, 0)
    closeTo(rows[0].pay, 1000000 / 360, 1e-9)
    for (const row of rows) {
      assert.ok(Number.isFinite(row.pay))
      assert.ok(Number.isFinite(row.remain))
    }
  }
})

test('空场景: 零贷款或零年限返回空数组与零合计', () => {
  const cases = [
    { housePrice: 0 },
    { housePrice: 300, downRate: 100 },
    { housePrice: 300, loanYear: 0 }
  ]
  for (const settings of cases) {
    const plan = buildAmortization(settings)
    assert.deepEqual(plan.rows, [])
    assert.deepEqual(plan.years, [])
    assert.deepEqual(plan.totals, { pay: 0, principal: 0, interest: 0, gjjOffset: 0, selfPay: 0 })
  }

  assert.deepEqual(buildLoanSchedule(0, 30, 4.9, PAY_TYPE.INTEREST), [])
  assert.deepEqual(buildLoanSchedule(100, 0, 4.9, PAY_TYPE.INTEREST), [])
  assert.deepEqual(buildLoanSchedule(NaN, NaN, NaN, PAY_TYPE.INTEREST), [])
})

test('公积金冲抵: 抵扣 + 自付 = 月供，全额覆盖时自付为 0', () => {
  const partial = buildAmortization({ ...COMBO_SETTINGS, monthGjj: 3000 })
  closeTo(partial.totals.gjjOffset + partial.totals.selfPay, partial.totals.pay, 1e-9)
  for (const row of partial.rows) {
    assert.ok(row.selfPay >= 0, `selfPay=${row.selfPay}`)
    assert.ok(row.gjjOffset >= 0, `gjjOffset=${row.gjjOffset}`)
  }

  const origin = computeResult(COMBO_SETTINGS).origin
  const full = buildAmortization({ ...COMBO_SETTINGS, monthGjj: origin + 1 })
  for (const row of full.rows) assert.equal(row.selfPay, 0)
  closeTo(full.totals.gjjOffset, full.totals.pay, 1e-9)
  assert.equal(full.totals.selfPay, 0)
})

test('gjjOffset 与 computeResult 的 gjjUsedFund + gjjUsedCom 一致', () => {
  for (const payMode of [PAY_TYPE.INTEREST, PAY_TYPE.PRINCIPAL]) {
    const settings = { ...COMBO_SETTINGS, monthGjj: 3000, payMode }
    const res = computeResult(settings)
    const plan = buildAmortization(settings)

    closeTo(plan.rows[0].gjjOffset, res.gjjUsedFund + res.gjjUsedCom, 1e-9)
    closeTo(plan.rows[0].selfPay, res.selfPay, 1e-9)

    // 等额本息每月月供固定，整期抵扣额应等于单月抵扣额 × 期数
    if (payMode === PAY_TYPE.INTEREST) {
      closeTo(plan.totals.gjjOffset, (res.gjjUsedFund + res.gjjUsedCom) * res.months, 1e-9)
    }
  }
})

test('年度聚合: 每年 12 个月，合计一致，末年剩余本金为 0', () => {
  const plan = buildAmortization(COMBO_SETTINGS)

  assert.equal(plan.years.length, COMBO_SETTINGS.loanYear)
  plan.years.forEach((item, i) => assert.equal(item.year, i + 1))
  for (let i = 0; i < plan.years.length; i++) {
    const chunk = plan.rows.slice(i * 12, (i + 1) * 12)
    assert.equal(chunk.length, 12)
    closeTo(plan.years[i].pay, sumBy(chunk, 'pay'), 1e-9)
    closeTo(plan.years[i].principal, sumBy(chunk, 'principal'), 1e-9)
    closeTo(plan.years[i].interest, sumBy(chunk, 'interest'), 1e-9)
    closeTo(plan.years[i].gjjOffset, sumBy(chunk, 'gjjOffset'), 1e-9)
    closeTo(plan.years[i].selfPay, sumBy(chunk, 'selfPay'), 1e-9)
    assert.equal(plan.years[i].remain, chunk.at(-1).remain)
  }
  assert.equal(plan.years.at(-1).remain, 0)
  closeTo(sumBy(plan.years, 'pay'), plan.totals.pay, 1e-9)
})

test('每行满足 pay === principal + interest 且分项可加总', () => {
  for (const payMode of [PAY_TYPE.INTEREST, PAY_TYPE.PRINCIPAL]) {
    const plan = buildAmortization({ ...COMBO_SETTINGS, payMode })
    for (const row of plan.rows) {
      closeTo(row.pay, row.principal + row.interest, 1e-9)
      closeTo(row.pay, row.fundPay + row.comPay, 1e-9)
      closeTo(row.principal, row.fundPrincipal + row.comPrincipal, 1e-9)
      closeTo(row.interest, row.fundInterest + row.comInterest, 1e-9)
      assert.ok(row.remain >= 0, `remain=${row.remain}`)
    }
  }
})

test('剩余本金逐月递减，末月精确为 0', () => {
  for (const payMode of [PAY_TYPE.INTEREST, PAY_TYPE.PRINCIPAL]) {
    const plan = buildAmortization({ ...COMBO_SETTINGS, payMode })
    for (let i = 1; i < plan.rows.length; i++) {
      assert.ok(plan.rows[i].remain <= plan.rows[i - 1].remain + 1e-9, `第 ${i + 1} 月剩余本金上升`)
    }
    assert.equal(plan.rows.at(-1).remain, 0)
    assert.equal(plan.years.at(-1).remain, 0)
  }
})

test('公积金封顶: 商贷为 0 时合并计划等于纯公积金计划', () => {
  const settings = { ...COMBO_SETTINGS, housePrice: 100, downRate: 15, fundAmt: 500 }
  const res = computeResult(settings)
  const plan = buildAmortization(settings)

  assert.equal(res.comW, 0)
  assert.equal(res.fundW, 85)
  closeTo(plan.totals.pay, res.totalPayW * 10000, 1e-9)
  for (const row of plan.rows) {
    assert.equal(row.comPay, 0)
    assert.equal(row.comPrincipal, 0)
    assert.equal(row.comInterest, 0)
  }
})

test('非有限设置不产生 NaN/Infinity', () => {
  const plan = buildAmortization({
    housePrice: NaN,
    downRate: Infinity,
    fundAmt: null,
    loanYear: 'undefined',
    lprVal: NaN,
    bpVal: -Infinity,
    comRateDirect: 'x',
    fundRate: Infinity,
    monthGjj: NaN,
    payMode: 'bogus'
  })

  assert.ok(plan.rows.length > 0)
  assertFiniteTree(plan)
})

test('非有限输入的单笔计划按空结果处理', () => {
  for (const bad of [NaN, Infinity, -Infinity, 'undefined', null]) {
    assert.deepEqual(buildLoanSchedule(bad, 30, 4.9, PAY_TYPE.INTEREST), [])
    assert.deepEqual(buildLoanSchedule(100, bad, 4.9, PAY_TYPE.INTEREST), [])
  }
})
