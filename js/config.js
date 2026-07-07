function detectBaseUrl() {
  const { origin, pathname } = window.location;
  const directory = pathname.replace(/\/[^/]*\.html$/, "").replace(/\/$/, "");
  return origin + directory;
}

// Set GOOGLE_SCRIPT_URL after deploying google-apps-script/Code.gs
window.APP_CONFIG = {
  GOOGLE_SCRIPT_URL: "",
  // Auto-detects GitHub Pages paths like /repo-name/form.html
  BASE_URL: detectBaseUrl(),
};
