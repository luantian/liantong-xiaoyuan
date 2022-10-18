<template>
  <div class="lt-model">
    <div class="spinner"></div>
    <div class="dropzone"></div>
    <div class="prev-btn" @click="onPrev">返回</div>
    <input type="file" name="file-input[]" id="file-input" multiple="" />
  </div>
</template>

<script>
import { LtModelApp } from "./index.js";

export default {
  name: "LTModel",
  props: {
    modelUrl: {
      type: String,
      required: true
    },
    step: {
      type: Number
    }
  },
  data() {
    return {};
  },
  mounted() {
    this._step = this.step;
    const customEvents = {
      clickModelItem: (params) => {
        // console.log('params', params)
        const { model } = params
        const { name } = model;
        if (name.indexOf("lou_02") > -1) {
          const { viewer } = this.ltModelApp;
          if (this._step >= 2) {
            this._step = 2;
          } else {
            this._step++;
          }
          viewer.byStepUpdate(this._step);
        }
        this.$emit("clickModelItem", params);
      },
      // clickLou: params => {

      // },
      // clickSxt: params => {
      //   this.$emit("clickSxt", params);
      // }
    };
    this.ltModelApp = new LtModelApp(
      document.body,
      location,
      {
        modelUrl: this.modelUrl,
        step: this.step
      },
      customEvents
    );
  },
  methods: {
    onPrev() {
      const { viewer } = this.ltModelApp;
      if (this._step <= 0) {
        this._step = 0;
      } else {
        this._step--;
      }
      viewer.byStepUpdate(this._step);
    }
  },
  watch: {
    step(newVal) {
      const { viewer } = this.ltModelApp;
      viewer.byStepUpdate(newVal);
    }
  }
};
</script>

<style scoped>
.lt-model,
.dropzone {
  width: 100%;
  height: 100%;
}

#file-input {
  opacity: 0;
  position: absolute;
  top: -10000px;
}

.prev-btn {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10000;
  cursor: pointer;
  color: #fff;
}
</style>
