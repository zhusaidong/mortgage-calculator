import { reactive, ref, computed, watch } from 'vue'
import { computeResult, buildCompareItem } from '../core/calc.js'
import {
  hasStoredSettings,
  loadSettings,
  saveSettings,
  loadCompareList,
  saveCompareList,
  clearCompareList
} from '../core/storage.js'
import { LOAN_TYPE } from '../core/constants.js'

export function useLoanCalc() {
  const settings = reactive(loadSettings())
  const compareList = ref(loadCompareList())
  const loanType = ref(LOAN_TYPE.COMBO)
  // ready 表达“用户是否已录入过参数”：回访（有存档）直接出结果，首次访问保持结果区空白
  const ready = ref(hasStoredSettings())
  const result = computed(() => computeResult(settings))

  watch(
    settings,
    () => {
      ready.value = true
      saveSettings(settings)
    },
    { deep: true }
  )

  function addToCompare() {
    if (!ready.value) return
    compareList.value.push(buildCompareItem(settings, result.value))
    saveCompareList(compareList.value)
  }

  function removeCompare(index) {
    if (index < 0 || index >= compareList.value.length) return
    compareList.value.splice(index, 1)
    saveCompareList(compareList.value)
  }

  function clearCompare() {
    compareList.value = []
    clearCompareList()
  }

  return {
    settings,
    result,
    ready,
    compareList,
    loanType,
    addToCompare,
    removeCompare,
    clearCompare
  }
}
