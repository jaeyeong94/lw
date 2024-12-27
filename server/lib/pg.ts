import pg from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

const config = useRuntimeConfig();

pg.types.setTypeParser(
  1114,
  (value: string) => new Date(Date.parse(`${value}+0000`))
);

const { Pool } = pg;
const pool = new Pool({
  host: config.DATABASE_HOST,
  port: Number(config.DATABASE_PORT),
  user: config.DATABASE_USERNAME,
  password: config.DATABASE_PASSWORD,
  database: config.DATABASE_NAME,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 60000,
  query_timeout: 10000,
  max: 20,
  min: 4,
  ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(path.resolve('global-bundle.pem')).toString(),
  },
  options: `-c search_path=${config.DATABASE_SCHEMA}`,
});

interface IConfig {
  single: boolean;
}

type IQueryResponse =
  | {
  count: number;
  rows: Record<string, string | number>[];
}
  | {
  count: number;
  rows: Record<string, string | number>;
}
  | undefined;

export const query = async (
  query: string,
  variables: (string | number)[] = [],
  config: IConfig = {
    single: false,
  }
): Promise<IQueryResponse> => {
  const client = await pool.connect();
  const result = await client.query({
    text: query,
    values: variables,
  });

  client.release();

  const rows = result.rows;

  if (config.single) {
    if (Array.isArray(rows) && rows.length > 0) {
      return {
        count: result.rowCount ?? 0,
        rows: rows[0],
      };
    } else {
      return undefined;
    }
  } else {
    return {
      count: result.rowCount ?? 0,
      rows,
    };
  }
};
