<template>
  <SectionCard title="测算结果" icon="📊">
    <template v-if="ready">
      <div class="result-hero">
        <p class="hero-caption">{{ payCaption }}</p>
        <p class="hero-value">¥{{ fmtMoney(result.origin) }}</p>
        <p v-if="isEqualPrincipal" class="hero-last">末月 {{ fmtMoney(lastMonthTotal) }}</p>
      </div>

      <div class="result-lines">
        <div class="info-line">
          <span>月供构成</span>
          <span class="info-value">
            公积金 {{ fmtMoney(result.fundMonthly) }}｜商贷 {{ fmtMoney(result.comMonthly) }}
          </span>
        </div>
        <div class="info-line">
          <span>公积金抵扣后自付</span>
          <span class="info-value" :class="{ 'is-zero': result.selfPay === 0 }">
            ¥{{ fmtMoney(result.selfPay) }}
          </span>
        </div>
        <div class="info-line">
          <span>总利息</span>
          <span class="info-value">{{ result.totalInterestW.toFixed(2) }} 万</span>
        </div>
      </div>

      <div class="result-ratios">
        <div class="info-line">
          <span>原月供占税后</span>
          <span class="info-value" :class="{ 'is-warn': warnOrigin }">
            {{ fmtPercent(result.rateOrigin, 1) }}
          </span>
        </div>
        <div class="info-line">
          <span>抵扣后自付占税后</span>
          <span class="info-value" :class="{ 'is-warn': warnSelf }">
            {{ fmtPercent(result.rateSelf, 1) }}
          </span>
        </div>
        <p v-if="!hasSalary" class="ratio-hint">未填写收入</p>
      </div>

      <button class="btn btn-primary add-btn" type="button" @click="emit('add')">+ 加入对比</button>

      <p class="result-note">
        公积金冲抵为估算模型：优先冲公积金月供，剩余冲商贷；各地公积金政策不同，仅预算参考。收入占比基于税后到手工资。配置与对比方案自动本地保存。
      </p>
    </template>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../ui/SectionCard.vue'
import { fmtMoney, fmtPercent } from '../../core/format.js'

const props = defineProps({
  result: { type: Object, required: true },
  settings: { type: Object, required: true },
  ready: { type: Boolean, default: false }
})

const emit = defineEmits(['add'])

const isEqualPrincipal = computed(() => props.settings.payMode === 'equalPrincipal')

const payCaption = computed(() => (isEqualPrincipal.value ? '首月应还（元）' : '每月应还（元）'))

const lastMonthTotal = computed(() => {
  const fund = Number(props.result.fundLoan?.lastMonth)
  const com = Number(props.result.comLoan?.lastMonth)
  return (Number.isFinite(fund) ? fund : 0) + (Number.isFinite(com) ? com : 0)
})

const hasSalary = computed(() => Number(props.settings.monthSalary) > 0)

const warnOrigin = computed(() => typeof props.result.rateOrigin === 'number' && props.result.rateOrigin >= 50)
const warnSelf = computed(() => typeof props.result.rateSelf === 'number' && props.result.rateSelf >= 50)
</script>

<style scoped>
.result-hero {
  padding: 2px 0 10px;
}

.hero-caption {
  margin-bottom: 2px;
  font-size: 13px;
  color: var(--c-text-3);
}

.hero-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--c-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.hero-last {
  margin-top: 4px;
  font-size: 13px;
  color: var(--c-text-3);
  font-variant-numeric: tabular-nums;
}

.result-lines,
.result-ratios {
  padding: 4px 0;
}

.result-ratios {
  border-top: 1px dashed var(--c-border-soft);
  margin-top: 4px;
}

.info-line {
  margin: 8px 0;
}

.info-value {
  max-width: 62%;
  text-align: right;
  color: var(--c-text);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.info-value.is-zero {
  color: var(--c-success);
}

.info-value.is-warn {
  color: var(--c-warning);
  font-weight: 600;
}

.ratio-hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--c-text-3);
  text-align: right;
}

.add-btn {
  width: 100%;
  margin-top: 14px;
  min-height: 40px;
  font-size: 15px;
}

.result-note {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--c-text-3);
}
</style>
