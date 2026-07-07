// google-apps-script/Code.gs
const SHEET_NAME = "Orders";
// Replace with your target Spreadsheet ID (from the sheet URL)
// e.g. const SPREADSHEET_ID = "1AbCdEfGhIjkLmNoPqRsTuVwXyZ";
const SPREADSHEET_ID = "1eV_oE5pFayuP32uqn8_NwHR_QhEbMZqEXY0_ROzV3q0";

function getSheet_() {
  if (!SPREADSHEET_ID) throw new Error("SPREADSHEET_ID not set in Code.gs");
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "Timestamp",
      "Billing Name",
      "Contact",
      "Billing Address",
      "GST No.",
      "Order No.",
      "Design Number",
      "Total Quantity",
      "Size S (36)",
      "Size M (38)",
      "Size L (40)",
      "Size XL (42)",
      "Size XXL (44)"
    ]);
  }
  return sheet;
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return jsonResponse_({ ok: true, message: "Design QR Forms endpoint is running." });
}

function doPost(e) {
  try {
    // Parse JSON body if present
    let data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = {};
      }
    }

    // Merge in form parameters if present
    const billingName = (data.billingName || e.parameter?.billingName || "").toString().trim();
    const contact = (data.contact || e.parameter?.contact || "").toString().trim();
    const billingAddress = (data.billingAddress || e.parameter?.billingAddress || "").toString().trim();
    const gst = (data.gst || e.parameter?.gst || "").toString().trim();
    const orderNumber = (data.orderNumber || e.parameter?.orderNumber || "").toString().trim();
    const designNumber = (data.designNumber || e.parameter?.designNumber || "").toString().trim();

    const sizeS = Number(data.sizeS || e.parameter?.sizeS || 0);
    const sizeM = Number(data.sizeM || e.parameter?.sizeM || 0);
    const sizeL = Number(data.sizeL || e.parameter?.sizeL || 0);
    const sizeXL = Number(data.sizeXL || e.parameter?.sizeXL || 0);
    const sizeXXL = Number(data.sizeXXL || e.parameter?.sizeXXL || 0);

    const totalQty = Number(data.quantity || e.parameter?.quantity || (sizeS + sizeM + sizeL + sizeXL + sizeXXL));

    // Basic required checks
    if (!billingName || !contact || !billingAddress || !gst || !designNumber || !totalQty) {
      return jsonResponse_({ success: false, error: "Required fields are missing or quantity is zero." });
    }

    // Contact basic digits check (server-side): at least 10 digits
    const digits = contact.replace(/\D/g, "");
    if (digits.length < 10) {
      return jsonResponse_({ success: false, error: "Contact number must include at least 10 digits." });
    }

    // GST validation: uppercase letters and digits only, length up to 15 (adjust to ^[0-9A-Z]{15}$ if you want exact GSTIN length)
    const gstRegex = /^[A-Z0-9]{1,15}$/;
    if (!gstRegex.test(gst)) {
      return jsonResponse_({ success: false, error: "Invalid GST format. Must contain only uppercase letters and digits (A-Z,0-9)." });
    }

    // Ensure sizes are non-negative integers
    const sizes = [sizeS, sizeM, sizeL, sizeXL, sizeXXL];
    for (let s of sizes) {
      if (!Number.isFinite(s) || s < 0) {
        return jsonResponse_({ success: false, error: "Size values must be zero or positive integers." });
      }
    }

    // Ensure sizes sum matches the provided total quantity (defensive)
    const sumSizes = sizeS + sizeM + sizeL + sizeXL + sizeXXL;
    if (sumSizes !== totalQty) {
      return jsonResponse_({ success: false, error: "Quantity mismatch: sum of size counts does not equal total quantity." });
    }

    // Append to sheet
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      billingName,
      contact,
      billingAddress,
      gst,
      orderNumber,
      designNumber,
      totalQty,
      sizeS,
      sizeM,
      sizeL,
      sizeXL,
      sizeXXL
    ]);

    return jsonResponse_({ success: true });
  } catch (error) {
    // Log for debugging
    try { Logger.log("doPost error: %s", String(error)); } catch (e) {}
    return jsonResponse_({ success: false, error: String(error) });
  }
}