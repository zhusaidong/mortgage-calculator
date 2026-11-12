<template>
  <SectionCard title="测算结果" icon="📊">
    <template v-if="ready">
      <div class="result-hero">
        <p class="hero-caption">{{ payCaption }}</p>
        <p class="hero-value">¥{{ fmtMoney(result.origin) }}</p>
        <p v-if="isEqualPrincipal" class="hero-last">末月 {{ fmtMoney(lastMonthTotal) }}</p>
      </div>

      <div class="result-lines">
        <div class="info-line">
          <span>月供构成</span>
          <span class="info-value">
            公积金 {{ fmtMoney(result.fundMonthly) }}｜商贷 {{ fmtMoney(result.comMonthly) }}
          </span>
        </div>
        <div class="info-line">
          <span>公积金抵扣后自付</span>
          <span class="info-value" :class="{ 'is-zero': result.selfPay === 0 }">
            ¥{{ fmtMoney(result.selfPay) }}
          </span>
        </div>
        <div class="info-line">
          <span>总利息</span>
          <span class="info-value">{{ result.totalInterestW.toFixed(2) }} 万</span>
        </div>
        <div class="info-line">
          <span>总还款</span>
          <span class="info-value">{{ result.totalPayW.toFixed(2) }} 万</span>
        </div>
      </div>

      <div class="result-ratios">
        <div class="info-line">
          <span>原月供占税后</span>
          <span class="info-value" :class="{ 'is-warn': warnOrigin }">
            {{ fmtPercent(result.rateOrigin, 1) }}
          </span>
        </div>
        <div class="info-line">
          <span>抵扣后自付占税后</span>
          <span class="info-value" :class="{ 'is-warn': warnSelf }">
            {{ fmtPercent(result.rateSelf, 1) }}
          </span>
        </div>
        <div class="info-line">
          <span>银行偿贷比（月供/税前）</span>
          <span class="info-value" :class="{ 'is-warn': warnPreTax }">
            {{ fmtPercent(result.ratePreTax, 1) }}
          </span>
        </div>
        <p v-if="ratioHint" class="ratio-hint" :class="{ 'is-warn': warnPreTax }">{{ ratioHint }}</p>
      </div>

      <div v-if="verdicts.length" class="verdict-block">
        <p class="verdict-title">偿还能力评估</p>
        <div v-for="item in verdicts" :key="item.key" class="verdict-row">
          <span class="verdict-mark" :class="`is-${item.level}`" aria-hidden="true">{{ MARK[item.level] }}</span>
          <span class="verdict-label">{{ item.label }}</span>
          <span class="verdict-value">{{ item.value }}</span>
          <span class="verdict-text" :class="`is-${item.level}`">{{ item.text }}</span>
        </div>
      </div>

      <button class="btn btn-primary add-btn" type="button" @click="emit('add')">+ 加入对比</button>
      <div class="tool-row">
        <button class="btn afford-btn" type="button" @click="emit('affordability')">我能买多贵？</button>
        <button class="btn compare-repay-btn" type="button" @click="emit('repayment-compare')">还款方式对比</button>
      </div>
      <ReportActions :settings="settings" :result="result" />

      <p class="result-note">
        公积金冲抵为估算模型：优先冲公积金月供，剩余冲商贷；各地公积金政策不同，仅预算参考。银行偿贷比按税前月收入计算，仅作审批参考。
      </p>
    </template>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../ui/SectionCard.vue'
import ReportActions from '../report/ReportActions.vue'
import { fmtMoney, fmtPercent } from '../../core/format.js'

const props = defineProps({
  result: { type: Object, required: true },
  settings: { type: Object, required: true },
  ready: { type: Boolean, default: false }
})

const emit = defineEmits(['add', 'affordability', 'repayment-compare'])

const MARK = { ok: '✓', warn: '!', danger: '✕' }

const isEqualPrincipal = computed(() => props.settings.payMode === 'equalPrincipal')

const payCaption = computed(() => (isEqualPrincipal.value ? '首月应还（元）' : '每月应还（元）'))

const lastMonthTotal = computed(() => {
  const fund = Number(props.result.fundLoan?.lastMonth)
  const com = Number(props.result.comLoan?.lastMonth)
  return (Number.isFinite(fund) ? fund : 0) + (Number.isFinite(com) ? com : 0)
})

const hasSalary = computed(() => Number(props.settings.monthSalary) > 0)
const hasPreTaxSalary = computed(() => Number(props.settings.monthPreTaxSalary) > 0)

const warnOrigin = computed(() => typeof props.result.rateOrigin === 'number' && props.result.rateOrigin >= 50)
const warnSelf = computed(() => typeof props.result.rateSelf === 'number' && props.result.rateSelf >= 50)
const warnPreTax = computed(() => typeof props.result.ratePreTax === 'number' && props.result.ratePreTax >= 50)

const ratioHint = computed(() => {
  if (warnPreTax.value) return '银行偿贷比超过 50%，可能影响贷款审批'
  if (!hasSalary.value && !hasPreTaxSalary.value) return '填写收入后可查看占比'
  if (!hasSalary.value) return '未填写税后收入'
  if (!hasPreTaxSalary.value) return '未填写税前收入'
  return ''
})

// 阈值：银行审批以 50% 偿贷比为红线，正好 50% 视为达标；税后占比 40% 以下舒适，50% 以上压力偏大
const verdicts = computed(() => {
  const list = []
  const rateOriginValue = props.result.rateOrigin
  const ratePreTaxValue = props.result.ratePreTax

  if (hasPreTaxSalary.value && typeof ratePreTaxValue === 'number') {
    const over = ratePreTaxValue > 50
    list.push({
      key: 'preTax',
      label: '银行偿贷比',
      value: fmtPercent(ratePreTaxValue, 1),
      level: over ? 'danger' : 'ok',
      text: over ? '超过 50% 审批红线' : '低于 50% 审批红线'
    })
  }

  if (hasSalary.value && typeof rateOriginValue === 'number') {
    let level = 'ok'
    let text = '舒适区间（<40%）'
    if (rateOriginValue > 50) {
      level = 'danger'
      text = '压力较大（>50%）'
    } else if (rateOriginValue >= 40) {
      level = 'warn'
      text = '偏紧（40%–50%）'
    }
    list.push({
      key: 'origin',
      label: '月供占税后',
      value: fmtPercent(rateOriginValue, 1),
      level,
      text
    })
  }

  return list
})
</script>

<style scoped>
.result-hero {
  padding: 2px 0 10px;
}

.hero-caption {
  margin-bottom: 2px;
  font-size: 13px;
  color: var(--c-text-3);
}

.hero-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.hero-last {
  margin-top: 4px;
  font-size: 13px;
  color: var(--c-text-3);
  font-variant-numeric: tabular-nums;
}

.result-lines,
.result-ratios {
  padding: 4px 0;
}

.result-ratios {
  border-top: 1px dashed var(--c-border-soft);
  margin-top: 4px;
}

.info-line {
  margin: 8px 0;
}

.info-value {
  max-width: 62%;
  text-align: right;
  color: var(--c-text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.info-value.is-zero {
  color: var(--c-success);
}

.info-value.is-warn {
  color: var(--c-warning);
  font-weight: 600;
}

.ratio-hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--c-text-3);
  text-align: right;
}

.ratio-hint.is-warn {
  color: var(--c-warning);
}

.verdict-block {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--c-border-soft);
}

.verdict-title {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--c-text-3);
}

.verdict-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  margin: 4px 0;
  font-size: 13px;
}

.verdict-mark {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.verdict-mark.is-ok,
.verdict-text.is-ok {
  color: var(--c-success);
}

.verdict-mark.is-warn,
.verdict-text.is-warn {
  color: var(--c-warning);
}

.verdict-mark.is-danger,
.verdict-text.is-danger {
  color: var(--c-danger);
}

.verdict-label {
  color: var(--c-text-2);
}

.verdict-value {
  color: var(--c-text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.verdict-text {
  font-size: 12px;
}

.add-btn {
  width: 100%;
  margin-top: 14px;
  min-height: 40px;
  font-size: 15px;
}

.afford-btn {
  width: 100%;
  min-height: 38px;
  font-size: 14px;
}

.tool-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.tool-row .btn {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 14px;
}

.result-note {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-text-3);
}
</style>
