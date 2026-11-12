<template>
  <div class="report-actions">
    <button class="btn report-print-btn" type="button" @click="handlePrint">打印 / PDF</button>
    <button class="btn report-image-btn" type="button" @click="handleImage">导出长图</button>
  </div>
</template>

<script setup>
import { buildAmortization } from '../../core/amortize.js'
import { buildReportModel } from '../../utils/report.js'
import { downloadReportImage } from '../../utils/reportImage.js'

const props = defineProps({
  settings: { type: Object, required: true },
  result: { type: Object, required: true }
})

function handlePrint() {
  if (typeof window === 'undefined' || typeof window.print !== 'function') return
  window.print()
}

function handleImage() {
  if (!props.settings || !props.result) return
  const schedule = buildAmortization(props.settings)
  const model = buildReportModel(props.settings, props.result, schedule)
  downloadReportImage(model)
}
</script>

<style scoped>
.report-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.report-actions .btn {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  font-size: 14px;
}
</style>
