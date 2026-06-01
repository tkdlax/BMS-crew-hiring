import sql from "mssql";
import { config } from "../config.js";

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!config.sqlConnectionString) {
    throw new Error("SQL_CONNECTION_STRING is not configured");
  }
  if (!pool) {
    pool = await sql.connect(config.sqlConnectionString);
  }
  return pool;
}

export function t(name: string): string {
  return `${config.tablePrefix}${name}`;
}
