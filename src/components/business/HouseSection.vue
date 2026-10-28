<template>
  <SectionCard title="房屋与首付" icon="🏠">
    <SliderField
      v-model="settings.housePrice"
      label="房屋总价（万元）"
      :min="50"
      :max="1000"
      :step="1"
      unit="万"
      :value-text="`${settings.housePrice} 万`"
    />

    <div class="rate-block">
      <SliderField
        v-model="settings.downRate"
        label="首付比例"
        :min="15"
        :max="50"
        :step="1"
        unit="%"
        :value-text="`${settings.downRate}%`"
      />
      <QuickButtons v-model="settings.downRate" :options="downRateOptions" />
    </div>

    <div class="amount-grid">
      <NumberField label="首付金额（万元）" unit="万" readonly :model-value="ready ? result.downW.toFixed(2) : ''" />
      <NumberField label="贷款总额（万元）" unit="万" readonly :model-value="ready ? result.totalLoanW.toFixed(2) : ''" />
    </div>
  </SectionCard>
</template>

<script setup>
import SectionCard from '../ui/SectionCard.vue'
import SliderField from '../ui/SliderField.vue'
import NumberField from '../ui/NumberField.vue'
import QuickButtons from '../ui/QuickButtons.vue'

const props = defineProps({
  settings: { type: Object, required: true },
  result: { type: Object, required: true },
  ready: { type: Boolean, default: false }
})

// 直接改 props.settings.housePrice —— 该对象来自 reactive()，改动会触发全链重算。
// 这是有意为之的共享状态写法，不要改成 emit 逐字段回传。

// value 保持数字，避免快捷按钮把字符串写回 settings
const downRateOptions = [15, 20, 30, 40, 50].map((v) => ({ value: v, label: `${v}%` }))
</script>

<style scoped>
.rate-block {
  margin-top: 14px;
  padding-top: 4px;
}

.rate-block > :last-child {
  margin-top: 10px;
}

.amount-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

@media (max-width: 480px) {
  .amount-grid {
    grid-template-columns: 1fr;
  }
}
</style>
