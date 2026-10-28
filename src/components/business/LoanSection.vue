<template>
  <SectionCard title="贷款方案" icon="🏦">
    <!-- 贷款类型 tab 仅切换高亮：旧版从未接入计算，不得影响金额或禁用任何控件 -->
    <SegmentedTabs
      :model-value="loanType"
      :options="loanTypeOptions"
      @update:model-value="$emit('update:loanType', $event)"
    />

    <div class="fund-amt-block">
      <SliderField
        v-model="settings.fundAmt"
        label="公积金贷款（万元）"
        :min="0"
        :max="500"
        :step="1"
        unit="万"
        :value-text="`${settings.fundAmt} 万`"
      />
    </div>

    <div class="amount-grid">
      <NumberField label="商业贷款（万元）" unit="万" readonly :model-value="ready ? result.comW.toFixed(2) : ''" />
      <NumberField label="公积金贷款（万元）" unit="万" readonly :model-value="ready ? settings.fundAmt.toFixed(2) : ''" />
    </div>

    <div class="divider" />

    <RateSettings :settings="settings" :result="result" :ready="ready" />

    <TermSettings :settings="settings" />
  </SectionCard>
</template>

<script setup>
import SectionCard from '../ui/SectionCard.vue'
import SliderField from '../ui/SliderField.vue'
import NumberField from '../ui/NumberField.vue'
import SegmentedTabs from '../ui/SegmentedTabs.vue'
import RateSettings from './RateSettings.vue'
import TermSettings from './TermSettings.vue'

const props = defineProps({
  settings: { type: Object, required: true },
  result: { type: Object, required: true },
  loanType: { type: String, default: 'combo' },
  ready: { type: Boolean, default: false }
})

defineEmits(['update:loanType'])

// 直接改 props.settings.housePrice —— 该对象来自 reactive()，改动会触发全链重算。
// 这是有意为之的共享状态写法，不要改成 emit 逐字段回传。

const loanTypeOptions = [
  { value: 'combo', label: '组合贷款' },
  { value: 'commercial', label: '商业贷款' },
  { value: 'fund', label: '公积金贷款' }
]
</script>

<style scoped>
.fund-amt-block {
  margin-top: 16px;
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
