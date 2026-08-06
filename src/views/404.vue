<script setup lang="ts">
import { useTabRouter } from '@/lib'

const { backward } = useTabRouter()
const backto = () => {
  backward('/demo')
}
</script>

<template>
  <div>404</div>
</template>

<style scoped></style>
