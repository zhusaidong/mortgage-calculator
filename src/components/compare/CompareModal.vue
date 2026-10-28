<template>
  <Teleport to="body">
    <div v-if="modelValue" class="compare-modal">
      <header class="modal-head">
        <span class="modal-title">方案对比</span>
        <div class="modal-actions">
          <button class="btn btn-sm" type="button" @click="transposed = !transposed">
            切换转置/原始表格
          </button>
          <button class="btn btn-sm" type="button" @click="close">关闭</button>
        </div>
      </header>

      <div class="modal-body">
        <div v-if="!items.length" class="empty-tip">暂无对比方案</div>

        <div v-else-if="transposed" class="table-wrap">
          <table class="modal-table transposed-table">
            <thead>
              <tr>
                <th class="field-col corner">项目</th>
                <th v-for="(_, index) in items" :key="index">方案{{ index + 1 }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[key, label] in COMPARE_FIELDS" :key="key">
                <td class="field-col">{{ label }}</td>
                <td v-for="(item, index) in items" :key="index" class="cell-num">
                  {{ cellText(item, key) }}
                </td>
              </tr>
              <tr>
                <td class="field-col">操作</td>
                <td v-for="(item, index) in items" :key="index" class="cell-center">
                  <button class="btn btn-sm" type="button" @click="emit('remove', index)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="table-wrap">
          <table class="modal-table original-table">
            <thead>
              <tr>
                <th>序号</th>
                <th v-for="col in ORIGINAL_COLUMNS" :key="col.key">{{ col.label }}</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in items" :key="index">
                <td class="cell-center">{{ index + 1 }}</td>
                <td
                  v-for="col in ORIGINAL_COLUMNS"
                  :key="col.key"
                  :class="col.align === 'center' ? 'cell-center' : 'cell-num'"
                >
                  {{ cellText(item, col.key) }}
                </td>
                <td class="cell-center">
                  <button class="btn btn-sm" type="button" @click="emit('remove', index)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { COMPARE_FIELDS, PERCENT_FIELDS } from '../../core/constants.js'

const props = defineProps({
  items: { type: Array, default: () => [] },
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'remove'])

const ORIGINAL_COLUMNS = [
  { key: 'housePrice', label: '房屋总价(万)' },
  { key: 'downRate', label: '首付比例' },
  { key: 'down', label: '首付(万)' },
  { key: 'loanTotal', label: '总贷款(万)' },
  { key: 'fund', label: '公积金贷(万)' },
  { key: 'com', label: '商贷(万)' },
  { key: 'year', label: '年限' },
  { key: 'payType', label: '还款方式', align: 'center' },
  { key: 'comRate', label: '商贷利率' },
  { key: 'fundRate', label: '公积金利率' },
  { key: 'salary', label: '税后月收入' },
  { key: 'gjjMonth', label: '月公积金' },
  { key: 'originPay', label: '原月供(元)' },
  { key: 'selfPay', label: '抵扣后自付(元)' },
  { key: 'rateOrigin', label: '原月供占税后' },
  { key: 'rateSelf', label: '自付占税后' },
  { key: 'totalInt', label: '总利息(万)' }
]

const transposed = ref(true)

function cellText(item, key) {
  const value = item[key]
  if (value === null || value === undefined) return '--'
  if (PERCENT_FIELDS.includes(key)) {
    return Number.isFinite(Number(value)) ? `${value}%` : `${value}`
  }
  return value
}

function close() {
  emit('update:modelValue', false)
}

let previousOverflow = ''
let bodyLocked = false

function lockBody() {
  if (bodyLocked || typeof document === 'undefined') return
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  bodyLocked = true
}

function unlockBody() {
  if (!bodyLocked || typeof document === 'undefined') return
  document.body.style.overflow = previousOverflow
  bodyLocked = false
}

function onKeydown(event) {
  if (event.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) lockBody()
    else unlockBody()
  },
  { immediate: true }
)

onMounted(() => {
  if (typeof document !== 'undefined') document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown)
  unlockBody()
})
</script>

<style scoped>
.compare-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: var(--c-surface);
  animation: modal-fade 140ms ease;
}

@keyframes modal-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text);
}

.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.modal-actions .btn {
  min-height: 34px;
}

.modal-body {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-table {
  border-collapse: separate;
  border-spacing: 0;
  border-top: 1px solid var(--c-border-soft);
  border-left: 1px solid var(--c-border-soft);
  font-size: 13px;
}

.modal-table th,
.modal-table td {
  padding: 8px 10px;
  border-right: 1px solid var(--c-border-soft);
  border-bottom: 1px solid var(--c-border-soft);
  white-space: nowrap;
}

.modal-table th {
  background: var(--c-border-soft);
  color: var(--c-text-2);
  font-weight: 600;
  text-align: center;
}

.modal-table td {
  background: var(--c-surface);
  color: var(--c-text);
}

.transposed-table {
  width: 100%;
}

.transposed-table .field-col {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 120px;
  background: var(--c-surface);
  color: var(--c-text-2);
  text-align: left;
  box-shadow: 1px 0 0 var(--c-border-soft);
}

.transposed-table th.field-col {
  z-index: 2;
  background: var(--c-border-soft);
}

.original-table {
  width: 100%;
  min-width: 1180px;
}

.cell-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cell-center {
  text-align: center;
}

@media (max-width: 900px) {
  .modal-head {
    padding: 10px 12px;
  }

  .modal-actions {
    width: 100%;
  }

  .modal-actions .btn {
    flex: 1 1 auto;
  }
}
</style>
