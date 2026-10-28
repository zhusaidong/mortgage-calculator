import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  hasStoredSettings,
  loadSettings,
  saveSettings,
  loadCompareList,
  saveCompareList,
  clearCompareList,
  STORAGE_KEY_SETTING,
  STORAGE_KEY_COMPARE
} from '../src/core/storage.js'
import { DEFAULT_SETTINGS, PAY_TYPE, RATE_MODE } from '../src/core/constants.js'

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
    },
    clear() {
      data.clear()
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

test('缺少 localStorage 时 loadSettings 返回完整默认值', () => {
  globalThis.localStorage = undefined
  try {
    assert.deepEqual(loadSettings(), DEFAULT_SETTINGS)
  } finally {
    globalThis.localStorage = createLocalStorageMock()
  }
})

test('损坏 JSON 回退默认值', () => {
  globalThis.localStorage.setItem(STORAGE_KEY_SETTING, '{not-json')
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS)
})

test('非对象设置回退默认值', () => {
  globalThis.localStorage.setItem(STORAGE_KEY_SETTING, JSON.stringify([1, 2, 3]))
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS)
  globalThis.localStorage.setItem(STORAGE_KEY_SETTING, JSON.stringify('boom'))
  assert.deepEqual(loadSettings(), DEFAULT_SETTINGS)
})

test('已存部分字段，其余用默认值补齐', () => {
  globalThis.localStorage.setItem(
    STORAGE_KEY_SETTING,
    JSON.stringify({ housePrice: 500, loanYear: 20, payMode: PAY_TYPE.PRINCIPAL })
  )
  const settings = loadSettings()
  assert.equal(settings.housePrice, 500)
  assert.equal(settings.loanYear, 20)
  assert.equal(settings.payMode, PAY_TYPE.PRINCIPAL)
  assert.equal(settings.downRate, DEFAULT_SETTINGS.downRate)
  assert.equal(settings.rateMode, DEFAULT_SETTINGS.rateMode)
  assert.equal(settings.fundRate, DEFAULT_SETTINGS.fundRate)
})

test('字符串数字会被转换为 number，非法值回退默认', () => {
  globalThis.localStorage.setItem(
    STORAGE_KEY_SETTING,
    JSON.stringify({ housePrice: '450', downRate: 'abc', lprVal: '' })
  )
  const settings = loadSettings()
  assert.equal(settings.housePrice, 450)
  assert.equal(settings.downRate, DEFAULT_SETTINGS.downRate)
  assert.equal(settings.lprVal, DEFAULT_SETTINGS.lprVal)
})

test('saveSettings / loadSettings 往返一致且只写业务字段', () => {
  const input = {
    ...DEFAULT_SETTINGS,
    housePrice: 420,
    downRate: 20,
    fundAmt: 80,
    loanYear: 25,
    payMode: PAY_TYPE.PRINCIPAL,
    rateMode: RATE_MODE.DIRECT,
    monthly: 99999,
    derivedTotal: 1
  }
  saveSettings(input)
  assert.deepEqual(loadSettings(), {
    housePrice: 420,
    downRate: 20,
    fundAmt: 80,
    loanYear: 25,
    lprVal: DEFAULT_SETTINGS.lprVal,
    bpVal: DEFAULT_SETTINGS.bpVal,
    comRateDirect: DEFAULT_SETTINGS.comRateDirect,
    fundRate: DEFAULT_SETTINGS.fundRate,
    monthSalary: DEFAULT_SETTINGS.monthSalary,
    monthPreTaxSalary: DEFAULT_SETTINGS.monthPreTaxSalary,
    monthGjj: DEFAULT_SETTINGS.monthGjj,
    rateMode: RATE_MODE.DIRECT,
    payMode: PAY_TYPE.PRINCIPAL
  })
  const raw = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY_SETTING))
  assert.deepEqual(Object.keys(raw), Object.keys(DEFAULT_SETTINGS))
})

test('无 localStorage 时 saveSettings 不抛错', () => {
  globalThis.localStorage = undefined
  try {
    assert.doesNotThrow(() => saveSettings(DEFAULT_SETTINGS))
  } finally {
    globalThis.localStorage = createLocalStorageMock()
  }
})

test('compare 数据非数组时返回 []', () => {
  globalThis.localStorage.setItem(STORAGE_KEY_COMPARE, JSON.stringify({ a: 1 }))
  assert.deepEqual(loadCompareList(), [])
  globalThis.localStorage.setItem(STORAGE_KEY_COMPARE, 'broken')
  assert.deepEqual(loadCompareList(), [])
  globalThis.localStorage.setItem(STORAGE_KEY_COMPARE, JSON.stringify('str'))
  assert.deepEqual(loadCompareList(), [])
})

test('compare 列表读写与清空', () => {
  const list = [{ housePrice: 300, payType: '等额本息' }, { housePrice: 500, payType: '等额本金' }]
  saveCompareList(list)
  assert.deepEqual(loadCompareList(), list)
  clearCompareList()
  assert.deepEqual(loadCompareList(), [])
})

test('saveCompareList 写入非数组时存为空数组', () => {
  saveCompareList({ nope: true })
  assert.deepEqual(loadCompareList(), [])
})

test('storage 键常量被 re-export', () => {
  assert.equal(STORAGE_KEY_SETTING, 'loan_calc_setting')
  assert.equal(STORAGE_KEY_COMPARE, 'loan_calc_compare')
})

test('hasStoredSettings 区分首次访问与回访', () => {
  assert.equal(hasStoredSettings(), false)
  saveSettings(DEFAULT_SETTINGS)
  assert.equal(hasStoredSettings(), true)
})

test('hasStoredSettings 在无 localStorage 时返回 false', () => {
  globalThis.localStorage = undefined
  try {
    assert.equal(hasStoredSettings(), false)
  } finally {
    globalThis.localStorage = createLocalStorageMock()
  }
})
