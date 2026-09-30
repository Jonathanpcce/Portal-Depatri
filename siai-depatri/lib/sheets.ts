import { sheetsClient } from "@/lib/google";

export async function readRange(spreadsheetId: string, range: string) {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (res.data.values || []) as string[][];
}

export async function appendRow(spreadsheetId: string, range: string, values: unknown[]) {
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] }
  });
}

export function rowsToObjects(rows: string[][]) {
  if (!rows.length) return [];
  const headers = rows[0].map(String);
  return rows.slice(1).filter(r => r.some(Boolean)).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ""; });
    return obj;
  });
}
