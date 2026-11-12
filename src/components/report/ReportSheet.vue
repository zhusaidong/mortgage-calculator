<template>
  <Teleport to="body">
    <div class="report-sheet">
      <template v-if="ready">
        <header class="report-head">
          <div>
            <h1 class="report-title">{{ model.title }}</h1>
            <p class="report-time">生成时间：{{ model.generatedAt }}</p>
          </div>
          <p class="report-subtitle">{{ model.subtitle }}</p>
        </header>

        <section class="report-section">
          <h2 class="report-h2">测算参数</h2>
          <dl class="param-grid">
            <div v-for="item in model.params" :key="item.label" class="param-item">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </section>

        <section class="report-section">
          <h2 class="report-h2">核心指标</h2>
          <div class="metric-grid">
            <div
              v-for="item in model.metrics"
              :key="item.label"
              class="metric-card"
              :class="`is-${item.tone}`"
            >
              <span class="metric-label">{{ item.label }}</span>
              <span class="metric-value">{{ item.value }}</span>
            </div>
          </div>
        </section>

        <section class="report-section">
          <h2 class="report-h2">还款方式对比</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>对比项</th>
                <th>等额本息</th>
                <th>等额本金</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>首月月供</td>
                <td>{{ money(interestCmp?.firstPay) }}</td>
                <td>{{ money(principalCmp?.firstPay) }}</td>
              </tr>
              <tr>
                <td>末月月供</td>
                <td>{{ money(interestCmp?.lastPay) }}</td>
                <td>{{ money(principalCmp?.lastPay) }}</td>
              </tr>
              <tr>
                <td>支付利息</td>
                <td>{{ money(interestCmp?.totalInterest) }}</td>
                <td>{{ money(principalCmp?.totalInterest) }}</td>
              </tr>
              <tr>
                <td>本息合计</td>
                <td>{{ money(interestCmp?.totalPay) }}</td>
                <td>{{ money(principalCmp?.totalPay) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="report-section">
          <h2 class="report-h2">年度还款汇总</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>年份</th>
                <th>月供合计</th>
                <th>本金</th>
                <th>利息</th>
                <th>公积金抵扣</th>
                <th>自付</th>
                <th>年末剩余本金</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in model.years" :key="row.year">
                <td>第 {{ row.year }} 年</td>
                <td>{{ money(row.pay) }}</td>
                <td>{{ money(row.principal) }}</td>
                <td>{{ money(row.interest) }}</td>
                <td>{{ money(row.gjjOffset) }}</td>
                <td>{{ money(row.selfPay) }}</td>
                <td>{{ money(row.remain) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer class="report-foot">
          <p>本报告由房贷组合贷计算器在本地计算生成，提前还款、利率重定价与各地政策差异均可能影响实际结果，仅供参考。</p>
          <p>生成时间：{{ model.generatedAt }}</p>
        </footer>
      </template>
      <p v-else class="report-empty">暂无测算数据</p>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { buildAmortization } from '../../core/amortize.js'
import { fmtMoney } from '../../core/format.js'
import { buildReportModel } from '../../utils/report.js'

const props = defineProps({
  settings: { type: Object, required: true },
  result: { type: Object, required: true },
  ready: { type: Boolean, default: false }
})

const schedule = computed(() => buildAmortization(props.settings || {}))
const model = computed(() => buildReportModel(props.settings || {}, props.result || {}, schedule.value))

const interestCmp = computed(() =>
  (model.value.comparisons || []).find((item) => item.mode === 'equalPrincipalInterest')
)
const principalCmp = computed(() =>
  (model.value.comparisons || []).find((item) => item.mode === 'equalPrincipal')
)

function money(value) {
  const n = Number(value)
  return Number.isFinite(n) ? `¥${fmtMoney(n)}` : '--'
}
</script>

<style scoped>
.report-sheet {
  background: var(--c-surface);
  color: var(--c-text);
  font-size: 12px;
  line-height: 1.5;
}

.report-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--c-primary);
}

.report-title {
  color: var(--c-primary);
  font-size: 22px;
  font-weight: 700;
}

.report-time,
.report-subtitle {
  color: var(--c-text-3);
  font-size: 11px;
}

.report-section {
  margin-top: 16px;
}

.report-h2 {
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid var(--c-primary);
  color: var(--c-text);
  font-size: 14px;
  font-weight: 600;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
  border-bottom: 1px solid var(--c-border-soft);
}

.param-item dt {
  color: var(--c-text-3);
}

.param-item dd {
  color: var(--c-text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--c-bg);
}

.metric-label {
  color: var(--c-text-3);
  font-size: 11px;
}

.metric-value {
  color: var(--c-text);
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.metric-card.is-primary .metric-value {
  color: var(--c-primary);
}

.metric-card.is-warning .metric-value {
  color: var(--c-warning);
}

.report-foot {
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px solid var(--c-border);
  color: var(--c-text-3);
  font-size: 10px;
}

.report-empty {
  color: var(--c-text-3);
  font-size: 12px;
}
</style>

<style>
.report-sheet {
  display: none;
}

@media print {
  html:root {
    --c-primary: #2b7bce;
    --c-primary-dark: #1f5fa3;
    --c-primary-soft: #eaf2fb;
    --c-bg: #f5f7fa;
    --c-surface: #ffffff;
    --c-text: #222222;
    --c-text-2: #555555;
    --c-text-3: #888888;
    --c-border: #e4e8ef;
    --c-border-soft: #f0f2f5;
    --c-success: #0f9d76;
    --c-warning: #e8890c;
    --c-danger: #e04b3f;
    --radius-lg: 16px;
    --radius-md: 10px;
    --radius-sm: 8px;
    --shadow-card: 0 1px 2px rgba(16, 24, 40, .04), 0 4px 16px rgba(16, 24, 40, .06);
    --shadow-pop: 0 6px 20px rgba(16, 24, 40, .16);
    --gap-page: 20px;
    --focus-ring: 0 0 0 3px rgba(43, 123, 206, .18);
  }

  @page {
    size: A4;
    margin: 12mm;
  }

  body {
    background: #fff !important;
  }

  .page {
    display: none !important;
  }

  .report-sheet {
    display: block !important;
    width: 100%;
    max-width: 180mm;
    color: #222;
  }

  .report-sheet table {
    width: 100%;
    border-collapse: collapse;
  }

  .report-sheet th,
  .report-sheet td {
    border-bottom: 1px solid #e4e8ef;
    padding: 6px 8px;
    font-size: 11px;
  }

  .report-sheet thead {
    display: table-header-group;
  }

  .report-sheet tr {
    break-inside: avoid;
  }
}
</style>
