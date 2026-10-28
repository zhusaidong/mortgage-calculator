export const CSV_HEADERS = [
  '序号',
  '房屋总价(万)',
  '首付比例',
  '首付(万)',
  '总贷款(万)',
  '公积金贷(万)',
  '商贷(万)',
  '年限',
  '还款方式',
  '商贷利率',
  '公积金利率',
  '税后月收入',
  '月公积金',
  '原月供(元)',
  '抵扣后自付(元)',
  '原月供占税后',
  '自付占税后',
  '总利息(万)'
]

// 百分比列：数值才拼 %，'--'（未填写收入）原样保留
function percentCell(value) {
  if (value === null || value === undefined || value === '') return '--'
  const n = Number(value)
  return Number.isFinite(n) ? `${value}%` : `${value}`
}

function plainCell(value) {
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

/** 生成带 UTF-8 BOM 的 CSV 文本（BOM 让 Excel 正确识别中文编码） */
export function buildCompareCsv(items) {
  const list = Array.isArray(items) ? items : []
  const rows = [
    CSV_HEADERS.join(','),
    ...list.map((item, index) =>
      [
        index + 1,
        plainCell(item.housePrice),
        percentCell(item.downRate),
        plainCell(item.down),
        plainCell(item.loanTotal),
        plainCell(item.fund),
        plainCell(item.com),
        plainCell(item.year),
        plainCell(item.payType),
        percentCell(item.comRate),
        percentCell(item.fundRate),
        plainCell(item.salary),
        plainCell(item.gjjMonth),
        plainCell(item.originPay),
        plainCell(item.selfPay),
        percentCell(item.rateOrigin),
        percentCell(item.rateSelf),
        plainCell(item.totalInt)
      ].join(',')
    )
  ]
  return '\uFEFF' + rows.join('\n')
}

/**
 * 触发浏览器下载
 * @returns {boolean} 是否成功触发下载
 */
export function downloadCompareCsv(items) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert('暂无方案可以导出')
    }
    return false
  }
  // 仅在此函数内触碰 DOM，保证模块在 Node 中可安全导入
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false

  const blob = new Blob([buildCompareCsv(list)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `房贷对比_${new Date().toLocaleDateString()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}
