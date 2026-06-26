import { Pool, types, type QueryResultRow } from "pg";

types.setTypeParser(1114, (value) => new Date(`${value}Z`).toISOString());
types.setTypeParser(1184, (value) => new Date(value).toISOString());

const globalForDb = globalThis as unknown as {
  warrantyDbPool?: Pool;
};

function encodeDbPassword(value: string) {
  return encodeURIComponent(value);
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const database = process.env.POSTGRES_DB;
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD_URL_ENCODED || process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST || "postgres";
  const port = process.env.POSTGRES_PORT || "5432";

  if (!database || !user || !password) {
    return null;
  }

  const safePassword = process.env.POSTGRES_PASSWORD_URL_ENCODED ? password : encodeDbPassword(password);
  return `postgresql://${user}:${safePassword}@${host}:${port}/${database}`;
}

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}

export function getDatabasePool() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("Missing PostgreSQL configuration");
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
