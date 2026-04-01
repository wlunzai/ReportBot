import { google } from 'googleapis';

export async function querySheets(sourceConfig, queryText) {
  // queryText format: "SheetName!A1:D100" or just "Sheet1"
  const { spreadsheet_id, credentials_json } = sourceConfig;

  let auth;
  if (credentials_json) {
    const creds = typeof credentials_json === 'string' ? JSON.parse(credentials_json) : credentials_json;
    auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  } else {
    throw new Error('No Google credentials provided in source_config.credentials_json or GOOGLE_APPLICATION_CREDENTIALS');
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const range = queryText || 'Sheet1';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet_id,
    range,
  });

  const values = response.data.values || [];
  if (values.length === 0) {
    return { columns: [], rows: [], rowCount: 0 };
  }

  const columns = values[0];
  const rows = values.slice(1).map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i] ?? null; });
    return obj;
  });

  return { columns, rows, rowCount: rows.length };
}
