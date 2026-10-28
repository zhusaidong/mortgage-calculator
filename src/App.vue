<template>
  <div class="page">
    <div class="layout">
      <main class="pane-left">
        <IncomeSection :settings="settings" />
        <HouseSection :settings="settings" :result="result" :ready="ready" />
        <LoanSection
          :settings="settings"
          :result="result"
          :loan-type="loanType"
          :ready="ready"
          @update:loan-type="loanType = $event"
        />
      </main>

      <aside class="pane-right">
        <ResultPanel :settings="settings" :result="result" :ready="ready" @add="addToCompare" />
      </aside>
    </div>

    <section class="pane-compare">
      <CompareSection
        :items="compareList"
        @remove="removeCompare"
        @clear="clearCompare"
        @export="handleExport"
        @open-modal="modalOpen = true"
      />
    </section>

    <CompareModal v-model="modalOpen" :items="compareList" @remove="removeCompare" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLoanCalc } from './composables/useLoanCalc.js'
import { downloadCompareCsv } from './utils/csv.js'
import IncomeSection from './components/business/IncomeSection.vue'
import HouseSection from './components/business/HouseSection.vue'
import LoanSection from './components/business/LoanSection.vue'
import ResultPanel from './components/business/ResultPanel.vue'
import CompareSection from './components/compare/CompareSection.vue'
import CompareModal from './components/compare/CompareModal.vue'

const { settings, result, ready, compareList, loanType, addToCompare, removeCompare, clearCompare } =
  useLoanCalc()

const modalOpen = ref(false)

function handleExport() {
  downloadCompareCsv(compareList.value)
}
</script>

<style scoped>
.page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: var(--gap-page, 20px);
  align-items: start;
}

.pane-left {
  display: flex;
  flex-direction: column;
  gap: var(--gap-page, 20px);
  min-width: 0;
}

.pane-right {
  position: sticky;
  top: 16px;
}

.pane-compare {
  margin-top: var(--gap-page, 20px);
}

@media (max-width: 900px) {
  .page {
    padding: 12px;
  }

  .layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .pane-left {
    gap: 16px;
  }

  .pane-right {
    position: static;
  }

  .pane-compare {
    margin-top: 16px;
  }
}
</style>
