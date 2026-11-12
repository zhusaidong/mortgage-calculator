<template>
  <div class="table-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th class="col-idx sticky-corner">序号</th>
          <th v-for="col in DATA_COLUMNS" :key="col.key">{{ col.label }}</th>
          <th class="col-action">操作</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="!items.length">
          <tr>
            <td colspan="18" class="empty-tip">暂无对比方案，请添加</td>
          </tr>
        </template>
        <template v-else>
          <tr v-for="(item, index) in items" :key="index">
            <td class="col-idx sticky-col">{{ index + 1 }}</td>
            <td
              v-for="col in DATA_COLUMNS"
              :key="col.key"
              :class="col.percent || col.align === 'right' ? 'cell-num' : 'cell-text'"
            >
              <span class="cell-val">{{ cellText(item, col) }}</span>
              <span
                v-if="isBest(item, col.key)"
                class="best-badge"
                title="最低值"
                aria-label="最低值"
              >最优</span>
            </td>
            <td class="col-action">
              <button class="btn btn-sm" type="button" @click="emit('remove', index)">删除</button>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] }
})
const emit = defineEmits(['remove'])

const DATA_COLUMNS = [
  { key: 'housePrice', label: '房屋总价(万)' },
  { key: 'downRate', label: '首付比例', percent: true },
  { key: 'down', label: '首付(万)' },
  { key: 'loanTotal', label: '总贷款(万)' },
  { key: 'fund', label: '公积金贷(万)' },
  { key: 'com', label: '商贷(万)' },
  { key: 'year', label: '年限' },
  { key: 'payType', label: '还款方式', align: 'center' },
  { key: 'comRate', label: '商贷利率', percent: true },
  { key: 'fundRate', label: '公积金利率', percent: true },
  { key: 'originPay', label: '原月供(元)' },
  { key: 'selfPay', label: '抵扣后自付(元)' },
  { key: 'rateOrigin', label: '原月供占税后', percent: true },
  { key: 'rateSelf', label: '自付占税后', percent: true },
  { key: 'ratePreTax', label: '银行偿贷比', percent: true },
  { key: 'totalInt', label: '总利息(万)' }
]

function cellText(item, col) {
  const value = item[col.key]
  if (value === null || value === undefined) return '--'
  if (col.percent) {
    return Number.isFinite(Number(value)) ? `${value}%` : `${value}`
  }
  return value
}

// 三项「越低越优」的决策指标
const BEST_KEYS = ['totalInt', 'originPay', 'selfPay']

// '--' / null / undefined / 非数字一律视为无值，避免 Number(null) === 0 造成误判
function toFinite(value) {
  if (value === null || value === undefined || value === '--' || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

// 仅当方案数 >= 2 时才计算最低值，否则返回空对象，不做任何标记
const bestValues = computed(() => {
  const result = {}
  if (props.items.length < 2) return result
  for (const key of BEST_KEYS) {
    const nums = props.items.map((item) => toFinite(item[key])).filter((v) => v !== null)
    if (nums.length) result[key] = Math.min(...nums)
  }
  return result
})

function isBest(item, key) {
  if (!(key in bestValues.value)) return false
  const value = toFinite(item[key])
  if (value === null) return false
  // 数值来自 toFixed(2) 舍入，用极小 epsilon 容忍浮点误差以正确识别并列
  return Math.abs(value - bestValues.value[key]) < 1e-9
}
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-sm);
}

.compare-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: separate;
  border-spacing: 0;
  border-top: 1px solid var(--c-border-soft);
  border-left: 1px solid var(--c-border-soft);
  font-size: 13px;
}

.compare-table th,
.compare-table td {
  padding: 9px 8px;
  border-right: 1px solid var(--c-border-soft);
  border-bottom: 1px solid var(--c-border-soft);
  white-space: nowrap;
}

.compare-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--c-border-soft);
  color: var(--c-text-2);
  font-weight: 600;
  text-align: center;
}

.compare-table td {
  background: var(--c-surface);
  color: var(--c-text);
}

/* 粘性层级：表头 2 < 首列 1 < 左上角单元格 3，避免滚动时互相盖住 */
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 1;
  box-shadow: 1px 0 0 var(--c-border-soft);
}

.sticky-corner {
  left: 0;
  z-index: 3;
}

.col-idx,
.col-action {
  text-align: center;
}

.cell-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cell-text {
  text-align: center;
}

.best-badge {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--c-success-soft);
  background: color-mix(in srgb, var(--c-success) 12%, transparent);
  color: var(--c-success);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  vertical-align: middle;
}

.compare-table tbody tr:hover td {
  background: var(--c-hover);
}

.compare-table .empty-tip {
  padding: 24px;
  white-space: normal;
}
</style>
