<template>
  <div class="index">
    <l-t-model
      modelUrl="/model/lou.glb"
      :step="step"
      @clickModelItem="onClick"
    ></l-t-model>
  </div>
</template>

<script>
  import LTModel from '@/components/LTModel/Index.vue'
  export default {
    name: 'Index',
    components: { LTModel },
    data() {
      return {
        step: 0
      }
    },
    methods: {
      onClick(item) {
        console.log('item', item)
      },
    },
  }
</script>

<style scoped>
  .index {
    width: 100%;
    height: 100%;
  }
</style>
