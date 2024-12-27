import { query } from "~/server/lib/pg";

interface IQuery {
  exchange: string;
  pair: string;
  timeframe: 'y' | 'd' | 'h';
  period: string;
}

export default defineEventHandler(async (event) => {
  const params: IQuery = getQuery(event);

  if(!params.exchange || !params.pair) {
    throw new Error('Invalid query params');
  }

  const options = {
    exchange: params.exchange,
    pair: params.pair,
    timeframe: params.timeframe || 'y',
    period: params.period || '1m',
  }

  const candles = await query(
    `SELECT timestamp, open, high, low, close, volume FROM public_candle WHERE exchange = $1 AND pair = $2 AND period = $3`,
    [options.exchange, options.pair, options.period]
  );

  console.log(candles);

  return {
    hello: 'world1'
  }
});
