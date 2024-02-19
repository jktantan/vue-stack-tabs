<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  beforeRouteEnter(to, from) {
    console.log(to)
    console.log(from)
  },
  props: ['routerComponent']
})
</script>

<template>
  <component :is="routerComponent" />
</template>

<style scoped lang="scss"></style>
