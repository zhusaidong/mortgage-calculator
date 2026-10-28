<template>
  <section class="section-card" :class="{ 'is-dense': dense }">
    <header v-if="title || icon" class="section-head">
      <span v-if="icon" class="section-icon" aria-hidden="true">{{ icon }}</span>
      <h2 v-if="title" class="section-title">{{ title }}</h2>
    </header>
    <div class="section-body">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '' },
  dense: { type: Boolean, default: false }
})
</script>

<style scoped>
.section-card {
  background: var(--c-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 18px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-icon {
  font-size: 18px;
  line-height: 1;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--c-text);
  letter-spacing: -0.01em;
}

.section-card.is-dense {
  padding: 14px;
}

.section-card.is-dense .section-head {
  margin-bottom: 10px;
}

@media (max-width: 900px) {
  .section-card {
    padding: 16px;
  }
}
</style>
