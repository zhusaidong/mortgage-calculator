<template>
  <div class="quick-buttons" :class="`size-${size}`">
    <button
      v-for="(option, index) in normalizedOptions"
      :key="index"
      class="qb-btn"
      :class="{ 'is-active': isActive(option.value) }"
      type="button"
      :aria-pressed="isActive(option.value)"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  options: { type: Array, default: () => [] },
  activeMatcher: { type: Function, default: null },
  size: { type: String, default: 'md' }
})

const emit = defineEmits(['update:modelValue'])

const normalizedOptions = computed(() =>
  props.options.map((option) => {
    if (option !== null && typeof option === 'object') {
      return {
        value: option.value,
        label: option.label !== undefined ? String(option.label) : String(option.value)
      }
    }
    return { value: option, label: String(option) }
  })
)

function isActive(optionValue) {
  if (typeof props.activeMatcher === 'function') {
    return Boolean(props.activeMatcher(optionValue, props.modelValue))
  }
  return optionValue == props.modelValue
}
</script>

<style scoped>
.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.qb-btn {
  min-height: 34px;
  padding: 7px 12px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-surface);
  color: var(--c-text-2);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  touch-action: manipulation;
  transition: background .16s ease, border-color .16s ease, color .16s ease;
}

.qb-btn:hover {
  border-color: #cfd8e3;
  color: var(--c-text);
}

.qb-btn.is-active {
  border-color: var(--c-primary);
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-weight: 600;
}

.qb-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.size-sm .qb-btn {
  min-height: 28px;
  padding: 5px 10px;
  font-size: 12px;
}
</style>
