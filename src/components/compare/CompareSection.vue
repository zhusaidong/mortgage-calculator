<template>
  <SectionCard title="方案对比" icon="📋">
    <div class="compare-head">
      <div class="btn-group">
        <button class="btn" type="button" :disabled="!items.length" @click="emit('open-modal')">
          📱 横屏查看
        </button>
        <button class="btn" type="button" :disabled="!items.length" @click="emit('export')">
          导出 CSV
        </button>
        <button class="btn btn-danger" type="button" :disabled="!items.length" @click="emit('clear')">
          清空全部
        </button>
      </div>
    </div>
    <p class="table-tip">👉 横屏查看：打开竖版转置表格，项目在左侧竖向排列</p>
    <CompareTable :items="items" @remove="emit('remove', $event)" />
  </SectionCard>
</template>

<script setup>
import SectionCard from '../ui/SectionCard.vue'
import CompareTable from './CompareTable.vue'

defineProps({
  items: { type: Array, default: () => [] }
})

const emit = defineEmits(['remove', 'clear', 'export', 'open-modal'])
</script>

<style scoped>
.compare-head {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-group .btn {
  min-height: 34px;
}

.table-tip {
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--c-text-2);
}

@media (max-width: 900px) {
  .compare-head {
    justify-content: stretch;
  }

  .btn-group {
    width: 100%;
  }

  .btn-group .btn {
    flex: 1 1 auto;
  }
}
</style>
