<template>
  <SectionCard title="收入与公积金" icon="👤">
    <div class="income-grid">
      <NumberField
        label="每月税后到手工资"
        unit="元"
        step="100"
        min="0"
        placeholder="如 20000"
        :model-value="settings.monthSalary || ''"
        @update:model-value="v => settings.monthSalary = toNum(v)"
      />
      <NumberField
        label="每月公积金合计"
        unit="元"
        step="100"
        min="0"
        placeholder="如 20000"
        :model-value="settings.monthGjj || ''"
        @update:model-value="v => settings.monthGjj = toNum(v)"
      />
    </div>
  </SectionCard>
</template>

<script setup>
import SectionCard from '../ui/SectionCard.vue'
import NumberField from '../ui/NumberField.vue'

const props = defineProps({ settings: { type: Object, required: true } })

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
