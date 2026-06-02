import sql from "mssql";
import { config } from "../config.js";
import { parseSqlConfig } from "./sqlConfig.js";

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    const sqlConfig = parseSqlConfig(config.sqlConnectionString);
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

export function t(name: string): string {
  return `${config.tablePrefix}${name}`;
}
