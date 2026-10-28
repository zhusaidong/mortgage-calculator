// 本地存储键（保持与旧版一致，兼容已有用户数据）
export const STORAGE_KEY_SETTING = 'loan_calc_setting'
export const STORAGE_KEY_COMPARE = 'loan_calc_compare'

// 还款方式
export const PAY_TYPE = {
  INTEREST: 'equalPrincipalInterest', // 等额本息
  PRINCIPAL: 'equalPrincipal' // 等额本金
}

// 商贷利率来源
export const RATE_MODE = { LPR: 'lpr', DIRECT: 'direct' }

// 贷款类型（旧版 tab 仅切换展示，不影响拆分计算）
export const LOAN_TYPE = { COMBO: 'combo', COMMERCIAL: 'commercial', FUND: 'fund' }

// 控件初值 ≠ 用户已录入：首屏是否出结果由 useLoanCalc 的 ready 决定，不要在此处“预填”出可算的数
export const DEFAULT_SETTINGS = {
  housePrice: 50,
  downRate: 15,
  fundAmt: 0,
  loanYear: 30,
  lprVal: 3.5,
  bpVal: -45,
  comRateDirect: 3.05,
  fundRate: 2.6,
  monthSalary: 0,
  monthPreTaxSalary: 0,
  monthGjj: 0,
  rateMode: RATE_MODE.LPR,
  payMode: PAY_TYPE.INTEREST
}

// 用于对比表转置视图的行定义，顺序与旧版一致
export const COMPARE_FIELDS = [
  ['housePrice', '房屋总价(万)'],
  ['downRate', '首付比例'],
  ['down', '首付(万)'],
  ['loanTotal', '总贷款(万)'],
  ['fund', '公积金贷(万)'],
  ['com', '商贷(万)'],
  ['year', '年限'],
  ['payType', '还款方式'],
  ['comRate', '商贷利率'],
  ['fundRate', '公积金利率'],
  ['originPay', '原月供/首月(元)'],
  ['selfPay', '抵扣后自付(元)'],
  ['rateOrigin', '原月供占税后'],
  ['rateSelf', '自付占税后'],
  ['ratePreTax', '银行偿贷比'],
  ['totalInt', '总利息(万)']
]

// 对比表中按百分比展示的字段
export const PERCENT_FIELDS = ['downRate', 'comRate', 'fundRate', 'rateOrigin', 'rateSelf', 'ratePreTax']
