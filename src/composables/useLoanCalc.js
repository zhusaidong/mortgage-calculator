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

export function useLoanCalc() {
  const settings = reactive(loadSettings())
  const compareList = ref(loadCompareList())
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

  // 房价或首付变化后总贷款可能变小，公积金输入停在旧值会让滑块与计算结果不一致，这里同步收敛
  watch(
    () => result.value.totalLoanW,
    (total) => {
      if (settings.fundAmt > total) settings.fundAmt = Math.max(0, Math.floor(total))
    }
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
    addToCompare,
    removeCompare,
    clearCompare
  }
}
