function fallbackSubmitForm(payload, scriptUrl) {
  // Create a hidden form and submit as application/x-www-form-urlencoded
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = scriptUrl;
  form.style.display = 'none';
  // target can be _self or _blank; _self navigates away (not desired). We submit to a hidden iframe to keep SPA behavior.
  const iframeName = 'submit_iframe_' + Math.random().toString(36).slice(2);
  const iframe = document.createElement('iframe');
  iframe.name = iframeName;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  form.target = iframeName;

  // Attach onload/onerror handlers to provide user feedback when fallback completes
  iframe.onload = function () {
    try {
      showMessage('Order submitted (form POST). If it does not appear in the sheet shortly, check the server logs.', 'success');
    } catch (e) {
      console.log('Fallback submission completed.');
    }
    // cleanup
    setTimeout(() => {
      if (form.parentNode) document.body.removeChild(form);
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1500);
  };
  iframe.onerror = function () {
    try {
      showMessage('Fallback submission failed. Please try again or contact support.', 'error');
    } catch (e) {
      console.warn('Fallback iframe error');
    }
    setTimeout(() => {
      if (form.parentNode) document.body.removeChild(form);
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1500);
  };

  Object.keys(payload).forEach((key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = payload[key] == null ? '' : String(payload[key]);
    form.appendChild(input);
  });

  // Add a marker so server logs can tell it was a form POST from the client
  const marker = document.createElement('input');
  marker.type = 'hidden';
  marker.name = 'submitted_via';
  marker.value = 'form_post';
  form.appendChild(marker);

  document.body.appendChild(form);
  form.submit();

  // If onload/onerror do not fire, still clean up after a delay
  setTimeout(() => {
    if (form.parentNode) document.body.removeChild(form);
    if (iframe.parentNode) document.body.removeChild(iframe);
  }, 10000);
}

function getDesignNumberFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("design") || params.get("id") || "";
}

function showMessage(text, type) {
  const message = document.getElementById("message");
  message.textContent = text;
  message.className = `message show ${type}`;
}

function validateContact(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

// Compute total from size inputs and return sizes object
function computeTotalQuantity() {
  const s = Number(document.getElementById('sizeS')?.value || 0);
  const m = Number(document.getElementById('sizeM')?.value || 0);
  const l = Number(document.getElementById('sizeL')?.value || 0);
  const xl = Number(document.getElementById('sizeXL')?.value || 0);
  const xxl = Number(document.getElementById('sizeXXL')?.value || 0);
  const total = s + m + l + xl + xxl;
  const quantityInput = document.getElementById('quantity');
  if (quantityInput) quantityInput.value = total;
  return { total, sizes: { s, m, l, xl, xxl } };
}

async function submitToGoogleSheets(payload) {
  const scriptUrl = window.APP_CONFIG?.GOOGLE_SCRIPT_URL?.trim();
  if (!scriptUrl) {
    throw new Error(
      "Google Sheets URL is not configured. Set GOOGLE_SCRIPT_URL in js/config.js."
    );
  }

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Keep credentials omitted to avoid sending cookies
  });

  if (!response.ok) {
    throw new Error("Could not save your order. Please try again.");
  }

  const result = await response.json().catch(() => ({}));
  if (result.success === false) {
    throw new Error(result.error || "Could not save your order.");
  }

  return result;
}

function initForm() {
  const designNumber = getDesignNumberFromUrl();
  const designInput = document.getElementById("designNumber");
  const form = document.getElementById("order-form");
  const submitBtn = document.getElementById("submit-btn");

  // Attach size listeners early so total updates even if other logic returns early
  ['sizeS','sizeM','sizeL','sizeXL','sizeXXL'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', computeTotalQuantity);
  });
  // initialize quantity from sizes
  computeTotalQuantity();

  if (!designNumber) {
    showMessage("Invalid QR code: design number is missing.", "error");
    if (submitBtn) submitBtn.disabled = true;
    if (designInput) designInput.value = "";
    return;
  }

  if (designInput) designInput.value = designNumber;

  // Ensure billingAddress and gst are marked required in UI
  const billingAddressEl = document.getElementById('billingAddress');
  const gstEl = document.getElementById('gst');
  if (billingAddressEl) billingAddressEl.setAttribute('required', 'true');
  if (gstEl) gstEl.setAttribute('required', 'true');

  // Enforce GST input to uppercase alphanumerics only as the user types
  if (gstEl) {
    gstEl.addEventListener('input', (e) => {
      const cleaned = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      e.target.value = cleaned;
    });
    gstEl.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      gstEl.value = pasted.slice(0, 15);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const billingName = document.getElementById("billingName")?.value.trim() || "";
    const contact = document.getElementById("contact")?.value.trim() || "";
    const billingAddress = document.getElementById("billingAddress")?.value.trim() || "";
    const gst = document.getElementById("gst")?.value.trim() || "";
    const orderNumber = document.getElementById("orderNumber")?.value.trim() || "";

    const { total, sizes } = computeTotalQuantity();
    const quantity = total;

    // Validate required fields: billingName, contact, billingAddress, gst, quantity > 0
    if (!billingName || !contact || !billingAddress || !gst || quantity <= 0) {
      showMessage("Please fill in all required fields and enter at least one size quantity.", "error");
      return;
    }

    if (!validateContact(contact)) {
      showMessage("Please enter a valid contact number (at least 10 digits).", "error");
      return;
    }

    // GST must be uppercase letters and numbers only
    const gstPattern = /^[A-Z0-9]+$/;
    if (!gstPattern.test(gst)) {
      showMessage("GST must contain only uppercase letters and digits (A–Z, 0–9).", "error");
      return;
    }

    const payload = {
      billingName,
      contact,
      billingAddress,
      gst,
      orderNumber,
      designNumber,
      quantity, // total quantity
      sizeS: sizes.s,
      sizeM: sizes.m,
      sizeL: sizes.l,
      sizeXL: sizes.xl,
      sizeXXL: sizes.xxl,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    // Use form POST fallback as primary submission method to avoid CORS issues
    try {
      fallbackSubmitForm(payload, window.APP_CONFIG?.GOOGLE_SCRIPT_URL?.trim());
      form.reset();
      if (designInput) designInput.value = designNumber;
      // re-initialize quantity to zeroed sizes
      computeTotalQuantity();
    } catch (err) {
      showMessage("Submission failed: " + (err.message || err), "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Order";
    }
  });
}

initForm();
