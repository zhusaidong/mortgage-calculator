import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { LOAN_TYPE, PAY_TYPE, RATE_MODE, DEFAULT_SETTINGS } from '../src/core/constants.js'
import { computeResult, buildCompareItem } from '../src/core/calc.js'
import { loadSettings, saveSettings, STORAGE_KEY_SETTING } from '../src/core/storage.js'

const BASE = {
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

function createLocalStorageMock() {
  const data = new Map()
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    }
  }
}

const originalStorage = globalThis.localStorage

beforeEach(() => {
  globalThis.localStorage = createLocalStorageMock()
})

test.after(() => {
  globalThis.localStorage = originalStorage
})

test('组合贷款仍按 fundAmt 拆分，超出总额时封顶不放大', () => {
  const res = computeResult({ ...BASE, loanType: LOAN_TYPE.COMBO })
  assert.equal(res.fundW, 60)
  assert.equal(res.comW, res.totalLoanW - 60)

  const capped = computeResult({ ...BASE, loanType: LOAN_TYPE.COMBO, fundAmt: 500 })
  assert.equal(capped.fundW, capped.totalLoanW)
  assert.equal(capped.comW, 0)
})

test('商业贷款：公积金归零，全部计入商贷', () => {
  const res = computeResult({ ...BASE, loanType: LOAN_TYPE.COMMERCIAL })
  assert.equal(res.fundW, 0)
  assert.equal(res.comW, res.totalLoanW)
  assert.equal(res.fundMonthly, 0)
  assert.equal(res.origin, res.comMonthly)
})

test('公积金贷款：全部计入公积金，商贷归零', () => {
  const res = computeResult({ ...BASE, loanType: LOAN_TYPE.FUND })
  assert.equal(res.fundW, res.totalLoanW)
  assert.equal(res.comW, 0)
  assert.equal(res.comMonthly, 0)
  assert.equal(res.origin, res.fundMonthly)
})

test('纯商贷与纯公积金均忽略 fundAmt', () => {
  for (const type of [LOAN_TYPE.COMMERCIAL, LOAN_TYPE.FUND]) {
    const withFund = computeResult({ ...BASE, loanType: type, fundAmt: 80 })
    const zeroFund = computeResult({ ...BASE, loanType: type, fundAmt: 0 })
    assert.deepEqual(withFund, zeroFund, `${type} 不应受 fundAmt 影响`)
  }
})

test('非法或缺失 loanType 回退组合贷款', () => {
  const combo = computeResult({ ...BASE, loanType: LOAN_TYPE.COMBO })
  for (const bad of [undefined, null, '', 'nope', 123]) {
    assert.deepEqual(computeResult({ ...BASE, loanType: bad }), combo, `非法值 ${String(bad)}`)
  }
  const missing = computeResult(BASE)
  assert.equal(missing.loanType, LOAN_TYPE.COMBO)
  assert.deepEqual(missing, combo)
})

test('computeResult 返回值包含 loanType', () => {
  assert.equal(computeResult(BASE).loanType, LOAN_TYPE.COMBO)
  assert.equal(computeResult({ ...BASE, loanType: LOAN_TYPE.COMMERCIAL }).loanType, LOAN_TYPE.COMMERCIAL)
  assert.equal(computeResult({ ...BASE, loanType: LOAN_TYPE.FUND }).loanType, LOAN_TYPE.FUND)
})

test('纯商贷与纯公积金的 totalPayW 等于总贷款加总利息', () => {
  for (const type of [LOAN_TYPE.COMMERCIAL, LOAN_TYPE.FUND]) {
    const res = computeResult({ ...BASE, loanType: type })
    closeTo(res.totalPayW, res.totalLoanW + res.totalInterestW, 1e-9)
  }
})

test('buildCompareItem 随 loanType 调整 fund 与 com', () => {
  const commercialSettings = { ...BASE, loanType: LOAN_TYPE.COMMERCIAL }
  const commercial = buildCompareItem(commercialSettings, computeResult(commercialSettings))
  assert.equal(commercial.fund, 0)
  assert.equal(commercial.com, commercial.loanTotal)

  const fundSettings = { ...BASE, loanType: LOAN_TYPE.FUND }
  const fund = buildCompareItem(fundSettings, computeResult(fundSettings))
  assert.equal(fund.fund, fund.loanTotal)
  assert.equal(fund.com, 0)
})

test('storage: 往返保存后 loanType 保留', () => {
  saveSettings({ ...DEFAULT_SETTINGS, loanType: LOAN_TYPE.FUND })
  assert.equal(loadSettings().loanType, LOAN_TYPE.FUND)

  saveSettings({ ...DEFAULT_SETTINGS, loanType: LOAN_TYPE.COMMERCIAL })
  assert.equal(loadSettings().loanType, LOAN_TYPE.COMMERCIAL)
})

test('storage: 老存档缺少 loanType 读回 combo', () => {
  globalThis.localStorage.setItem(STORAGE_KEY_SETTING, JSON.stringify({ housePrice: 400, loanYear: 20 }))
  const settings = loadSettings()
  assert.equal(settings.loanType, LOAN_TYPE.COMBO)
  assert.equal(settings.housePrice, 400)
})

test('storage: 非法 loanType 回退 combo', () => {
  globalThis.localStorage.setItem(STORAGE_KEY_SETTING, JSON.stringify({ loanType: 'weird' }))
  assert.equal(loadSettings().loanType, LOAN_TYPE.COMBO)
})
