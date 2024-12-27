import { query } from "~/server/lib/pg";

export default defineEventHandler(async (event) => {
  const params = event;
  console.log(params);
  const candles = await query(`SELECT * FROM public_candle`);

  return {
    hello: 'world1'
  }
})
