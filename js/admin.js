// js/admin.js (replace current contents with the following or apply these changes)

// Ensure we init only after DOM is ready
document.addEventListener('DOMContentLoaded', initAdmin);

function getBaseUrl() {
  const input = document.getElementById("baseUrl");
  const value = input ? input.value.trim() : "";
  return value || window.APP_CONFIG?.BASE_URL || window.location.origin;
}

function buildFormUrl(designNumber) {
  const base = getBaseUrl().replace(/\/$/, "");
  return `${base}/form.html?design=${encodeURIComponent(designNumber)}`;
}

function createQrCard(designNumber, url) {
  const item = document.createElement("div");
  item.className = "qr-item";

  const canvas = document.createElement("canvas");
  const label = document.createElement("div");
  label.className = "qr-label";
  label.textContent = designNumber;

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = "btn btn-secondary";
  downloadBtn.style.marginTop = "0.75rem";
  downloadBtn.textContent = "Download PNG";

  item.appendChild(canvas);
  item.appendChild(label);
  item.appendChild(downloadBtn);

  // Guard: make sure library exists
  if (typeof window.QRCode === "undefined") {
    console.error("QRCode library is not available. Check CDN or network.");
    label.textContent = `${designNumber} (QR lib missing)`;
    downloadBtn.disabled = true;
    return item;
  }

  try {
    QRCode.toCanvas(canvas, url, { width: 180, margin: 1 }, (error) => {
      if (error) {
        console.error("toCanvas error for", designNumber, error);
        label.textContent = `${designNumber} (failed to render)`;
        downloadBtn.disabled = true;
      }
    });
  } catch (err) {
    console.error("Unexpected error generating QR to canvas:", err);
    label.textContent = `${designNumber} (error)`;
    downloadBtn.disabled = true;
  }

  downloadBtn.addEventListener("click", () => {
    try {
      QRCode.toDataURL(url, { width: 512, margin: 1 }, (err, dataUrl) => {
        if (err) {
          console.error("toDataURL error:", err);
          return;
        }
        // create link in DOM for better cross-browser behavior
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${designNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    } catch (err) {
      console.error("Download error:", err);
    }
  });

  return item;
}

function renderQrCodes(designNumbers) {
  const grid = document.getElementById("qr-grid");
  if (!grid) {
    console.error("No #qr-grid element found in DOM.");
    return;
  }
  grid.innerHTML = "";
  designNumbers.forEach((designNumber) => {
    const url = buildFormUrl(designNumber);
    grid.appendChild(createQrCard(designNumber, url));
  });
}

function generateSingle() {
  const designNumber = document.getElementById("singleDesign").value.trim();
  if (!designNumber) {
    alert("Enter a design number.");
    return;
  }
  renderQrCodes([designNumber]);
}

function generateBatch() {
  const prefix = document.getElementById("batchPrefix").value.trim();
  const count = Number(document.getElementById("batchCount").value);
  const start = Number(document.getElementById("batchStart").value);

  if (!Number.isFinite(count) || count < 1 || count > 50) {
    alert("Batch count must be between 1 and 50.");
    return;
  }

  if (!Number.isFinite(start) || start < 0) {
    alert("Starting number must be zero or greater.");
    return;
  }

  const designNumbers = Array.from({ length: count }, (_, index) => `${prefix}${start + index}`);
  renderQrCodes(designNumbers);
}

function initAdmin() {
  // quick check that QR lib loaded; show clear message if missing
  if (typeof window.QRCode === "undefined") {
    console.warn("QRCode library not found at init. The CDN may be blocked.");
    // still set up UI so user can see an actionable message
  }

  const baseUrlEl = document.getElementById("baseUrl");
  if (baseUrlEl) {
    baseUrlEl.value = window.APP_CONFIG?.BASE_URL || window.location.origin;
  }

  const singleBtn = document.getElementById("generate-single");
  if (singleBtn) singleBtn.addEventListener("click", generateSingle);

  const batchBtn = document.getElementById("generate-batch");
  if (batchBtn) batchBtn.addEventListener("click", generateBatch);
}