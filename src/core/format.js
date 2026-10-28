// 展示层格式化工具（纯函数，不依赖 DOM）

/** 四舍五入到 2 位小数的 number；非有限数返回 0 */
export function round2(n) {
  const v = Number(n)
  return Number.isFinite(v) ? Number(v.toFixed(2)) : 0
}

/** 千分位金额，例如 '5,313.45'；非有限数返回 '--' */
export function fmtMoney(n, digits = 2) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '--'
  const fixed = v.toFixed(digits)
  const [intPart, decPart] = fixed.split('.')
  const sign = intPart.startsWith('-') ? '-' : ''
  const digitsOnly = sign ? intPart.slice(1) : intPart
  const grouped = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart === undefined ? sign + grouped : `${sign}${grouped}.${decPart}`
}

/** 无千分位金额（CSV / 存储用），例如 '5313.45'；非有限数返回 '--' */
export function fmtMoneyPlain(n, digits = 2) {
  const v = Number(n)
  return Number.isFinite(v) ? v.toFixed(digits) : '--'
}

/** 百分比，例如 '3.05%'；null/undefined/非有限数返回 '--' */
export function fmtPercent(n, digits = 2) {
  if (n === null || n === undefined) return '--'
  const v = Number(n)
  return Number.isFinite(v) ? `${v.toFixed(digits)}%` : '--'
}

/** 万元展示，例如 '300 万'；非法输入按 0 处理 */
export function fmtWan(n, digits = 0) {
  const v = Number(n)
  return `${(Number.isFinite(v) ? v : 0).toFixed(digits)} 万`
}
