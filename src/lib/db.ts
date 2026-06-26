import { Pool, types, type QueryResultRow } from "pg";

types.setTypeParser(1114, (value) => new Date(`${value}Z`).toISOString());
types.setTypeParser(1184, (value) => new Date(value).toISOString());

const globalForDb = globalThis as unknown as {
  warrantyDbPool?: Pool;
};

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabasePool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!globalForDb.warrantyDbPool) {
    globalForDb.warrantyDbPool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 10),
      ssl:
        process.env.DATABASE_SSL === "true"
          ? {
              rejectUnauthorized: false,
            }
          : false,
    });
  }

  return globalForDb.warrantyDbPool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await getDatabasePool().query<T>(text, values);
  return result;
}
