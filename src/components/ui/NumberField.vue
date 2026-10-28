<template>
  <label :class="{ 'is-readonly': readonly }" class="number-field">
    <span v-if="label" class="nf-label">{{ label }}</span>
    <span v-if="labelTip" class="nf-label-tip">{{ labelTip }}</span>
    <span class="nf-control">
      <input
          :aria-label="ariaLabel || undefined"
          :class="{ 'has-unit': unit }"
          :inputmode="inputmode"
          :max="max"
          :min="min"
          :placeholder="placeholder"
          :readonly="readonly"
          :step="step"
          :value="modelValue"
          class="nf-input"
          type="number"
          @input="onInput"
      />
      <span v-if="unit" aria-hidden="true" class="nf-unit">{{ unit }}</span>
    </span>
  </label>
</template>

<script setup>
defineProps({
  modelValue: {type: [Number, String], default: ''},
  label: {type: String, default: ''},
  labelTip: {type: String, default: ''},
  unit: {type: String, default: ''},
  step: {type: [Number, String], default: 'any'},
  min: {type: [Number, String], default: undefined},
  max: {type: [Number, String], default: undefined},
  readonly: {type: Boolean, default: false},
  placeholder: {type: String, default: ''},
  inputmode: {type: String, default: 'decimal'},
  // 当字段旁已有独立的视觉标签、本组件不显示 label 时，用它保证可访问名称
  ariaLabel: {type: String, default: ''}
})

const emit = defineEmits(['update:modelValue'])

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<style scoped>
.number-field {
  display: block;
  width: 100%;
}

.nf-label {
  display: block;
  margin-bottom: 6px;
  color: var(--c-text-2);
  font-size: 14px;
  font-weight: 500;
}

.nf-label-tip {
  display: block;
  margin-bottom: 6px;
  color: var(--c-text-2);
  font-size: 10px;
  font-weight: 500;
}

.nf-control {
  position: relative;
  display: block;
}

.nf-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: 16px;
  line-height: 1.4;
  transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
  -webkit-appearance: none;
  appearance: none;
}

.nf-input::-webkit-outer-spin-button,
.nf-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.nf-input[type="number"] {
  -moz-appearance: textfield;
}

.nf-input::placeholder {
  color: var(--c-text-3);
}

.nf-input.has-unit {
  padding-right: 40px;
}

.nf-input:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: var(--focus-ring);
}

.nf-input[readonly] {
  background: #f7f8fa;
  color: var(--c-text-2);
  cursor: default;
}

.nf-input[readonly]:focus {
  border-color: var(--c-border);
  box-shadow: none;
}

.nf-unit {
  position: absolute;
  top: 50%;
  right: 12px;
  color: var(--c-text-3);
  font-size: 13px;
  transform: translateY(-50%);
  pointer-events: none;
}
</style>
