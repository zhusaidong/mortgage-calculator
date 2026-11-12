<template>
  <div v-if="hasData" class="loan-charts">
    <section class="chart-card">
      <h3 class="chart-title">本息结构</h3>
      <div class="donut-wrap">
        <svg class="donut" viewBox="0 0 120 120" role="img" :aria-label="donutAria">
          <title>本息结构</title>
          <g transform="rotate(-90 60 60)">
            <circle class="arc arc-principal" cx="60" cy="60" :r="DONUT_R" fill="none" stroke-width="14" :stroke-dasharray="donut.principalDash" />
            <circle class="arc arc-interest" cx="60" cy="60" :r="DONUT_R" fill="none" stroke-width="14" :stroke-dasharray="donut.interestDash" :stroke-dashoffset="donut.interestOffset" />
          </g>
          <text class="donut-value" x="60" y="55" text-anchor="middle" dominant-baseline="middle">{{ donut.ratio.toFixed(1) }}%</text>
          <text class="donut-caption" x="60" y="71" text-anchor="middle" dominant-baseline="middle">利息占比</text>
        </svg>
      </div>
      <ul class="legend">
        <li><span class="legend-dot dot-principal" aria-hidden="true" />本金 ¥{{ fmtWan(donut.principal / 10000, 2) }}</li>
        <li><span class="legend-dot dot-interest" aria-hidden="true" />利息 ¥{{ fmtWan(donut.interest / 10000, 2) }}</li>
      </ul>
    </section>

    <section v-for="chart in lineCharts" :key="chart.key" class="chart-card">
      <h3 class="chart-title">{{ chart.title }}</h3>
      <svg class="chart-svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="chart.aria">
        <title>{{ chart.title }}</title>
        <g>
          <line v-for="tick in chart.ticks" :key="`g-${tick.label}`" :x1="BOX.x1" :x2="BOX.x2" :y1="tick.y" :y2="tick.y" class="grid-line" vector-effect="non-scaling-stroke" />
          <text v-for="tick in chart.ticks" :key="`t-${tick.label}`" :x="BOX.x1 - 6" :y="tick.y" text-anchor="end" dominant-baseline="middle" class="axis-text">{{ tick.label }}</text>
        </g>
        <path v-if="chart.area" :d="chart.area" class="area-fill" />
        <path :d="chart.primaryPath" class="line-primary" vector-effect="non-scaling-stroke" />
        <path v-if="chart.altPath" :d="chart.altPath" class="line-alt" vector-effect="non-scaling-stroke" />
        <text v-for="label in chart.xLabels" :key="label.label" :x="label.x" :y="BOX.y2 + 15" text-anchor="middle" class="axis-text">{{ label.label }}</text>
        <circle v-if="chart.last" :cx="chart.last.x" :cy="chart.last.y" r="2.5" class="point-primary" />
        <text v-if="chart.last" :x="chart.last.x" :y="chart.last.labelY" text-anchor="end" class="value-text">{{ chart.lastValue }}</text>
      </svg>
      <template v-if="chart.key === 'pay'">
        <ul class="legend legend-lines">
          <li class="legend-line-row"><span class="line-swatch is-solid" aria-hidden="true" /><span>{{ currentLabel }}</span><span class="badge-current">当前</span></li>
          <li class="legend-line-row"><span class="line-swatch is-dashed" aria-hidden="true" /><span>{{ otherLabel }}</span></li>
        </ul>
        <p class="pay-caption"><span>首月月供 ¥{{ fmtMoney(pay.firstPay) }}</span><span>末月月供 ¥{{ fmtMoney(pay.lastPay) }}</span></p>
      </template>
    </section>
  </div>
  <p v-else class="empty-tip">暂无还款明细</p>
</template>

<script setup>
import { computed } from 'vue'
import { buildAmortization } from '../../core/amortize.js'
import { fmtMoney, fmtWan } from '../../core/format.js'

const props = defineProps({
  schedule: { type: Object, required: true },
  settings: { type: Object, required: true }
})
const W = 360
const H = 200
const PAD = { top: 14, right: 18, bottom: 26, left: 46 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const BOX = { x1: PAD.left, x2: W - PAD.right, y1: PAD.top, y2: H - PAD.bottom }
const DONUT_R = 46
const DONUT_C = 2 * Math.PI * DONUT_R
const MODE_LABEL = { equalPrincipalInterest: '等额本息', equalPrincipal: '等额本金' }
function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// 万元坐标，坏数据一律归零
const safeWan = (value) => Math.max(num(value) / 10000, 0)

// 取 1/2/2.5/5 的整步长，保证 3~4 条网格线
function niceTicks(maxValue, unit = 'wan') {
  const max = num(maxValue)
  if (max <= 0) return unit === 'wan' ? [0, 1, 2, 3] : [0, 1000, 2000, 3000]
  const rough = max / 3
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) || 10 * pow
  const top = Math.ceil(max / step) * step
  const ticks = []
  for (let v = 0; v <= top + step * 0.5; v += step) ticks.push(Number(v.toFixed(6)))
  return ticks
}

const tickWan = (v) => (v === 0 ? '0' : `${v}万`)
const tickYuan = (v) => (v === 0 ? '0' : fmtMoney(v, 0))
const xOfYear = (n, idx) => PAD.left + (n > 0 ? (idx / n) * PLOT_W : 0)

// 统一生成刻度与 y 轴映射，供两张折线图复用
function scaleFor(maxValue, unit) {
  const ticks = niceTicks(maxValue, unit)
  const top = ticks[ticks.length - 1] || 1
  return { ticks, yOf: (v) => PAD.top + PLOT_H - (top > 0 ? (v / top) * PLOT_H : 0) }
}

// 每年等距抽 4~5 个年份标签，避免 x 轴拥挤
function yearLabels(n, xOfYear) {
  if (n < 1) return []
  const count = Math.min(5, n)
  const seen = new Set()
  const result = []
  for (let k = 0; k < count; k++) {
    const idx = count === 1 ? n : 1 + Math.round((k * (n - 1)) / (count - 1))
    if (seen.has(idx)) continue
    seen.add(idx)
    result.push({ x: xOfYear(idx), label: `第${idx}年` })
  }
  return result
}

function monthsByYear(rowList) {
  const map = new Map()
  for (const row of rowList) {
    if (!row) continue
    const y = num(row.year)
    map.set(y, (map.get(y) || 0) + 1)
  }
  return map
}

const hasData = computed(() => Boolean(
  props.schedule && Array.isArray(props.schedule.rows) && props.schedule.rows.length > 0
))
const rows = computed(() => (hasData.value ? props.schedule.rows : []))
const years = computed(() => (
  hasData.value && Array.isArray(props.schedule.years) ? props.schedule.years.filter(Boolean) : []
))
const totals = computed(() => (props.schedule && props.schedule.totals) || {})
const currentMode = computed(() => (
  props.settings && props.settings.payMode === 'equalPrincipal' ? 'equalPrincipal' : 'equalPrincipalInterest'
))
const currentLabel = computed(() => MODE_LABEL[currentMode.value])
const otherMode = computed(() => (currentMode.value === 'equalPrincipal' ? 'equalPrincipalInterest' : 'equalPrincipal'))
const otherLabel = computed(() => MODE_LABEL[otherMode.value])

// 用当前参数再跑一次另一种还款方式，只取年度汇总做对比
const altSchedule = computed(() => {
  try {
    const result = buildAmortization({ ...(props.settings || {}), payMode: otherMode.value })
    if (!result || !Array.isArray(result.rows) || !Array.isArray(result.years) || !result.years.length) return null
    return result
  } catch (error) {
    return null
  }
})

const donut = computed(() => {
  const principal = Math.max(num(totals.value.principal), 0)
  const interest = Math.max(num(totals.value.interest), 0)
  const total = principal + interest
  const ratio = total > 0 ? (interest / total) * 100 : 0
  const principalLen = total > 0 ? (principal / total) * DONUT_C : 0
  const interestLen = Math.max(DONUT_C - principalLen, 0)
  return {
    principal,
    interest,
    ratio,
    principalDash: `${principalLen} ${DONUT_C - principalLen}`,
    interestDash: `${interestLen} ${DONUT_C - interestLen}`,
    interestOffset: -principalLen
  }
})

const remain = computed(() => {
  const list = years.value
  const n = list.length
  // 起始点补上第 0 年的完整本金，让曲线从贷款总额出发
  const points = [{ value: safeWan(totals.value.principal) }]
  for (const item of list) points.push({ value: Math.max(safeWan(item.remain), 0) })
  const { ticks, yOf } = scaleFor(points.reduce((max, p) => Math.max(max, p.value), 0), 'wan')
  const coords = points.map((p, i) => ({ x: xOfYear(n, i), y: yOf(p.value) }))
  const line = coords.length
    ? coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
    : ''
  const area = coords.length
    ? `${line} L${coords[coords.length - 1].x.toFixed(2)} ${BOX.y2} L${coords[0].x.toFixed(2)} ${BOX.y2} Z`
    : ''
  const lastCoord = coords.length ? coords[coords.length - 1] : null
  return {
    line,
    area,
    last: lastCoord ? { ...lastCoord, labelY: Math.max(lastCoord.y - 10, 11) } : null,
    lastWan: n > 0 ? Math.max(safeWan(list[n - 1].remain), 0) : 0,
    firstWan: n > 0 ? Math.max(safeWan(list[0].remain), 0) : 0,
    grid: ticks.map((v) => ({ y: yOf(v), label: tickWan(v) })),
    labels: yearLabels(n, (idx) => xOfYear(n, idx))
  }
})

const pay = computed(() => {
  const list = years.value
  const n = list.length
  const currentMap = monthsByYear(rows.value)
  const currentValues = list.map((item) => {
    const months = currentMap.get(num(item.year)) || 12
    return months > 0 ? Math.max(num(item.pay) / months, 0) : 0
  })
  const alt = altSchedule.value
  const altMap = alt ? monthsByYear(alt.rows) : new Map()
  const altValues = list.map((item, i) => {
    const altYear = alt && alt.years[i]
    if (!altYear) return null
    const months = altMap.get(num(altYear.year)) || 12
    return months > 0 ? Math.max(num(altYear.pay) / months, 0) : 0
  })
  const allValues = [...currentValues, ...altValues.filter((v) => v !== null)]
  const { ticks, yOf } = scaleFor(allValues.reduce((max, v) => Math.max(max, num(v)), 0), 'yuan')
  const buildPath = (values) => {
    let d = ''
    let started = false
    values.forEach((value, i) => {
      if (!Number.isFinite(value)) {
        started = false
        return
      }
      const x = PAD.left + ((i + 1) / n) * PLOT_W
      d += `${started ? 'L' : 'M'}${x.toFixed(2)} ${yOf(value).toFixed(2)} `
      started = true
    })
    return d.trim()
  }
  return {
    currentPath: n > 0 ? buildPath(currentValues) : '',
    altPath: n > 0 ? buildPath(altValues) : '',
    firstPay: rows.value.length ? num(rows.value[0]?.pay) : 0,
    lastPay: rows.value.length ? num(rows.value[rows.value.length - 1]?.pay) : 0,
    grid: ticks.map((v) => ({ y: yOf(v), label: tickYuan(v) })),
    labels: yearLabels(n, (idx) => xOfYear(n, idx))
  }
})

const donutAria = computed(() => `本息结构：本金 ${fmtWan(donut.value.principal / 10000, 2)}，利息 ${fmtWan(donut.value.interest / 10000, 2)}，利息占比 ${donut.value.ratio.toFixed(1)}%`)
const remainAria = computed(() => `剩余本金走势：首年 ${fmtWan(remain.value.firstWan, 2)}，末年 ${fmtWan(remain.value.lastWan, 2)}`)
const payAria = computed(() => `月供走势：${currentLabel.value}首月 ${fmtMoney(pay.value.firstPay)} 元，末月 ${fmtMoney(pay.value.lastPay)} 元`)

// 两张折线图共用同一套坐标渲染，差异只在这里注入
const lineCharts = computed(() => [
  {
    key: 'remain', title: '剩余本金走势', aria: remainAria.value, ticks: remain.value.grid,
    xLabels: remain.value.labels, area: remain.value.area, primaryPath: remain.value.line,
    altPath: '', last: remain.value.last, lastValue: `${remain.value.lastWan.toFixed(0)}万`
  },
  {
    key: 'pay', title: '月供走势对比', aria: payAria.value, ticks: pay.value.grid,
    xLabels: pay.value.labels, area: '', primaryPath: pay.value.currentPath,
    altPath: pay.value.altPath, last: null, lastValue: ''
  }
])
</script>

<style scoped>
.loan-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--gap-page, 20px);
}

.chart-card {
  min-width: 0;
  padding: 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border-soft);
  border-radius: var(--radius-md);
}

.chart-title {
  margin-bottom: 10px;
  color: var(--c-text-2);
  font-size: 13px;
  font-weight: 600;
}

.donut-wrap { display: flex; justify-content: center; }
.donut { width: 100%; max-width: 180px; height: auto; }
.arc-principal { stroke: var(--c-primary); }
.arc-interest { stroke: var(--c-warning); }
.donut-value { fill: var(--c-text); font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.donut-caption { fill: var(--c-text-3); font-size: 9px; }

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;
  margin-top: 8px;
  color: var(--c-text-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.legend li { display: flex; align-items: center; gap: 6px; }
.legend-dot { flex: 0 0 auto; width: 10px; height: 10px; border-radius: 50%; }
.dot-principal { background: var(--c-primary); }
.dot-interest { background: var(--c-warning); }
.chart-svg { width: 100%; height: auto; overflow: visible; }
.grid-line { stroke: var(--c-border-soft); stroke-width: 1; }
.axis-text { fill: var(--c-text-3); font-size: 10px; font-variant-numeric: tabular-nums; }
.value-text { fill: var(--c-text-2); stroke: var(--c-surface); stroke-width: 3; paint-order: stroke; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
.area-fill { fill: var(--c-primary-soft); }

.line-primary,
.line-alt {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-primary { stroke: var(--c-primary); }
.line-alt { stroke: var(--c-text-3); stroke-dasharray: 5 4; }
.point-primary { fill: var(--c-primary); }

.legend-lines {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 6px;
  margin-top: 10px;
}

/* .legend li 已提供横排布局，这里只补线条色块 */
.line-swatch { flex: 0 0 auto; width: 22px; height: 0; border-top: 2px solid var(--c-primary); }
.line-swatch.is-dashed { border-top-color: var(--c-text-3); border-top-style: dashed; }
.badge-current {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 10px;
  font-weight: 600;
}

.pay-caption {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 10px;
  color: var(--c-text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 600px) {
  .loan-charts { grid-template-columns: 1fr; }
}
</style>
