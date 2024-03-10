<template>
  <div v-if='loading' class="stack-tab-loading-mask">
    <div class="stack-tab-loading--spin turn" />
  </div>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import {useEmitter} from '@/lib/hooks/useTabMitt'
const props = defineProps<{
  tId:string
}>()
const emitter = useEmitter()
const loading = ref<boolean>(false)
emitter.on("loading",({tId,value}:any)=> {
  if(tId===props.tId){
    loading.value=value
  }
})
</script>
<style scoped>

</style>
