<template>
  <SectionCard title="贷款方案" icon="🏦">
    <SegmentedTabs
      :model-value="activeLoanType"
      :options="loanTypeOptions"
      @update:model-value="settings.loanType = $event"
    />

    <div class="fund-amt-block" :data-loan-type="activeLoanType">
      <!-- 切换贷款类型不重置 settings.fundAmt：回到组合贷款时恢复用户此前的公积金拆分 -->
      <SliderField
        v-if="activeLoanType === LOAN_TYPE.COMBO"
        v-model="settings.fundAmt"
        label="公积金贷款（万元）"
        :min="0"
        :max="fundMaxW"
        :step="1"
        unit="万"
        :value-text="`${result.fundW} 万`"
      />
      <div v-else class="locked-split">
        <div class="locked-head">
          <span class="locked-label">贷款拆分（万元）</span>
          <span class="locked-value">{{ ready ? lockedSplitText : '--' }}</span>
        </div>
        <p class="locked-reason">{{ lockedReason }}</p>
      </div>
    </div>

    <div class="amount-grid">
      <NumberField label="商业贷款（万元）" unit="万" readonly :model-value="ready ? result.comW.toFixed(2) : ''" />
      <NumberField label="公积金贷款（万元）" unit="万" readonly :model-value="ready ? result.fundW.toFixed(2) : ''" />
    </div>

    <div class="divider" />

    <RateSettings :settings="settings" :result="result" :ready="ready" />

    <TermSettings :settings="settings" />
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../ui/SectionCard.vue'
import SliderField from '../ui/SliderField.vue'
import NumberField from '../ui/NumberField.vue'
import SegmentedTabs from '../ui/SegmentedTabs.vue'
import RateSettings from './RateSettings.vue'
import TermSettings from './TermSettings.vue'
import { LOAN_TYPE } from '../../core/constants.js'

const props = defineProps({
  settings: { type: Object, required: true },
  result: { type: Object, required: true },
  ready: { type: Boolean, default: false }
})

// 直接改 props.settings 上的字段 —— 该对象来自 reactive()，改动会触发全链重算。
// 这是有意为之的共享状态写法，不要改成 emit 逐字段回传。
const activeLoanType = computed(() =>
  props.settings.loanType === LOAN_TYPE.COMMERCIAL || props.settings.loanType === LOAN_TYPE.FUND
    ? props.settings.loanType
    : LOAN_TYPE.COMBO
)

const fundMaxW = computed(() => Math.max(0, Math.min(500, Math.floor(props.result.totalLoanW))))

const lockedReason = computed(() =>
  activeLoanType.value === LOAN_TYPE.COMMERCIAL
    ? '纯商业贷款：公积金贷款按 0 计算，全部为商贷'
    : '纯公积金贷款：全部按公积金贷款计算（实际额度受当地公积金中心上限约束）'
)

const lockedSplitText = computed(
  () => `公积金 ${props.result.fundW.toFixed(2)} · 商贷 ${props.result.comW.toFixed(2)}`
)

const loanTypeOptions = [
  { value: LOAN_TYPE.COMBO, label: '组合贷款' },
  { value: LOAN_TYPE.COMMERCIAL, label: '商业贷款' },
  { value: LOAN_TYPE.FUND, label: '公积金贷款' }
]
</script>

<style scoped>
.fund-amt-block {
  margin-top: 16px;
}

.locked-split {
  padding: 12px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface-2);
}

.locked-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.locked-label {
  color: var(--c-text-2);
  font-size: 14px;
  font-weight: 500;
}

.locked-value {
  color: var(--c-text);
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.locked-reason {
  margin: 6px 0 0;
  color: var(--c-text-3);
  font-size: 12px;
  line-height: 1.5;
}

.amount-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.divider {
  height: 1px;
  margin: 18px 0;
  background: var(--c-border-soft);
}

@media (max-width: 480px) {
  .amount-grid {
    grid-template-columns: 1fr;
  }
}
</style>
