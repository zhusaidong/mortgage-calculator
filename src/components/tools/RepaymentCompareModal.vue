<template>
  <Teleport to="body">
    <div v-if="modelValue" class="repay-overlay" @click.self="close">
      <div class="repay-panel" role="dialog" aria-modal="true" aria-labelledby="repay-title">
        <header class="repay-head">
          <h2 id="repay-title" class="repay-title">两种还款方式对比</h2>
          <button class="btn btn-sm" type="button" @click="close">关闭</button>
        </header>

        <div class="repay-table-wrap">
          <table class="repay-table">
            <thead>
              <tr>
                <th class="col-label" scope="col">对比项</th>
                <th class="col-num" scope="col">{{ interestLabel }}</th>
                <th class="col-num" scope="col">{{ principalLabel }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="col-label">首月月供</td>
                <td class="col-num">¥{{ fmtMoney(interest.origin) }}</td>
                <td class="col-num">¥{{ fmtMoney(principal.origin) }}</td>
              </tr>
              <tr>
                <td class="col-label">末月月供</td>
                <td class="col-num">¥{{ fmtMoney(interest.origin) }}</td>
                <td class="col-num">¥{{ fmtMoney(principalLastMonth) }}</td>
              </tr>
              <tr>
                <td class="col-label">支付利息</td>
                <td class="col-num" :class="{ 'is-win': winner === 'interest' }">
                  ¥{{ fmtMoney(interestInterest) }}
                </td>
                <td class="col-num" :class="{ 'is-win': winner === 'principal' }">
                  ¥{{ fmtMoney(principalInterest) }}
                </td>
              </tr>
              <tr>
                <td class="col-label">本息合计</td>
                <td class="col-num" :class="{ 'is-win': winner === 'interest' }">
                  ¥{{ fmtMoney(interestTotalPay) }}
                </td>
                <td class="col-num" :class="{ 'is-win': winner === 'principal' }">
                  ¥{{ fmtMoney(principalTotalPay) }}
                </td>
              </tr>
              <tr>
                <td class="col-label">还款期数</td>
                <td class="col-num">{{ interest.months }}</td>
                <td class="col-num">{{ principal.months }}</td>
              </tr>
              <tr class="row-diff">
                <td class="col-label">利息差额</td>
                <td class="col-num">-</td>
                <td class="col-num col-diff">{{ diffText }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="repay-conclusion">{{ conclusion }}</p>

        <div class="repay-notes">
          <div class="repay-note">
            <p class="repay-note-title">等额本息</p>
            <p class="repay-note-body">月供从头到尾固定，前期压力小、现金流好规划，适合收入稳定的家庭；代价是总利息更多、前期还的多是利息。</p>
          </div>
          <div class="repay-note">
            <p class="repay-note-title">等额本金</p>
            <p class="repay-note-body">每月归还本金相同，月供逐月递减，总利息明显更少；代价是前期月供高出一大截，适合当前收入较高、或打算几年内提前还款的人。</p>
          </div>
        </div>

        <p class="repay-foot">基于当前贷款总额、利率与年限测算，仅供参考。</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { computeResult } from '../../core/calc.js'
import { PAY_TYPE } from '../../core/constants.js'
import { fmtMoney } from '../../core/format.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  settings: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue'])

// 强制两种还款方式各算一次，不使用 settings.payMode 的当前值
const interest = computed(() => computeResult({ ...props.settings, payMode: PAY_TYPE.INTEREST }))
const principal = computed(() => computeResult({ ...props.settings, payMode: PAY_TYPE.PRINCIPAL }))

const interestIsCurrent = computed(() => props.settings.payMode !== PAY_TYPE.PRINCIPAL)

const interestLabel = computed(() => (interestIsCurrent.value ? '等额本息（当前）' : '等额本息'))
const principalLabel = computed(() => (interestIsCurrent.value ? '等额本金' : '等额本金（当前）'))

// 等额本息每月固定，末月即同一个月供；等额本金末月需把两笔贷款各自的末月相加
const principalLastMonth = computed(() => {
  const fund = Number(principal.value.fundLoan?.lastMonth)
  const com = Number(principal.value.comLoan?.lastMonth)
  return (Number.isFinite(fund) ? fund : 0) + (Number.isFinite(com) ? com : 0)
})

const interestInterest = computed(() => interest.value.totalInterestW * 10000)
const principalInterest = computed(() => principal.value.totalInterestW * 10000)
const interestTotalPay = computed(() => interest.value.totalPayW * 10000)
const principalTotalPay = computed(() => principal.value.totalPayW * 10000)

// 差分约定：等额本金 − 等额本息；负数表示等额本金更省利息
const diff = computed(() => principalInterest.value - interestInterest.value)

const winner = computed(() => {
  if (diff.value < -0.005) return 'principal'
  if (diff.value > 0.005) return 'interest'
  return ''
})

const diffText = computed(() => {
  const value = diff.value
  if (Math.abs(value) < 0.005) return '¥0.00'
  if (value < 0) return `-¥${fmtMoney(Math.abs(value))}`
  return `+¥${fmtMoney(value)}`
})

const conclusion = computed(() => {
  const value = diff.value
  if (Math.abs(value) < 0.005) return '两种还款方式总利息相同'
  if (value < 0) return `等额本金比等额本息少付 ¥${fmtMoney(Math.abs(value))}`
  return `等额本金比等额本息多付 ¥${fmtMoney(value)}`
})

function close() {
  emit('update:modelValue', false)
}

let previousOverflow = ''
let bodyLocked = false

function lockBody() {
  if (bodyLocked || typeof document === 'undefined') return
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  bodyLocked = true
}

function unlockBody() {
  if (!bodyLocked || typeof document === 'undefined') return
  document.body.style.overflow = previousOverflow
  bodyLocked = false
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) lockBody()
    else unlockBody()
  },
  { immediate: true }
)

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown)
  unlockBody()
})
</script>

<style scoped>
.repay-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(16, 24, 40, .45);
  animation: repay-fade 140ms ease;
}

@keyframes repay-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.repay-panel {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: auto;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-pop);
}

.repay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.repay-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--c-text);
  letter-spacing: -0.01em;
}

.repay-table-wrap {
  overflow-x: auto;
}

.repay-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.repay-table th {
  padding: 9px 10px;
  border-bottom: 1px solid var(--c-border-soft);
  background: var(--c-border-soft);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-2);
  white-space: nowrap;
}

.repay-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--c-border-soft);
  color: var(--c-text);
}

.repay-table th.col-label,
.repay-table td.col-label {
  text-align: left;
  color: var(--c-text-2);
}

.repay-table th.col-num,
.repay-table td.col-num {
  text-align: right;
  white-space: nowrap;
}

.repay-table th.col-label {
  border-top-left-radius: var(--radius-sm);
}

.repay-table th:last-child {
  border-top-right-radius: var(--radius-sm);
}

.repay-table td.col-num.is-win {
  color: var(--c-success);
  font-weight: 600;
}

.repay-table tr.row-diff td {
  border-top: 1px solid var(--c-border);
  border-bottom: none;
  padding-top: 11px;
  font-weight: 600;
}

.repay-table .col-diff {
  color: var(--c-success);
}

.repay-conclusion {
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
}

.repay-notes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 16px;
}

.repay-note-title {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
}

.repay-note-body {
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-text-3);
}

.repay-foot {
  margin-top: 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-text-3);
}

@media (max-width: 480px) {
  .repay-panel {
    padding: 16px;
  }

  .repay-table {
    font-size: 13px;
  }

  .repay-table th,
  .repay-table td {
    padding: 8px 6px;
  }

  .repay-table th {
    font-size: 12px;
  }

  .repay-notes {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
