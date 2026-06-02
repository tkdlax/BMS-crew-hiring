import type sql from "mssql";

/** Parse ADO.NET / Azure SQL connection strings for the mssql driver. */
export function parseSqlConfig(raw: string): sql.config {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error(
      "SQL_CONNECTION_STRING is not set. Add it in Azure Function App → Environment variables."
    );
  }

  const map = new Map<string, string>();
  for (const part of trimmed.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (key) map.set(key, value);
  }

  const serverRaw =
    map.get("server") ?? map.get("data source") ?? map.get("address");
  const database = map.get("database") ?? map.get("initial catalog");
  const user = map.get("user id") ?? map.get("uid") ?? map.get("user");
  const password = map.get("password") ?? map.get("pwd");

  if (!serverRaw) {
    throw new Error(
      'SQL_CONNECTION_STRING must include Server= (or Data Source=). Example: Server=tcp:yourserver.database.windows.net,1433;Database=BMSHiring;User Id=...;Password=...;Encrypt=true'
    );
  }
  if (!database) {
    throw new Error(
      "SQL_CONNECTION_STRING must include Database= or Initial Catalog="
    );
  }

  let host = serverRaw;
  let port = 1433;
  const withoutTcp = serverRaw.replace(/^tcp:/i, "");
  if (withoutTcp.includes(",")) {
    const [h, p] = withoutTcp.split(",", 2);
    host = h.trim();
    port = parseInt(p.trim(), 10) || 1433;
  } else {
    host = withoutTcp.trim();
  }

  const encrypt = (map.get("encrypt") ?? "true").toLowerCase() !== "false";
  const trustServerCertificate =
    (map.get("trustservercertificate") ?? "false").toLowerCase() === "true";

  return {
    server: host,
    port,
    database,
    user,
    password,
    options: {
      encrypt,
      trustServerCertificate,
    },
    connectionTimeout: parseInt(map.get("connection timeout") ?? "30", 10) * 1000,
    requestTimeout: 30000,
  };
}
