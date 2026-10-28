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
            <td colspan="19" class="empty-tip">暂无对比方案，请添加</td>
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
              {{ cellText(item, col) }}
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
defineProps({
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
  { key: 'salary', label: '税后月收入' },
  { key: 'gjjMonth', label: '月公积金' },
  { key: 'originPay', label: '原月供(元)' },
  { key: 'selfPay', label: '抵扣后自付(元)' },
  { key: 'rateOrigin', label: '原月供占税后', percent: true },
  { key: 'rateSelf', label: '自付占税后', percent: true },
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

.compare-table tbody tr:hover td {
  background: #f8fafd;
}

.compare-table .empty-tip {
  padding: 24px;
  white-space: normal;
}
</style>
