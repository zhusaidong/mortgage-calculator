<template>
  <Teleport to="body">
    <div v-if="modelValue" class="aff-overlay" @click.self="close">
      <div class="aff-panel" role="dialog" aria-modal="true" aria-labelledby="aff-title">
        <header class="aff-head">
          <h2 id="aff-title" class="aff-title">我能买多贵？</h2>
          <button class="btn btn-sm" type="button" @click="close">关闭</button>
        </header>

        <SegmentedTabs v-model="mode" :options="modeOptions" />

        <div class="aff-inputs">
          <NumberField
            v-if="mode === 'monthly'"
            v-model="monthlyInput"
            label="每月可承受月供"
            unit="元"
            :step="100"
            :min="0"
          />
          <template v-else>
            <NumberField
              v-model="ratioInput"
              label="偿贷比上限"
              unit="%"
              :step="1"
              :min="1"
              :max="100"
            />
            <p v-if="!hasPreTax" class="aff-muted">请先在左侧填写税前月收入</p>
            <p v-else class="aff-derived">
              月供上限 = 税前月收入 × 比例 = ¥{{ fmtMoney(targetMonthly) }}
            </p>
          </template>
        </div>

        <div class="aff-result">
          <p class="aff-hero-caption">可承受房价</p>
          <p class="aff-hero-value">{{ heroText }}</p>
          <p v-if="capNote" class="aff-muted">{{ capNote }}</p>
          <p v-if="lowNote" class="aff-muted">低于页面可调范围（50 万）</p>
        </div>

        <div v-if="valid" class="aff-breakdown">
          <div class="info-line">
            <span>首付（{{ props.settings.downRate }}%）</span>
            <span class="aff-row-value">{{ preview.downW.toFixed(2) }} 万</span>
          </div>
          <div class="info-line">
            <span>贷款总额</span>
            <span class="aff-row-value">{{ preview.totalLoanW.toFixed(2) }} 万</span>
          </div>
          <div class="info-line">
            <span>其中公积金</span>
            <span class="aff-row-value">{{ preview.fundW.toFixed(2) }} 万</span>
          </div>
          <div class="info-line">
            <span>其中商贷</span>
            <span class="aff-row-value">{{ preview.comW.toFixed(2) }} 万</span>
          </div>
          <div class="info-line">
            <span>实际月供</span>
            <span class="aff-row-value">¥{{ fmtMoney(preview.origin) }}</span>
          </div>
        </div>

        <p class="aff-foot">按当前首付比例、贷款利率、贷款年限与公积金贷款额测算，结果仅供参考。</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SegmentedTabs from '../ui/SegmentedTabs.vue'
import NumberField from '../ui/NumberField.vue'
import { fmtMoney } from '../../core/format.js'
import { solveMaxHousePrice, computeResult, MAX_PRICE_W } from '../../core/calc.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  settings: { type: Object, required: true }
})

const emit = defineEmits(['update:modelValue'])

const modeOptions = [
  { value: 'monthly', label: '按目标月供' },
  { value: 'ratio', label: '按审批红线' }
]

const mode = ref('monthly')
const monthlyInput = ref(8000)
const ratioInput = ref(50)

const hasPreTax = computed(() => Number(props.settings.monthPreTaxSalary) > 0)

const targetMonthly = computed(() => {
  if (mode.value === 'ratio') {
    if (!hasPreTax.value) return 0
    const ratio = Number(ratioInput.value)
    if (!Number.isFinite(ratio) || ratio <= 0) return 0
    return (Number(props.settings.monthPreTaxSalary) * ratio) / 100
  }
  const value = Number(monthlyInput.value)
  return Number.isFinite(value) && value > 0 ? value : 0
})

// 目标无效时 solver 返回 0，统一走 '--' 占位，避免 NaN 渗透到展示层
const housePrice = computed(() => solveMaxHousePrice(targetMonthly.value, props.settings))

const valid = computed(() => targetMonthly.value > 0 && housePrice.value > 0)

const preview = computed(() => computeResult({ ...props.settings, housePrice: housePrice.value }))

const heroText = computed(() => (valid.value ? `${housePrice.value.toFixed(1)} 万` : '--'))

// MAX_PRICE_W 是 solver 的哨兵值：命中说明目标月供在 1 亿元上限内仍可覆盖
const capNote = computed(() =>
  valid.value && housePrice.value === MAX_PRICE_W ? '目标超出 1 亿元测算上限' : ''
)

const lowNote = computed(() => (valid.value && housePrice.value < 50 ? '低于页面可调范围（50 万）' : ''))

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
.aff-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--c-overlay);
  animation: aff-fade 140ms ease;
}

@keyframes aff-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.aff-panel {
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow: auto;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: var(--c-surface);
  box-shadow: var(--shadow-pop);
}

.aff-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

.aff-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--c-text);
  letter-spacing: -0.01em;
}

.aff-inputs {
  margin-top: 14px;
}

.aff-derived {
  margin-top: 8px;
  font-size: 13px;
  color: var(--c-text-2);
  font-variant-numeric: tabular-nums;
}

.aff-muted {
  margin-top: 8px;
  font-size: 12px;
  color: var(--c-text-3);
}

.aff-result {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--c-border-soft);
}

.aff-hero-caption {
  font-size: 13px;
  color: var(--c-text-3);
}

.aff-hero-value {
  margin-top: 2px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.aff-breakdown {
  margin-top: 14px;
  padding-top: 6px;
  border-top: 1px dashed var(--c-border-soft);
}

.aff-breakdown .info-line {
  margin: 8px 0;
  font-size: 13px;
}

.aff-row-value {
  color: var(--c-text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.aff-foot {
  margin-top: 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-text-3);
}
</style>
