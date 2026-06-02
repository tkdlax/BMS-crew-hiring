import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../apps/api/local.settings.json"), "utf8")
);
const conn = process.env.SQL_CONNECTION_STRING || settings.Values?.SQL_CONNECTION_STRING;
const pool = await sql.connect(conn);
const r = await pool.request().query(`
  SELECT o.slug, o.location_label,
    JSON_VALUE(j.page_content, '$.address') AS pc_addr,
    JSON_VALUE(j.page_content, '$.jobDetails.location') AS pc_loc
  FROM hire_offices o
  LEFT JOIN hire_jobs j ON j.office_id = o.id AND j.slug = 'moving-operations-crew'
  WHERE o.slug IN ('denver','colorado-springs','grand-junction','salt-lake-city')
  ORDER BY o.slug
`);
console.table(r.recordset);
await pool.close();
