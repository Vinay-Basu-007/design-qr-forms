function getBaseUrl() {
  const input = document.getElementById("baseUrl");
  const value = input.value.trim();
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

  QRCode.toCanvas(canvas, url, { width: 180, margin: 1 }, (error) => {
    if (error) {
      label.textContent = `${designNumber} (failed to render)`;
      downloadBtn.disabled = true;
    }
  });

  downloadBtn.addEventListener("click", () => {
    QRCode.toDataURL(url, { width: 512, margin: 1 }, (err, dataUrl) => {
      if (err) return;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${designNumber}.png`;
      link.click();
    });
  });

  return item;
}

function renderQrCodes(designNumbers) {
  const grid = document.getElementById("qr-grid");
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
  document.getElementById("baseUrl").value = window.APP_CONFIG?.BASE_URL || window.location.origin;
  document.getElementById("generate-single").addEventListener("click", generateSingle);
  document.getElementById("generate-batch").addEventListener("click", generateBatch);
}

initAdmin();
