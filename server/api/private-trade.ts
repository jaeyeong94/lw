import { query } from "~/server/lib/pg";

interface IQuery {
  account: string;
  exchange: string;
  pair: string;
  timeframe: 'y' | 'd' | 'h';
  period: string; // Group by period with timestamp
  minPrice: string;
  maxPrice: string;
  minTimestamp: string;
  maxTimestamp: string;
}

export default defineEventHandler(async (event) => {
  const params: IQuery = getQuery(event);

  if(!params.account || !params.exchange || !params.pair || !params.minPrice || !params.maxPrice || !params.minTimestamp || !params.maxTimestamp) {
    throw new Error('Invalid query params');
  }

  const options = {
    account: params.account,
    exchange: params.exchange,
    pair: params.pair,
    timeframe: params.timeframe || 'y',
    period: params.period || '1m',
    minPrice: Number(params.minPrice),
    maxPrice: Number(params.maxPrice),
    minTimestamp: Number(params.minTimestamp) * 1000,
    maxTimestamp: Number(params.maxTimestamp) * 1000,
  }

  return await query(
    `SELECT timestamp, side, price, size FROM private_trade WHERE account = $1 AND exchange = $2 AND pair = $3 AND price BETWEEN $4 AND $5 AND timestamp BETWEEN $6 AND $7 ORDER BY timestamp`,
    [options.account, options.exchange, options.pair, options.minPrice, options.maxPrice, options.minTimestamp, options.maxTimestamp]
  );
})
