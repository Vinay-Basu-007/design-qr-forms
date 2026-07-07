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

async function submitToGoogleSheets(payload) {
  const scriptUrl = window.APP_CONFIG?.GOOGLE_SCRIPT_URL?.trim();
  if (!scriptUrl) {
    throw new Error(
      "Google Sheets URL is not configured. Set GOOGLE_SCRIPT_URL in js/config.js."
    );
  }

  const response = await fetch(scriptUrl, {
    method: "POST",
    body: JSON.stringify(payload),
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

  if (!designNumber) {
    showMessage("Invalid QR code: design number is missing.", "error");
    submitBtn.disabled = true;
    designInput.value = "";
    return;
  }

  designInput.value = designNumber;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const contact = document.getElementById("contact").value.trim();
    const address = document.getElementById("address").value.trim();
    const quantity = document.getElementById("quantity").value.trim();

    if (!name || !contact || !quantity) {
      showMessage("Please fill in all required fields.", "error");
      return;
    }

    if (!validateContact(contact)) {
      showMessage("Please enter a valid contact number (at least 10 digits).", "error");
      return;
    }

    const payload = {
      name,
      contact,
      address,
      quantity,
      designNumber,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      await submitToGoogleSheets(payload);
      form.reset();
      designInput.value = designNumber;
      showMessage("Order submitted successfully. Thank you!", "success");
    } catch (error) {
      showMessage(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Order";
    }
  });
}

initForm();
