<template>
  <SectionCard icon="👤" title="收入与公积金">
    <div class="income-grid">
      <NumberField
          :model-value="settings.monthSalary || ''"
          label="每月税后工资"
          labelTip="选填，用于计算你的现金流比例"
          min="0"
          placeholder="如 20000"
          step="100"
          unit="元"
          @update:model-value="v => settings.monthSalary = toNum(v)"
      />
      <NumberField
          :model-value="settings.monthPreTaxSalary || ''"
          label="每月税前工资"
          labelTip="选填，用于计算银行审批的偿贷比，银行一般要求房贷月供不超过月收入的 50%"
          min="0"
          placeholder="如 20000"
          step="100"
          unit="元"
          @update:model-value="v => settings.monthPreTaxSalary = toNum(v)"
      />
      <NumberField
          :model-value="settings.monthGjj || ''"
          label="每月缴存公积金"
          labelTip="选填，用于计算你的公积金冲抵商贷后的现金流比例"
          min="0"
          placeholder="如 20000"
          step="100"
          unit="元"
          @update:model-value="v => settings.monthGjj = toNum(v)"
      />
    </div>
  </SectionCard>
</template>

<script setup>
import SectionCard from '../ui/SectionCard.vue'
import NumberField from '../ui/NumberField.vue'

const props = defineProps({settings: {type: Object, required: true}})

// 直接改 props.settings.housePrice —— 该对象来自 reactive()，改动会触发全链重算。
// 这是有意为之的共享状态写法，不要改成 emit 逐字段回传。

// NumberField 只回传字符串，空串按 0 处理，避免 '' 参与运算
function toNum(v) {
  return v === '' ? 0 : Number(v)
}
</script>

<style scoped>
.income-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 480px) {
  .income-grid {
    grid-template-columns: 1fr;
  }
}
</style>
