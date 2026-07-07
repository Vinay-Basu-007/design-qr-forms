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
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonResponse_({ ok: true, message: "Endpoint running" });
}

function doPost(e) {
  try {
    let data = {};
    // Try to parse JSON body (fetch with application/json)
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = {};
      }
    }
    // Merge form parameters if present (HTML form POST or form-encoded fetch)
    data.name = (data.name || e.parameter?.name || "").toString().trim();
    data.contact = (data.contact || e.parameter?.contact || "").toString().trim();
    data.address = (data.address || e.parameter?.address || "").toString().trim();
    data.quantity = (data.quantity || e.parameter?.quantity || "").toString().trim();
    data.designNumber = (data.designNumber || e.parameter?.designNumber || "").toString().trim();

    if (!data.name || !data.contact || !data.quantity || !data.designNumber) {
      return jsonResponse_({ success: false, error: "Required fields missing." });
    }

    const sheet = getSheet_();
    sheet.appendRow([new Date(), data.name, data.contact, data.address, data.quantity, data.designNumber]);

    return jsonResponse_({ success: true });
  } catch (error) {
    return jsonResponse_({ success: false, error: String(error) });
  }
}