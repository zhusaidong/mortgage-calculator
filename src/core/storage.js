import {
  STORAGE_KEY_SETTING,
  STORAGE_KEY_COMPARE,
  DEFAULT_SETTINGS,
  RATE_MODE,
  PAY_TYPE
} from './constants.js'

export { STORAGE_KEY_SETTING, STORAGE_KEY_COMPARE }

const BUSINESS_FIELDS = Object.keys(DEFAULT_SETTINGS)
const NUMERIC_FIELDS = BUSINESS_FIELDS.filter((key) => typeof DEFAULT_SETTINGS[key] === 'number')
const RATE_MODES = new Set(Object.values(RATE_MODE))
const PAY_MODES = new Set(Object.values(PAY_TYPE))

// SSR / 隐私模式 / 禁用存储时安全返回，绝不抛错
function getStorage() {
  try {
    const ls = globalThis.localStorage
    return ls && typeof ls.getItem === 'function' ? ls : null
  } catch (e) {
    return null
  }
}

function defaultSettings() {
  return { ...DEFAULT_SETTINGS }
}

// 空字符串 Number('') === 0，属于旧版输入遗留，按非法值处理
function toNumberOr(value, fallback) {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string' && value.trim() === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function hasStoredSettings() {
  const ls = getStorage()
  if (!ls) return false
  try {
    return ls.getItem(STORAGE_KEY_SETTING) !== null
  } catch (e) {
    return false
  }
}

/** 读取设置；损坏数据或缺失字段回退默认值 */
export function loadSettings() {
  const result = defaultSettings()
  const ls = getStorage()
  if (!ls) return result

  let raw
  try {
    raw = ls.getItem(STORAGE_KEY_SETTING)
  } catch (e) {
    return result
  }
  if (raw === null || raw === undefined) return result

  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return result
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return result

  for (const key of BUSINESS_FIELDS) {
    if (!(key in data)) continue
    const value = data[key]
    if (NUMERIC_FIELDS.includes(key)) {
      result[key] = toNumberOr(value, DEFAULT_SETTINGS[key])
    } else if (key === 'rateMode') {
      result.rateMode = RATE_MODES.has(value) ? value : DEFAULT_SETTINGS.rateMode
    } else if (key === 'payMode') {
      result.payMode = PAY_MODES.has(value) ? value : DEFAULT_SETTINGS.payMode
    }
  }
  return result
}

/** 只持久化业务字段，派生值不入库 */
export function saveSettings(settings) {
  const ls = getStorage()
  if (!ls) return
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) }
  const data = {}
  for (const key of BUSINESS_FIELDS) data[key] = s[key]
  try {
    ls.setItem(STORAGE_KEY_SETTING, JSON.stringify(data))
  } catch (e) {
    // 配额超限等场景静默降级
  }
}

/** 读取对比列表；损坏或非数组返回 [] */
export function loadCompareList() {
  const ls = getStorage()
  if (!ls) return []
  let raw
  try {
    raw = ls.getItem(STORAGE_KEY_COMPARE)
  } catch (e) {
    return []
  }
  if (!raw) return []
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return []
  }
  return Array.isArray(data) ? data : []
}

export function saveCompareList(list) {
  const ls = getStorage()
  if (!ls) return
  try {
    ls.setItem(STORAGE_KEY_COMPARE, JSON.stringify(Array.isArray(list) ? list : []))
  } catch (e) {
    // 静默降级
  }
}

export function clearCompareList() {
  const ls = getStorage()
  if (!ls) return
  try {
    ls.removeItem(STORAGE_KEY_COMPARE)
  } catch (e) {
    // 静默降级
  }
}
