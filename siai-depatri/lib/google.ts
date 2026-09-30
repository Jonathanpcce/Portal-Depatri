import { google } from "googleapis";

function privateKey() {
  const raw = process.env.GOOGLE_PRIVATE_KEY;
  return raw ? raw.replace(/\\n/g, "\n") : undefined;
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && privateKey());
}

function auth() {
  if (!googleConfigured()) {
    throw new Error("Google API não configurada no servidor.");
  }
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey(),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents"
    ]
  });
}

export function sheetsClient() {
  return google.sheets({ version: "v4", auth: auth() });
}

export function driveClient() {
  return google.drive({ version: "v3", auth: auth() });
}

export function docsClient() {
  return google.docs({ version: "v1", auth: auth() });
}
