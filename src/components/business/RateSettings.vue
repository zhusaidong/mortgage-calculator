<template>
  <div class="rate-settings">
    <SegmentedTabs
      :model-value="settings.rateMode"
      :options="rateModeOptions"
      @update:model-value="v => settings.rateMode = v"
    />

    <div v-if="settings.rateMode === 'lpr'" class="panel">
      <div class="field-grid">
        <NumberField
          label="5年期以上LPR"
          unit="%"
          step="0.01"
          :model-value="settings.lprVal"
          @update:model-value="v => settings.lprVal = toNum(v)"
        />
        <NumberField
          label="加点"
          unit="bp"
          step="1"
          placeholder="如 -45"
          :model-value="settings.bpVal"
          @update:model-value="v => settings.bpVal = toNum(v)"
        />
      </div>

      <QuickButtons v-model="settings.bpVal" :options="bpOptions" size="sm" class="bp-quick" />

      <div class="info-line">
        <span>商贷实际年利率</span>
        <span class="highlight">{{ ready ? result.comRate.toFixed(2) + '%' : '--' }}</span>
      </div>
    </div>

    <div v-else class="panel">
      <NumberField
        label="商贷年利率"
        unit="%"
        step="0.001"
        :model-value="settings.comRateDirect"
        @update:model-value="v => settings.comRateDirect = toNum(v)"
      />
    </div>
  </div>
</template>

<script setup>
import SegmentedTabs from '../ui/SegmentedTabs.vue'
import NumberField from '../ui/NumberField.vue'
import QuickButtons from '../ui/QuickButtons.vue'

const props = defineProps({
  settings: { type: Object, required: true },
  result: { type: Object, required: true },
  ready: { type: Boolean, default: false }
})

// 共享 settings 约定同上：直接改 props.settings，不做 emit 回传
function toNum(v) {
  return v === '' ? 0 : Number(v)
}

const rateModeOptions = [
  { value: 'lpr', label: 'LPR + 加点' },
  { value: 'direct', label: '直接输入利率' }
]

const bpOptions = [
  { value: -60, label: '-60bp' },
  { value: -45, label: '-45bp' },
  { value: -30, label: '-30bp' },
  { value: 0, label: '0bp' },
  { value: 20, label: '+20bp' }
]
</script>

<style scoped>
.panel {
  margin-top: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.bp-quick {
  margin-top: 12px;
}

.panel .info-line {
  margin-top: 12px;
}

@media (max-width: 480px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
