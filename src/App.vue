<template>
  <div class="page">
    <div class="layout">
      <main class="pane-left">
        <IncomeSection :settings="settings" />
        <HouseSection :settings="settings" :result="result" :ready="ready" />
        <LoanSection
          :settings="settings"
          :result="result"
          :ready="ready"
        />
      </main>

      <aside class="pane-right">
        <ResultPanel
          :settings="settings"
          :result="result"
          :ready="ready"
          @add="addToCompare"
          @affordability="affordabilityOpen = true"
          @repayment-compare="repaymentCompareOpen = true"
        />
      </aside>
    </div>

    <section class="pane-detail">
      <RepaymentDetailSection :settings="settings" :ready="ready" />
    </section>

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
    <AffordabilityModal v-model="affordabilityOpen" :settings="settings" />
    <RepaymentCompareModal v-model="repaymentCompareOpen" :settings="settings" />

    <ReportSheet :settings="settings" :result="result" :ready="ready" />
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
import RepaymentDetailSection from './components/business/RepaymentDetailSection.vue'
import CompareSection from './components/compare/CompareSection.vue'
import CompareModal from './components/compare/CompareModal.vue'
import AffordabilityModal from './components/tools/AffordabilityModal.vue'
import RepaymentCompareModal from './components/tools/RepaymentCompareModal.vue'
import ReportSheet from './components/report/ReportSheet.vue'

const { settings, result, ready, compareList, addToCompare, removeCompare, clearCompare } =
  useLoanCalc()

const modalOpen = ref(false)
const affordabilityOpen = ref(false)
const repaymentCompareOpen = ref(false)

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

.pane-detail {
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

  .pane-detail {
    margin-top: 16px;
  }
}
</style>
