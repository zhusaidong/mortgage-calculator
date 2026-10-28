<template>
  <div class="segmented" :class="{ 'is-block': block }" role="tablist">
    <button
      v-for="(option, index) in options"
      :key="option.value"
      :ref="el => setTabRef(el, index)"
      class="seg-item"
      :class="{ 'is-active': option.value === modelValue }"
      type="button"
      role="tab"
      :aria-selected="option.value === modelValue"
      :tabindex="option.value === modelValue ? 0 : -1"
      @click="select(option)"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  block: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const tabRefs = ref([])

function setTabRef(element, index) {
  if (element) tabRefs.value[index] = element
}

function select(option) {
  if (!option || option.value === props.modelValue) return
  emit('update:modelValue', option.value)
}

function onKeydown(event, index) {
  const total = props.options.length
  if (!total) return

  let next = index

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = (index + 1) % total
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      next = (index - 1 + total) % total
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = total - 1
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      select(props.options[index])
      return
    default:
      return
  }

  event.preventDefault()
  select(props.options[next])
  tabRefs.value[next]?.focus()
}
</script>

<style scoped>
.segmented {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: #f2f4f7;
}

.seg-item {
  flex: 0 0 auto;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-text-2);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  touch-action: manipulation;
  transition: background .16s ease, color .16s ease, box-shadow .16s ease;
}

.is-block .seg-item {
  flex: 1 1 0;
}

.seg-item:hover {
  color: var(--c-text);
}

.seg-item.is-active {
  background: var(--c-surface);
  box-shadow: 0 1px 3px rgba(16, 24, 40, .12);
  color: var(--c-primary);
  font-weight: 600;
}

.seg-item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.seg-item.is-active:focus-visible {
  box-shadow: 0 1px 3px rgba(16, 24, 40, .12), var(--focus-ring);
}
</style>
