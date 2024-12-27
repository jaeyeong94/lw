<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { createChart } from 'lightweight-charts';

// DOM 참조를 위한 ref
const chartContainer01 = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (chartContainer01.value) {
    const chart = createChart(chartContainer01.value, { width: 400, height: 300 });
    const lineSeries = chart.addLineSeries();
    lineSeries.setData([
      { time: '2019-04-11', value: 80.01 },
      { time: '2019-04-12', value: 96.63 },
      { time: '2019-04-13', value: 76.64 },
      { time: '2019-04-14', value: 81.89 },
      { time: '2019-04-15', value: 74.43 },
      { time: '2019-04-16', value: 80.01 },
      { time: '2019-04-17', value: 96.63 },
      { time: '2019-04-18', value: 76.64 },
      { time: '2019-04-19', value: 81.89 },
      { time: '2019-04-20', value: 74.43 },
    ]);
  }
});
</script>

<template>
  <div class="container">
    <div ref="chartContainer01" class="chart"></div>
  </div>
</template>

<style scoped lang="scss">
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.chart {
  width: 400px;
  height: 300px;
}
</style>
