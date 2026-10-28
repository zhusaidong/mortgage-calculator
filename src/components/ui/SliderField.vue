<template>
  <div class="slider-field" :class="{ 'is-disabled': disabled }">
    <div class="slider-head">
      <span class="slider-label">{{ label }}</span>
      <span class="slider-value">{{ displayText }}</span>
    </div>

    <div class="slider-wrap">
      <div
        class="slider-tip"
        :class="{ 'is-visible': tooltipVisible }"
        :style="{ left: tipLeft }"
        aria-hidden="true"
      >{{ tooltipText }}</div>

      <input
        class="slider-input"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="normalized"
        :disabled="disabled"
        :aria-label="label"
        :style="{ '--slider-pct': pctPercent }"
        @input="onInput"
        @pointerdown="onPointerDown"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  label: { type: String, default: '' },
  valueText: { type: String, default: '' },
  unit: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const dragging = ref(false)
const keyboardActive = ref(false)

const normalized = computed(() => normalize(props.modelValue))

const displayText = computed(() => props.valueText || `${normalized.value}${props.unit}`)

const tooltipText = computed(() => `${normalized.value}${props.unit}`)

const pct = computed(() => {
  const span = props.max - props.min
  if (!Number.isFinite(span) || span <= 0) return 0
  return Math.min(1, Math.max(0, (normalized.value - props.min) / span))
})

const pctPercent = computed(() => `${(pct.value * 100).toFixed(2)}%`)

const tipLeft = computed(() => {
  const offset = 9 - pct.value * 18
  return `calc(${(pct.value * 100).toFixed(2)}% + ${offset.toFixed(2)}px)`
})

const tooltipVisible = computed(() => dragging.value || keyboardActive.value)

function normalize(value) {
  const min = Number.isFinite(props.min) ? props.min : 0
  const max = Number.isFinite(props.max) ? props.max : 100
  const step = Number.isFinite(props.step) && props.step > 0 ? props.step : 1
  let next = Number(value)

  if (!Number.isFinite(next)) next = min
  next = Math.min(max, Math.max(min, next))

  const steps = Math.round((next - min) / step)
  next = min + steps * step
  next = Math.round(next * 1e9) / 1e9

  return Math.min(max, Math.max(min, next))
}

function onInput(event) {
  const next = normalize(event.target.value)
  dragging.value = true
  event.target.value = String(next)
  emit('update:modelValue', next)
}

function onPointerDown() {
  dragging.value = true
}

function onFocus() {
  keyboardActive.value = false
}

function onKeydown() {
  if (props.disabled) return
  keyboardActive.value = true
}

function onBlur() {
  dragging.value = false
  keyboardActive.value = false
}

function stopDrag() {
  dragging.value = false
}

onMounted(() => {
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
  window.addEventListener('touchend', stopDrag)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
  window.removeEventListener('touchend', stopDrag)
})
</script>

<style scoped>
.slider-field {
  width: 100%;
}

.slider-field.is-disabled {
  opacity: .45;
}

.slider-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
}

.slider-label {
  color: var(--c-text-2);
  font-size: 14px;
  font-weight: 500;
}

.slider-value {
  color: var(--c-primary);
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.slider-wrap {
  position: relative;
  padding-top: 24px;
}

.slider-tip {
  position: absolute;
  top: 0;
  z-index: 2;
  padding: 4px 9px;
  border-radius: var(--radius-sm);
  background: var(--c-primary);
  box-shadow: var(--shadow-pop);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-50%, 4px);
  transition: opacity .15s ease, transform .15s ease;
}

.slider-tip::after {
  content: "";
  position: absolute;
  bottom: -4px;
  left: 50%;
  border-top: 4px solid var(--c-primary);
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
  transform: translateX(-50%);
}

.slider-tip.is-visible {
  opacity: 1;
  transform: translate(-50%, 0);
}

.slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 32px;
  margin: 0;
  background: transparent;
  accent-color: var(--c-primary);
  cursor: pointer;
  touch-action: pan-y;
}

.slider-input:disabled {
  cursor: not-allowed;
}

.slider-input::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--c-primary) 0%,
    var(--c-primary) var(--slider-pct, 0%),
    #e6ebf2 var(--slider-pct, 0%),
    #e6ebf2 100%
  );
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -6px;
  border: 2px solid var(--c-primary);
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(16, 24, 40, .2);
  transition: transform .15s ease, box-shadow .15s ease;
}

.slider-input:active::-webkit-slider-thumb {
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(43, 123, 206, .35);
}

.slider-input:focus-visible {
  outline: none;
}

.slider-input:focus-visible::-webkit-slider-thumb {
  box-shadow: var(--focus-ring), 0 1px 4px rgba(16, 24, 40, .2);
}

.slider-input::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: #e6ebf2;
}

.slider-input::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: var(--c-primary);
}

.slider-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border: 2px solid var(--c-primary);
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(16, 24, 40, .2);
  transition: transform .15s ease, box-shadow .15s ease;
}

.slider-input:focus-visible::-moz-range-thumb {
  box-shadow: var(--focus-ring), 0 1px 4px rgba(16, 24, 40, .2);
}
</style>
