/**
 * Google Apps Script — deploy as Web App to receive form submissions.
 *
 * Setup:
 * 1. Create a Google Sheet with headers in row 1:
 *    Timestamp | Name | Contact | Address | Quantity | Design Number
 * 2. Extensions → Apps Script → paste this file → Save
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL into js/config.js as GOOGLE_SCRIPT_URL
 */

const SHEET_NAME = "Orders";

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Timestamp", "Name", "Contact", "Address", "Quantity", "Design Number"]);
  }
  return sheet;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet() {
  return jsonResponse_({ ok: true, message: "Design QR Forms endpoint is running." });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, error: "Missing request body." });
    }

    const data = JSON.parse(e.postData.contents);
    const name = String(data.name || "").trim();
    const contact = String(data.contact || "").trim();
    const address = String(data.address || "").trim();
    const quantity = String(data.quantity || "").trim();
    const designNumber = String(data.designNumber || "").trim();

    if (!name || !contact || !quantity || !designNumber) {
      return jsonResponse_({ success: false, error: "Required fields are missing." });
    }

    const sheet = getSheet_();
    sheet.appendRow([new Date(), name, contact, address, quantity, designNumber]);

    return jsonResponse_({ success: true });
  } catch (error) {
    return jsonResponse_({ success: false, error: String(error) });
  }
}
