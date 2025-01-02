<script setup lang="ts">
import { CanvasRenderingTarget2D } from "fancy-canvas";
import { computed, onMounted, ref } from 'vue';
import {
  createChart,
  type CandlestickData,
  type Time,
  type IChartApi,
  type ISeriesPrimitive,
  type ISeriesPrimitivePaneRenderer,
  type ISeriesPrimitivePaneView,
  type SeriesPrimitivePaneViewZOrder,
  type UTCTimestamp,
  type LogicalRange,
  type ISeriesApi
} from 'lightweight-charts';
import BigNumber from "bignumber.js";

interface KlineItem {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: string;
}

interface PrivateTradeItem {
  timestamp: string;
  side: string;
  price: string;
  size: number;
}

interface KlineResponse {
  count: number;
  rows: KlineItem[];
}

interface PrivateTradeResponse {
  count: number;
  rows: PrivateTradeItem[];
}

interface VolumeBin {
  startPrice: BigNumber;
  endPrice: BigNumber;
  midPrice: BigNumber;
  volume: BigNumber;
  buyVolume: BigNumber;
  sellVolume: BigNumber;
}

const candlestickData = ref<CandlestickData<Time>[]>([]);
const viewPortCandleData = ref<CandlestickData<Time>[]>([]);
const privateTradeData = ref<PrivateTradeItem[]>([]);
const volumeProfileData = ref<VolumeBin[]>([]);
const chartInfo = reactive({
  account: 'MRB_MM',
  exchange: 'lbank',
  pair: 'MRB-USDT-SPOT',
  timeframe: 'y',
  volumeProfileSplit: 10,
  period: '1m',
  maxPrice: computed(() => {
    return viewPortCandleData.value.length
        ? Math.max(...viewPortCandleData.value.map((item) => item.high))
        : 0;
  }),
  minPrice: computed(() => {
    return viewPortCandleData.value.length
        ? Math.min(...viewPortCandleData.value.map((item) => item.low))
        : 0;
  }),
  minTimestamp: computed(() => {
    return viewPortCandleData.value.length
        ? Math.min(...viewPortCandleData.value.map((item) => item.time as UTCTimestamp))
        : 0;
  }),
  maxTimestamp: computed(() => {
    return viewPortCandleData.value.length
        ? Math.max(...viewPortCandleData.value.map((item) => item.time as UTCTimestamp))
        : 0;
  }),
});

const { data: kline } = await useFetch<KlineResponse>('/api/kline', { method: 'GET', params: { exchange: 'lbank', pair: 'MRB-USDT-SPOT', timeframe: 'y', period: '1m' } });
if (kline.value && Array.isArray(kline.value.rows)) {
  candlestickData.value = kline.value.rows.map((item: KlineItem): CandlestickData<Time> & { volume: number } => {
    return {
      time: parseInt(item.timestamp) / 1000 as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: parseFloat(item.volume),
    };
  });
}

class VolumeProfilePrimitive implements ISeriesPrimitive<'Candlestick'> {
  private readonly _paneView: VolumeProfilePaneView;

  constructor(
      private candleStickSeries: ISeriesApi<'Candlestick'>,
      private volumeProfileDataRef: typeof volumeProfileData,
  ) {
    this._paneView = new VolumeProfilePaneView(this.candleStickSeries, this.volumeProfileDataRef, this.privateTradeDataRef);
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this._paneView];
  }
}

class VolumeProfilePaneView implements ISeriesPrimitivePaneView {
  constructor(
      private candleStickSeries: ISeriesApi<'Candlestick'>,
      private volumeProfileDataRef: typeof volumeProfileData,
  ) {}

  zOrder(): SeriesPrimitivePaneViewZOrder {
    return 'top';
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return {
      draw: (target: CanvasRenderingTarget2D) => {
        target.useBitmapCoordinateSpace((scope) => {
          const ctx = scope.context;
          const { width, height } = scope.bitmapSize;
          const volumeBins = this.volumeProfileDataRef.value;
          if (!volumeBins || volumeBins.length === 0) {
            return;
          }

          const maxVolume = Math.max(...volumeBins.map(b => b.volume.toNumber()));
          const maxBarWidth = width * 0.6;
          const scale = maxBarWidth / Math.max(1, maxVolume);

          volumeBins.forEach((bin) => {
            const y1 = this.candleStickSeries.priceToCoordinate(bin.startPrice.toNumber());
            const y2 = this.candleStickSeries.priceToCoordinate(bin.endPrice.toNumber());
            if (y1 == null || y2 == null) return;

            const top = Math.min(y1, y2);
            const bottom = Math.max(y1, y2);
            const boxHeight = bottom - top;

            const totalBarWidth = bin.volume.multipliedBy(scale).toNumber();
            const buyBarWidth = bin.buyVolume.multipliedBy(scale).toNumber();
            const sellBarWidth = bin.sellVolume.multipliedBy(scale).toNumber();

            const x = 0;

            /** Public Volume */
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(x, top, totalBarWidth, boxHeight);

            /** Buy / Sell Volume */
            ctx.fillStyle = 'rgba(0, 128, 0, 0.4)';
            ctx.fillRect(x, top, buyBarWidth, boxHeight);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.fillRect(x + buyBarWidth, top, sellBarWidth, boxHeight);

            const volumeStr = bin.volume.toFixed(2);
            const buyStr = bin.buyVolume.toFixed(2);
            const sellStr = bin.sellVolume.toFixed(2);
            const totalVolume = bin.volume.plus(bin.buyVolume).plus(bin.sellVolume);

            ctx.fillStyle = '#000';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';

            if(totalVolume.isGreaterThanOrEqualTo(300)) {
              if(totalBarWidth) {
                ctx.fillText(`\$${volumeStr}`, x + buyBarWidth + sellBarWidth + 3, top + boxHeight / 2 + 4);
              }

              if(buyBarWidth) {
                ctx.fillText(`\$${buyStr}`, x + 3, top + boxHeight / 2 + 4);
              }

              if(sellBarWidth ) {
                ctx.fillText(`\$${sellStr}`, x + buyBarWidth + 3, top + boxHeight / 2 + 4);
              }
            }
          });
        });
      },
    };
  }
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: number | undefined;
  return function (...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

function binarySearchCandlesByTime(
    candles: CandlestickData<Time>[],
    targetTime: UTCTimestamp,
    findStartIndex: boolean
): number {
  let low = 0;
  let high = candles.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midTime = candles[mid].time as UTCTimestamp;

    if (midTime === targetTime) {
      result = mid;
      findStartIndex ? (high = mid - 1) : (low = mid + 1);
    } else if (midTime < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return findStartIndex ? low : high;
}

function filterCandlestickDataByRangeBinarySearch(
    data: CandlestickData<Time>[],
    from: UTCTimestamp,
    to: UTCTimestamp
): CandlestickData<Time>[] {
  const fromIndex = binarySearchCandlesByTime(data, from, true);
  const toIndex = binarySearchCandlesByTime(data, to, false);
  const start = Math.max(0, Math.min(fromIndex, data.length - 1));
  const end = Math.max(0, Math.min(toIndex,   data.length - 1));

  if (start > end) {
    return [];
  }

  return data.slice(start, end + 1);
}

function buildVolumeProfile(
    data: CandlestickData<Time>[] & { volume?: number }[],
    tradeData: PrivateTradeItem[],
    minPrice: number,
    maxPrice: number,
    volumeProfileSplit: number
): VolumeBin[] {
  const bnMinPrice = new BigNumber(minPrice);
  const bnMaxPrice = new BigNumber(maxPrice);
  const bnVolumeProfileSplit = new BigNumber(volumeProfileSplit);

  if (
      bnMinPrice.isGreaterThanOrEqualTo(bnMaxPrice) ||
      bnVolumeProfileSplit.isLessThanOrEqualTo(0)
  ) {
    return [];
  }

  const range = bnMaxPrice.minus(bnMinPrice);
  const binSize = range.dividedBy(bnVolumeProfileSplit);

  const splitCount = bnVolumeProfileSplit.toNumber();
  const bins: VolumeBin[] = Array.from({ length: splitCount }, (_, i) => {
    const startPrice = bnMinPrice.plus(binSize.multipliedBy(i));
    const endPrice = startPrice.plus(binSize);
    const midPrice = startPrice.plus(binSize.dividedBy(2));

    return {
      startPrice,
      endPrice,
      midPrice,
      volume: new BigNumber(0),
      buyVolume: new BigNumber(0),
      sellVolume: new BigNumber(0),
    };
  });

  for (const candle of data) {
    const candleVolume = new BigNumber(candle.volume ?? 0);
    const candlePrice = new BigNumber(candle.high)
        .plus(candle.low)
        .dividedBy(2);

    if (
        candlePrice.isLessThan(bnMinPrice) ||
        candlePrice.isGreaterThan(bnMaxPrice)
    ) {
      continue;
    }

    const binIndex = candlePrice
        .minus(bnMinPrice)
        .dividedBy(binSize)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toNumber();

    if (binIndex >= 0 && binIndex < bins.length) {
      bins[binIndex].volume = bins[binIndex].volume.plus(candleVolume.multipliedBy(candlePrice));
    }
  }

  for (const trade of tradeData) {
    const tradePrice = new BigNumber(trade.price);
    const tradeSize = new BigNumber(trade.size);

    if (
        tradePrice.isLessThan(bnMinPrice) ||
        tradePrice.isGreaterThan(bnMaxPrice)
    ) {
      continue;
    }

    const binIndex = tradePrice
        .minus(bnMinPrice)
        .dividedBy(binSize)
        .integerValue(BigNumber.ROUND_FLOOR)
        .toNumber();

    if (binIndex >= 0 && binIndex < bins.length) {
      if (trade.side === 'buy') {
        bins[binIndex].buyVolume = bins[binIndex].buyVolume.plus(tradeSize.multipliedBy(tradePrice));
      } else if (trade.side === 'sell') {
        bins[binIndex].sellVolume = bins[binIndex].sellVolume.plus(tradeSize.multipliedBy(tradePrice));
      }
    }
  }

  return bins;
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
      rightPriceScale: {
        visible: true,
        autoScale: true,
      },
      timeScale: {
        rightOffset: 12,
        barSpacing: 6,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        borderVisible: false,
        borderColor: '#fff000',
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: UTCTimestamp) => {
          return new Date(time * 1000 as number).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        },
      },
      localization: {
        dateFormat: 'yyyy-MM-dd',
        timeFormatter: (time: UTCTimestamp) => {
          return new Date(time * 1000).toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
        },
      },
      autoSize: true,
      handleScale: false,
      handleScroll: true,
      kineticScroll: {
        touch: false,
        mouse: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries();
    const primitive = new VolumeProfilePrimitive(candlestickSeries, volumeProfileData);
    candlestickSeries.attachPrimitive(primitive);
    candlestickSeries.setData(candlestickData.value);
    candlestickSeries.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
    });

    const handleRangeChange = debounce(async (logicalRange: LogicalRange) => {
      const barInfo: any = candlestickSeries.barsInLogicalRange(logicalRange);
      if (!barInfo || barInfo.from === null || barInfo.to === null) return;
      const { data: privateTrade } = await useFetch<PrivateTradeResponse>('/api/private-trade', { method: 'GET', params: { exchange: 'lbank', pair: 'MRB-USDT-SPOT', timeframe: 'y', period: '1m', account: chartInfo.account, minPrice: chartInfo.minPrice, maxPrice: chartInfo.maxPrice, minTimestamp: chartInfo.minTimestamp, maxTimestamp: chartInfo.maxTimestamp } });
      if (privateTrade.value && Array.isArray(privateTrade.value.rows)) {
        privateTradeData.value = privateTrade.value.rows;
      }

      viewPortCandleData.value = filterCandlestickDataByRangeBinarySearch(
          candlestickData.value,
          barInfo.from,
          barInfo.to
      );

      volumeProfileData.value = buildVolumeProfile(
          viewPortCandleData.value,
          privateTradeData.value,
          chartInfo.minPrice,
          chartInfo.maxPrice,
          chartInfo.volumeProfileSplit
      );
    }, 200);

    /** Only Dev */
    chart.timeScale().setVisibleRange({
      from: 1735635600 as Time,
      to: 1735642800 as Time,
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if(logicalRange === null) {
        return;
      }

      handleRangeChange(logicalRange);
    });

    // Init
    handleRangeChange(chart.timeScale().getVisibleLogicalRange()!);
  }
});
</script>

<template>
  <div class="chart-container">
    <div ref="chartContainer" class="chart"></div>
  </div>
  <div>
    <p>{{ chartInfo }}</p>
    <p>{{ volumeProfileData }}</p>
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
