<template>
  <div class="term-settings">
    <div class="fund-rate-block">
      <span class="field-label">公积金年利率（%）</span>
      <QuickButtons v-model="settings.fundRate" :options="fundRateOptions" size="sm" />
      <NumberField
        class="fund-rate-input"
        aria-label="公积金年利率"
        unit="%"
        step="0.001"
        :model-value="settings.fundRate"
        @update:model-value="v => settings.fundRate = toNum(v)"
      />
    </div>

    <div class="year-block">
      <SliderField
        v-model="settings.loanYear"
        label="贷款年限"
        :min="5"
        :max="30"
        :step="1"
        unit="年"
        :value-text="`${settings.loanYear} 年 · ${settings.loanYear * 12} 期`"
      />
      <QuickButtons v-model="settings.loanYear" :options="yearOptions" class="year-quick" />
    </div>

    <SegmentedTabs
      class="pay-tabs"
      :model-value="settings.payMode"
      :options="payModeOptions"
      @update:model-value="v => settings.payMode = v"
    />
  </div>
</template>

<script setup>
import SliderField from '../ui/SliderField.vue'
import NumberField from '../ui/NumberField.vue'
import QuickButtons from '../ui/QuickButtons.vue'
import SegmentedTabs from '../ui/SegmentedTabs.vue'

const props = defineProps({ settings: { type: Object, required: true } })

// 共享 settings 约定同上：直接改 props.settings，不做 emit 回传
function toNum(v) {
  return v === '' ? 0 : Number(v)
}

const fundRateOptions = [
  { value: 2.6, label: '2.6%' },
  { value: 3.075, label: '3.075%' }
]

const yearOptions = [10, 15, 20, 25, 30].map((v) => ({ value: v, label: `${v}年` }))

const payModeOptions = [
  { value: 'equalPrincipalInterest', label: '等额本息' },
  { value: 'equalPrincipal', label: '等额本金' }
]
</script>

<style scoped>
/* 与上方利率设置块保持 20px 呼吸间距 */
.term-settings {
  margin-top: 20px;
}

.fund-rate-input {
  margin-top: 10px;
}

.year-block {
  margin-top: 20px;
}

.year-quick {
  margin-top: 10px;
}

.pay-tabs {
  margin-top: 20px;
}

@media (max-width: 480px) {
  .year-block,
  .pay-tabs {
    margin-top: 18px;
  }
}
</style>
