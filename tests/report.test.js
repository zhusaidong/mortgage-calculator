import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAmortization } from '../src/core/amortize.js'
import { computeResult } from '../src/core/calc.js'
import { fmtMoney } from '../src/core/format.js'
import {
  loanTypeLabel,
  payTypeLabel,
  formatReportTime,
  reportFileBase,
  buildReportModel
} from '../src/utils/report.js'

const FIXTURE = {
  housePrice: 300,
  downRate: 15,
  fundAmt: 60,
  loanYear: 30,
  lprVal: 3.5,
  bpVal: -45,
  fundRate: 2.6,
  monthSalary: 30000,
  monthPreTaxSalary: 40000,
  monthGjj: 4000,
  rateMode: 'lpr',
  payMode: 'equalPrincipalInterest',
  loanType: 'combo'
}

const NOW = new Date(2026, 10, 12, 9, 5)
const RESULT = computeResult(FIXTURE)
const SCHEDULE = buildAmortization(FIXTURE)
const MODEL = buildReportModel(FIXTURE, RESULT, SCHEDULE, NOW)

test('贷款类型与还款方式文案映射含兜底', () => {
  assert.equal(loanTypeLabel('combo'), '组合贷款')
  assert.equal(loanTypeLabel('commercial'), '商业贷款')
  assert.equal(loanTypeLabel('fund'), '公积金贷款')
  assert.equal(loanTypeLabel('unknown'), '组合贷款')
  assert.equal(payTypeLabel('equalPrincipal'), '等额本金')
  assert.equal(payTypeLabel('equalPrincipalInterest'), '等额本息')
  assert.equal(payTypeLabel(), '等额本息')
})

test('formatReportTime 输出本地补零时间', () => {
  assert.equal(formatReportTime(NOW), '2026-11-12 09:05')
  assert.equal(formatReportTime(new Date(2026, 0, 2, 3, 4)), '2026-01-02 03:04')
})

test('reportFileBase 生成带时间戳的文件名', () => {
  assert.equal(reportFileBase(NOW), '房贷测算报告_2026-11-12_09-05')
})

test('测算参数顺序、数量与格式固定', () => {
  assert.equal(MODEL.params.length, 12)
  assert.deepEqual(
    MODEL.params.map((item) => item.label),
    [
      '房屋总价(万)',
      '首付比例',
      '首付金额(万)',
      '贷款总额(万)',
      '公积金贷款(万)',
      '商业贷款(万)',
      '贷款年限(年)',
      '商贷利率',
      '公积金利率',
      '公积金月缴存(元)',
      '税后月收入(元)',
      '税前月收入(元)'
    ]
  )
  assert.equal(MODEL.params[0].value, '300.00 万')
  assert.equal(MODEL.params[1].value, '15.0%')
  assert.equal(MODEL.params[6].value, '30 年')
  assert.equal(MODEL.params[9].value, '¥4,000.00')
})

test('核心指标与计算引擎结果一致', () => {
  const monthly = MODEL.metrics.find((item) => item.label === '每月应还(元)')
  assert.equal(monthly.value, `¥${fmtMoney(RESULT.origin)}`)
  assert.equal(monthly.tone, 'primary')

  const interest = MODEL.metrics.find((item) => item.label === '总利息')
  assert.equal(interest.value, `¥${fmtMoney(RESULT.totalInterestW * 10000)}`)
  assert.equal(interest.tone, 'warning')

  const totalPay = MODEL.metrics.find((item) => item.label === '总还款')
  assert.equal(totalPay.value, `¥${fmtMoney(RESULT.totalPayW * 10000)}`)

  const selfPay = MODEL.metrics.find((item) => item.label === '抵扣后自付(元)')
  assert.equal(selfPay.value, `¥${fmtMoney(RESULT.selfPay)}`)
})

test('未填写收入时月供占比显示 --', () => {
  const settings = { ...FIXTURE, monthSalary: 0, monthPreTaxSalary: 0 }
  const result = computeResult(settings)
  const schedule = buildAmortization(settings)
  const model = buildReportModel(settings, result, schedule, NOW)

  assert.equal(model.metrics.find((item) => item.label === '月供占税后').value, '--')
  assert.equal(model.metrics.find((item) => item.label === '银行偿贷比').value, '--')
})

test('还款方式对比包含两种模式且总额正确', () => {
  assert.equal(MODEL.comparisons.length, 2)
  const [interest, principal] = MODEL.comparisons

  assert.equal(interest.mode, 'equalPrincipalInterest')
  assert.equal(interest.label, '等额本息')
  assert.equal(principal.mode, 'equalPrincipal')
  assert.equal(principal.label, '等额本金')

  const expectedInterest = computeResult({ ...FIXTURE, payMode: 'equalPrincipalInterest' })
  const expectedPrincipal = computeResult({ ...FIXTURE, payMode: 'equalPrincipal' })

  assert.equal(interest.firstPay, expectedInterest.origin)
  assert.equal(interest.lastPay, expectedInterest.origin)
  assert.equal(interest.totalInterest, expectedInterest.totalInterestW * 10000)
  assert.equal(interest.totalPay, expectedInterest.totalPayW * 10000)

  assert.equal(principal.firstPay, expectedPrincipal.origin)
  assert.equal(
    principal.lastPay,
    Number(expectedPrincipal.fundLoan.lastMonth) + Number(expectedPrincipal.comLoan.lastMonth)
  )
  assert.equal(principal.totalInterest, expectedPrincipal.totalInterestW * 10000)
  assert.ok(principal.lastPay < principal.firstPay)
})

test('年度数据透传摊销结果', () => {
  assert.equal(MODEL.years, SCHEDULE.years)
  assert.equal(MODEL.years.length, FIXTURE.loanYear)
  assert.ok(MODEL.years[0].year === 1)
})

test('总额结构与摊销汇总一致', () => {
  assert.equal(MODEL.totals.principal, SCHEDULE.totals.principal)
  assert.equal(MODEL.totals.interest, SCHEDULE.totals.interest)
  assert.equal(MODEL.totals.pay, SCHEDULE.totals.pay)
  assert.equal(MODEL.totals.selfPay, SCHEDULE.totals.selfPay)
})

test('等额本金指标包含首月与末月应还', () => {
  const settings = { ...FIXTURE, payMode: 'equalPrincipal' }
  const result = computeResult(settings)
  const schedule = buildAmortization(settings)
  const model = buildReportModel(settings, result, schedule, NOW)

  assert.equal(model.payMode, 'equalPrincipal')
  assert.equal(model.payTypeLabel, '等额本金')
  assert.equal(model.metrics[0].label, '首月应还(元)')

  const last = model.metrics.find((item) => item.label === '末月应还(元)')
  const expectedLast = Number(result.fundLoan.lastMonth) + Number(result.comLoan.lastMonth)
  assert.ok(last)
  assert.equal(last.value, `¥${fmtMoney(expectedLast)}`)
})

test('report.js 在 Node 环境导入不抛错且无 DOM 依赖', () => {
  assert.equal(typeof buildReportModel, 'function')
  assert.equal(typeof document, 'undefined')
})
