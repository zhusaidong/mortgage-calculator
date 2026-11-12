<template>
  <SectionCard title="还款明细" icon="📋">
    <template v-if="!ready">
      <p class="empty-tip">填写贷款信息后展示逐月还款明细</p>
    </template>

    <template v-else-if="!hasData">
      <p class="empty-tip">当前贷款总额为 0，暂无还款明细</p>
    </template>

    <template v-else>
      <div class="toolbar">
        <SegmentedTabs v-model="tab" :options="TAB_OPTIONS" :block="false" />
        <button class="btn btn-sm export-btn" type="button" @click="exportCsv">导出 CSV</button>
      </div>

      <p class="summary-line">{{ summaryText }}</p>

      <div v-if="tab === 'year'" class="table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th scope="col" class="cell-key">年份</th>
              <th scope="col" class="cell-num">月供合计</th>
              <th scope="col" class="cell-num">本金</th>
              <th scope="col" class="cell-num">利息</th>
              <th scope="col" class="cell-num">公积金抵扣</th>
              <th scope="col" class="cell-num">自付</th>
              <th scope="col" class="cell-num">年末剩余本金</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="year in schedule.years" :key="year.year">
              <td class="cell-key">第 {{ year.year }} 年</td>
              <td class="cell-num">¥{{ money(year.pay) }}</td>
              <td class="cell-num">¥{{ money(year.principal) }}</td>
              <td class="cell-num">¥{{ money(year.interest) }}</td>
              <td class="cell-num">¥{{ money(year.gjjOffset) }}</td>
              <td class="cell-num">¥{{ money(year.selfPay) }}</td>
              <td class="cell-num">¥{{ money(year.remain) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="tab === 'month'" class="month-pane">
        <div class="table-wrap">
          <table class="detail-table">
            <thead>
              <tr>
                <th scope="col" class="cell-key">期数</th>
                <th scope="col" class="cell-num">月供</th>
                <th scope="col" class="cell-num">本金</th>
                <th scope="col" class="cell-num">利息</th>
                <th scope="col" class="cell-num">公积金抵扣</th>
                <th scope="col" class="cell-num">自付</th>
                <th scope="col" class="cell-num">剩余本金</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedRows" :key="row.month">
                <td class="cell-key">{{ row.month }}</td>
                <td class="cell-num">¥{{ money(row.pay) }}</td>
                <td class="cell-num">¥{{ money(row.principal) }}</td>
                <td class="cell-num">¥{{ money(row.interest) }}</td>
                <td class="cell-num">¥{{ money(row.gjjOffset) }}</td>
                <td class="cell-num">¥{{ money(row.selfPay) }}</td>
                <td class="cell-num">¥{{ money(row.remain) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pager">
          <button
            class="btn btn-sm"
            type="button"
            aria-label="上一页"
            :disabled="page <= 1"
            @click="prevPage"
          >
            上一页
          </button>
          <span class="pager-info">第 {{ page }} / {{ totalPages }} 页</span>
          <button
            class="btn btn-sm"
            type="button"
            aria-label="下一页"
            :disabled="page >= totalPages"
            @click="nextPage"
          >
            下一页
          </button>
        </div>
      </div>

      <div v-else class="chart-pane">
        <LoanCharts :schedule="schedule" :settings="settings" />
      </div>

      <p class="detail-note">
        明细按当前参数逐月测算，未考虑提前还款、利率重定价与各地政策差异，仅供参考。
      </p>
    </template>
  </SectionCard>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import SectionCard from '../ui/SectionCard.vue'
import SegmentedTabs from '../ui/SegmentedTabs.vue'
import LoanCharts from '../charts/LoanCharts.vue'
import { buildAmortization } from '../../core/amortize.js'
import { fmtMoney } from '../../core/format.js'
import { downloadScheduleCsv } from '../../utils/csv.js'

const props = defineProps({
  settings: { type: Object, required: true },
  ready: { type: Boolean, default: false }
})

const TAB_OPTIONS = [
  { value: 'year', label: '年度汇总' },
  { value: 'month', label: '月度明细' },
  { value: 'chart', label: '图表' }
]

const PAGE_SIZE = 24

const tab = ref('year')
const page = ref(1)

const schedule = computed(() => buildAmortization(props.settings))
const hasData = computed(() => schedule.value.rows.length > 0)
const totalPages = computed(() => Math.max(1, Math.ceil(schedule.value.rows.length / PAGE_SIZE)))

const pagedRows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return schedule.value.rows.slice(start, start + PAGE_SIZE)
})

// 参数变化会重建还款计划，期数随之改变，页面回到第一页
watch(schedule, () => {
  page.value = 1
})

// 总期数变化后当前页可能越界（如 30 年改 10 年），夹紧到有效区间
watch(totalPages, (total) => {
  if (page.value > total) page.value = total
  else if (page.value < 1) page.value = 1
})

// 金额统一走这里，确保非有限数不会渲染成 NaN / undefined
function money(value) {
  const n = Number(value)
  return Number.isFinite(n) ? fmtMoney(n) : '--'
}

function wan(value) {
  const n = Number(value)
  return Number.isFinite(n) ? (n / 10000).toFixed(2) : '--'
}

const summaryText = computed(() => {
  const totals = schedule.value.totals
  return `共 ${schedule.value.rows.length} 期 · 总利息 ${wan(totals.interest)} 万 · 总还款 ${wan(totals.pay)} 万`
})

function exportCsv() {
  downloadScheduleCsv(schedule.value.rows)
}

function prevPage() {
  if (page.value > 1) page.value -= 1
}

function nextPage() {
  if (page.value < totalPages.value) page.value += 1
}
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.export-btn {
  margin-left: auto;
}

.summary-line {
  margin: 10px 0;
  color: var(--c-text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.table-wrap {
  max-height: 420px;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius-sm);
}

.detail-table {
  width: 100%;
  min-width: 760px;
  border-collapse: separate;
  border-spacing: 0;
  border-top: 1px solid var(--c-border-soft);
  border-left: 1px solid var(--c-border-soft);
  font-size: 13px;
}

.detail-table th,
.detail-table td {
  padding: 9px 8px;
  border-right: 1px solid var(--c-border-soft);
  border-bottom: 1px solid var(--c-border-soft);
  white-space: nowrap;
}

.detail-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--c-border-soft);
  color: var(--c-text-2);
  font-weight: 600;
}

.detail-table td {
  background: var(--c-surface);
  color: var(--c-text);
}

.detail-table tbody tr:hover td {
  background: var(--c-hover);
}

.cell-key {
  text-align: center;
  color: var(--c-text-2);
}

.cell-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 12px;
}

.pager-info {
  color: var(--c-text-2);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.chart-pane {
  padding: 4px 0;
}

.detail-note {
  margin-top: 14px;
  color: var(--c-text-3);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 480px) {
  .export-btn {
    margin-left: 0;
  }
}
</style>
