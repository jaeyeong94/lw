<script setup lang="ts">
import { CanvasRenderingTarget2D } from "fancy-canvas";
import { onMounted, ref } from 'vue';
import {
  createChart,
  type IChartApi,
  type ISeriesPrimitive, type ISeriesPrimitivePaneRenderer,
  type ISeriesPrimitivePaneView,
  type SeriesPrimitivePaneViewZOrder
} from 'lightweight-charts';

const { data: kline } = await useFetch('/api/kline', { method: 'GET', params: { exchange: 'lbank', pair: 'MRB-USDT-SPOT', interval: '1m' } });
console.log(kline.value);

// const { data: volumeProfile } = await useFetch('/api/volume-profile', { method: 'GET' });
// console.log(volumeProfile.value);

const candlestickData = [
  { time: '2022-12-01', open: 100, high: 110, low: 90, close: 105 },
  { time: '2022-12-02', open: 105, high: 115, low: 95, close: 100 },
  { time: '2022-12-03', open: 100, high: 120, low: 95, close: 115 },
  { time: '2022-12-04', open: 115, high: 130, low: 110, close: 120 },
  { time: '2022-12-05', open: 120, high: 140, low: 110, close: 135 },
];

const volumeProfileData = [
  { price: 90, volume: 10 },
  { price: 100, volume: 30 },
  { price: 110, volume: 50 },
  { price: 120, volume: 40 },
  { price: 130, volume: 20 },
  { price: 140, volume: 10 },
  { price: 90, volume: 10 },
  { price: 100, volume: 30 },
  { price: 90, volume: 10 },
  { price: 100, volume: 30 },
  { price: 110, volume: 50 },
  { price: 120, volume: 40 },
  { price: 130, volume: 20 },
  { price: 140, volume: 10 },
  { price: 90, volume: 10 },
  { price: 120, volume: 40 },
  { price: 130, volume: 20 },
  { price: 140, volume: 10 },
  { price: 110, volume: 50 },
  { price: 100, volume: 30 },
  { price: 110, volume: 50 },
  { price: 90, volume: 10 },
  { price: 120, volume: 40 },
  { price: 130, volume: 20 },
  { price: 140, volume: 10 },
  { price: 100, volume: 30 },
  { price: 110, volume: 50 },
  { price: 120, volume: 40 },
  { price: 130, volume: 20 },
  { price: 140, volume: 10 },
];

class VolumeProfilePrimitive implements ISeriesPrimitive<'Candlestick'> {
  private readonly _paneView: VolumeProfilePaneView;

  constructor() {
    this._paneView = new VolumeProfilePaneView();
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this._paneView];
  }
}

class VolumeProfilePaneView implements ISeriesPrimitivePaneView {
  zOrder(): SeriesPrimitivePaneViewZOrder {
    return 'top';
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return {
      draw: (target: CanvasRenderingTarget2D) => {
        target.useBitmapCoordinateSpace((scope) => {
          const ctx = scope.context;
          const { width, height } = scope.bitmapSize;
          ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
          ctx.fillRect(0, 0, width, height);
        });
      },
    };
  }
}

const chartContainer = ref<HTMLDivElement | null>(null);
onMounted(() => {
  if (chartContainer.value) {
    const chart: IChartApi = createChart(chartContainer.value, {
      width: 800,
      height: 400,
      layout: {
        textColor: '#000',
      },
      autoSize: false,
      handleScale: false,
      handleScroll: false,
      kineticScroll: {
        touch: false,
        mouse: false,
      },
    });

    const priceScale = chart.priceScale('right');
    const primitive = new VolumeProfilePrimitive();
    const candlestickSeries = chart.addCandlestickSeries();
    candlestickSeries.priceScale().applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
    });

    priceScale.applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
    });

    candlestickSeries.attachPrimitive(primitive);
    candlestickSeries.setData(candlestickData);
  }
});
</script>

<template>
  <div class="chart-container">
    <div ref="chartContainer" class="chart"></div>
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  width: 800px;
  height: 400px;
}
.chart {
  width: 100%;
  height: 100%;
}
</style>
