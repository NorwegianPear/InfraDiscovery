/**
 * Settings Page - Environment Configuration, API Connections, Preferences
 * Features: Connection testing with results, config validation, import/export settings
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const SettingsPage = {
  testResults: null,
  hasUnsavedChanges: false,

  /**
   * Render the settings page
   */
  render() {
    const config = typeof Config !== "undefined" ? Config : {};
    const savedConfig = localStorage.getItem("atea-idlm-config");
    const parsedConfig = savedConfig ? JSON.parse(savedConfig) : {};

    return `
      <section class="page-section">
        <!-- Unsaved changes warning bar -->
        <div class="unsaved-changes-bar" id="unsavedChangesBar" style="display: none;">
          <span>⚠️ You have unsaved changes</span>
          <div>
            <button class="btn btn-sm btn-secondary" onclick="SettingsPage.discardChanges()">Discard</button>
            <button class="btn btn-sm btn-primary" onclick="SettingsPage.saveAllSettings()">Save Now</button>
          </div>
        </div>

        <!-- Settings toolbar -->
        <div class="page-toolbar">
          <div class="toolbar-left">
            <h2 style="margin: 0;">⚙️ Settings</h2>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary" id="exportSettingsBtn" title="Export all settings to file">
              <span class="btn-icon">📤</span> Export
            </button>
            <button class="btn btn-secondary" id="importSettingsBtn" title="Import settings from file">
              <span class="btn-icon">📥</span> Import
            </button>
            <input type="file" id="importSettingsFile" accept=".json" style="display: none;">
          </div>
        </div>

        <!-- Environment Configuration -->
        <div class="settings-section">
          <h3 class="section-title">🌐 Environment Configuration</h3>
          <div class="settings-card">
            <div class="setting-group">
              <label class="setting-label">Environment Type</label>
              <div class="radio-group">
                <label class="radio-option ${
                  config.environment === "cloud" ? "selected" : ""
                }">
                  <input type="radio" name="environment" value="cloud" ${
                    config.environment === "cloud" ? "checked" : ""
                  }>
                  <span class="radio-icon">☁️</span>
                  <span class="radio-text">
                    <strong>Cloud</strong>
                    <small>Microsoft Entra ID / Azure AD only</small>
                  </span>
                </label>
                <label class="radio-option ${
                  config.environment === "hybrid" ? "selected" : ""
                }">
                  <input type="radio" name="environment" value="hybrid" ${
                    config.environment === "hybrid" ? "checked" : ""
                  }>
                  <span class="radio-icon">🔄</span>
                  <span class="radio-text">
                    <strong>Hybrid</strong>
                    <small>Cloud + On-premises AD</small>
                  </span>
                </label>
                <label class="radio-option ${
                  config.environment === "onprem" ? "selected" : ""
                }">
                  <input type="radio" name="environment" value="onprem" ${
                    config.environment === "onprem" ? "checked" : ""
                  }>
                  <span class="radio-icon">🏢</span>
                  <span class="radio-text">
                    <strong>On-Premises</strong>
                    <small>Active Directory only</small>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Azure AD / Entra ID Configuration -->
        <div class="settings-section">
          <h3 class="section-title">🔐 Azure AD / Entra ID Configuration</h3>
          <div class="settings-card">
            <div class="setting-row">
              <label class="setting-label">Client ID (Application ID)</label>
              <div class="input-with-validation">
                <input type="text" id="azureClientId" class="setting-input" 
                  value="${config.azure?.clientId || ""}" 
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$">
                <span class="validation-icon" id="clientIdValidation"></span>
              </div>
              <small class="setting-help">From Azure AD App Registration</small>
            </div>
            <div class="setting-row">
              <label class="setting-label">Tenant ID</label>
              <div class="input-with-validation">
                <input type="text" id="azureTenantId" class="setting-input" 
                  value="${config.azure?.tenantId || ""}" 
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  pattern="^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$">
                <span class="validation-icon" id="tenantIdValidation"></span>
              </div>
              <small class="setting-help">Your Azure AD tenant ID</small>
            </div>
            <div class="setting-row">
              <label class="setting-label">Redirect URI</label>
              <div class="input-with-copy">
                <input type="text" id="azureRedirectUri" class="setting-input" 
                  value="${window.location.origin}" readonly>
                <button class="btn btn-sm btn-secondary" onclick="SettingsPage.copyRedirectUri()">📋 Copy</button>
              </div>
              <small class="setting-help">Must match App Registration</small>
            </div>
            <div class="setting-row">
              <label class="setting-label">User Login Scope</label>
              <div class="permissions-list" id="permissionsList">
                <span class="permission-badge">User.Read</span>
              </div>
              <small class="setting-help">Only basic login required - backend uses Application permissions</small>
            </div>
            <div class="setting-actions">
              <button class="btn btn-info" id="testAzureConnection">🔍 Test Connection</button>
              <button class="btn btn-primary" id="saveAzureConfig">💾 Save Configuration</button>
            </div>
            
            <!-- Connection test results -->
            <div class="test-results-panel" id="testResultsPanel" style="display: none;">
              <h4>Connection Test Results</h4>
              <div id="testResultsContent"></div>
            </div>
          </div>
        </div>

        <!-- Connection Status -->
        <div class="settings-section">
          <h3 class="section-title">📡 Connection Status</h3>
          <div class="settings-card">
            <div class="connection-status-grid">
              <div class="connection-item" onclick="SettingsPage.showConnectionDetails('graph')">
                <span class="connection-icon" id="graphApiStatus">⏳</span>
                <div class="connection-info">
                  <strong>Microsoft Graph API</strong>
                  <span class="connection-detail" id="graphApiDetail">Checking...</span>
                </div>
              </div>
              <div class="connection-item" onclick="SettingsPage.showConnectionDetails('auth')">
                <span class="connection-icon" id="authStatus">⏳</span>
                <div class="connection-info">
                  <strong>Authentication</strong>
                  <span class="connection-detail" id="authDetail">Checking...</span>
                </div>
              </div>
              <div class="connection-item" onclick="SettingsPage.showConnectionDetails('data')">
                <span class="connection-icon" id="dataStatus">⏳</span>
                <div class="connection-info">
                  <strong>Data Access</strong>
                  <span class="connection-detail" id="dataDetail">Checking...</span>
                </div>
              </div>
              <div class="connection-item" onclick="SettingsPage.showConnectionDetails('permissions')">
                <span class="connection-icon" id="permissionStatus">⏳</span>
                <div class="connection-info">
                  <strong>API Permissions</strong>
                  <span class="connection-detail" id="permissionDetail">Checking...</span>
                </div>
              </div>
            </div>
            <div class="connection-actions">
              <button class="btn btn-secondary" id="refreshConnectionStatus">🔄 Refresh Status</button>
              <button class="btn btn-secondary" onclick="SettingsPage.showConnectionLog()">📋 View Log</button>
            </div>
          </div>
        </div>

        <!-- UI Preferences -->
        <div class="settings-section">
          <h3 class="section-title">🎨 Theme & Preferences</h3>
          <div class="settings-card">
            <div class="setting-row">
              <label class="setting-label">Color Theme</label>
              <div class="theme-grid" id="themeGrid">
                ${this.renderThemeOptions()}
              </div>
              <small class="setting-help">Choose a color theme for the entire portal. Changes apply instantly.</small>
            </div>
            <div class="setting-row">
              <label class="setting-label">Language</label>
              <select id="languageSelect" class="setting-select">
                <option value="en" selected>English</option>
                <option value="no">Norwegian (Norsk)</option>
                <option value="sv">Swedish (Svenska)</option>
                <option value="da">Danish (Dansk)</option>
              </select>
            </div>
            <div class="setting-row">
              <label class="setting-label">Date Format</label>
              <select id="dateFormatSelect" class="setting-select">
                <option value="YYYY-MM-DD" ${
                  config.ui?.dateFormat === "YYYY-MM-DD" ? "selected" : ""
                }>2025-12-10</option>
                <option value="DD/MM/YYYY">10/12/2025</option>
                <option value="MM/DD/YYYY">12/10/2025</option>
                <option value="DD.MM.YYYY">10.12.2025</option>
              </select>
            </div>
            <div class="setting-row">
              <label class="setting-label">Currency</label>
              <select id="currencySelectSetting" class="setting-select">
                <option value="NOK" ${
                  config.ui?.currency === "NOK" || !config.ui?.currency
                    ? "selected"
                    : ""
                }>NOK (kr)</option>
                <option value="USD" ${
                  config.ui?.currency === "USD" ? "selected" : ""
                }>USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="SEK">SEK (kr)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Data Refresh Settings -->
        <div class="settings-section">
          <h3 class="section-title">🔄 Data Refresh</h3>
          <div class="settings-card">
            <div class="setting-row">
              <label class="setting-label">Auto-refresh Interval</label>
              <select id="refreshInterval" class="setting-select">
                <option value="0">Disabled</option>
                <option value="60">Every minute</option>
                <option value="300" selected>Every 5 minutes</option>
                <option value="900">Every 15 minutes</option>
                <option value="1800">Every 30 minutes</option>
                <option value="3600">Every hour</option>
              </select>
            </div>
            <div class="setting-row">
              <label class="setting-label">Inactive User Threshold (days)</label>
              <input type="number" id="inactivityDays" class="setting-input" 
                value="${config.ui?.inactivityDays || 90}" min="30" max="365">
              <small class="setting-help">Users without sign-in for this many days are considered inactive</small>
            </div>
            <div class="setting-row">
              <label class="setting-label">Cache Duration (minutes)</label>
              <input type="number" id="cacheDuration" class="setting-input" value="5" min="1" max="60">
              <small class="setting-help">How long to cache API responses</small>
            </div>
          </div>
        </div>

        <!-- Feature Flags -->
        <div class="settings-section">
          <h3 class="section-title">🚀 Features</h3>
          <div class="settings-card">
            <div class="feature-toggles">
              <label class="toggle-row">
                <input type="checkbox" id="featureSignInMap" ${
                  config.features?.signInMap !== false ? "checked" : ""
                }>
                <span class="toggle-label">🌍 Sign-in Map</span>
              </label>
              <label class="toggle-row">
                <input type="checkbox" id="featureLicenses" ${
                  config.features?.licenseManagement !== false ? "checked" : ""
                }>
                <span class="toggle-label">📜 License Management</span>
              </label>
              <label class="toggle-row">
                <input type="checkbox" id="featureSecurity" ${
                  config.features?.securityReports !== false ? "checked" : ""
                }>
                <span class="toggle-label">🔒 Security Reports</span>
              </label>
              <label class="toggle-row">
                <input type="checkbox" id="featureMfa" ${
                  config.features?.mfaAnalysis !== false ? "checked" : ""
                }>
                <span class="toggle-label">🔐 MFA Analysis</span>
              </label>
              <label class="toggle-row">
                <input type="checkbox" id="featureRisk" ${
                  config.features?.riskDetection !== false ? "checked" : ""
                }>
                <span class="toggle-label">⚠️ Risk Detection</span>
              </label>
            </div>
          </div>
        </div>

        <!-- About & Support -->
        <div class="settings-section">
          <h3 class="section-title">ℹ️ About</h3>
          <div class="settings-card about-card">
            <div class="about-logo">
              <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2>Atea Identity & License Management Portal</h2>
            <p class="version">Version 1.0.0</p>
            <p class="copyright">© 2025 Atea AS. All rights reserved.</p>
            <div class="about-links">
              <a href="https://www.atea.com" target="_blank">Atea Website</a>
              <a href="mailto:support@atea.com">Contact Support</a>
              <a href="#" onclick="SettingsPage.showDocs()">Documentation</a>
            </div>
          </div>
        </div>

        <!-- Save All Settings -->
        <div class="settings-footer">
          <button class="btn btn-secondary" id="resetSettings">Reset to Defaults</button>
          <button class="btn btn-primary" id="saveAllSettings">Save All Settings</button>
        </div>
      </section>
    `;
  },

  /**
   * Initialize page
   */
  async init() {
    this.setupEventListeners();
    this.setupChangeTracking();
    this.validateInputs();
    this.checkConnectionStatus();
    this.checkPermissionStatus();
  },

  /**
   * Track changes to inputs
   */
  setupChangeTracking() {
    const inputs = document.querySelectorAll("input, select");
    inputs.forEach((input) => {
      input.addEventListener("change", () => this.markUnsaved());
    });
  },

  markUnsaved() {
    this.hasUnsavedChanges = true;
    const bar = document.getElementById("unsavedChangesBar");
    if (bar) bar.style.display = "flex";
  },

  discardChanges() {
    if (confirm("Discard all unsaved changes?")) {
      location.reload();
    }
  },

  setupEventListeners() {
    // Environment radio buttons
    document.querySelectorAll('input[name="environment"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        document
          .querySelectorAll(".radio-option")
          .forEach((opt) => opt.classList.remove("selected"));
        e.target.closest(".radio-option").classList.add("selected");
      });
    });

    // Test Azure connection
    const testBtn = document.getElementById("testAzureConnection");
    if (testBtn) {
      testBtn.addEventListener("click", () => this.testAzureConnection());
    }

    // Save Azure config
    const saveAzureBtn = document.getElementById("saveAzureConfig");
    if (saveAzureBtn) {
      saveAzureBtn.addEventListener("click", () => this.saveAzureConfig());
    }

    // Refresh connection status
    const refreshStatusBtn = document.getElementById("refreshConnectionStatus");
    if (refreshStatusBtn) {
      refreshStatusBtn.addEventListener("click", () =>
        this.checkConnectionStatus()
      );
    }

    // Save all settings
    const saveAllBtn = document.getElementById("saveAllSettings");
    if (saveAllBtn) {
      saveAllBtn.addEventListener("click", () => this.saveAllSettings());
    }

    // Reset settings
    const resetBtn = document.getElementById("resetSettings");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetSettings());
    }

    // Theme change
    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) {
      themeSelect.addEventListener("change", (e) =>
        this.applyTheme(e.target.value)
      );
    }

    // Export settings
    const exportBtn = document.getElementById("exportSettingsBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportSettings());
    }

    // Import settings
    const importBtn = document.getElementById("importSettingsBtn");
    const importFile = document.getElementById("importSettingsFile");
    if (importBtn && importFile) {
      importBtn.addEventListener("click", () => importFile.click());
      importFile.addEventListener("change", (e) => this.importSettings(e));
    }

    // Input validation
    const clientIdInput = document.getElementById("azureClientId");
    const tenantIdInput = document.getElementById("azureTenantId");
    if (clientIdInput) {
      clientIdInput.addEventListener("input", () => this.validateInputs());
    }
    if (tenantIdInput) {
      tenantIdInput.addEventListener("input", () => this.validateInputs());
    }

    // Warn before leaving with unsaved changes
    window.addEventListener("beforeunload", (e) => {
      if (this.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  },

  validateInputs() {
    const guidPattern =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    const clientId = document.getElementById("azureClientId")?.value;
    const clientValidation = document.getElementById("clientIdValidation");
    if (clientValidation) {
      if (!clientId) {
        clientValidation.textContent = "";
      } else if (guidPattern.test(clientId)) {
        clientValidation.textContent = "✅";
        clientValidation.title = "Valid GUID format";
      } else {
        clientValidation.textContent = "❌";
        clientValidation.title = "Invalid GUID format";
      }
    }

    const tenantId = document.getElementById("azureTenantId")?.value;
    const tenantValidation = document.getElementById("tenantIdValidation");
    if (tenantValidation) {
      if (!tenantId) {
        tenantValidation.textContent = "";
      } else if (guidPattern.test(tenantId)) {
        tenantValidation.textContent = "✅";
        tenantValidation.title = "Valid GUID format";
      } else {
        tenantValidation.textContent = "❌";
        tenantValidation.title = "Invalid GUID format";
      }
    }
  },

  copyRedirectUri() {
    const uri = document.getElementById("azureRedirectUri")?.value;
    if (uri) {
      navigator.clipboard.writeText(uri).then(() => {
        const notification = document.createElement("div");
        notification.className = "copy-notification";
        notification.textContent = "Copied!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
      });
    }
  },

  exportSettings() {
    const settings = this.gatherAllSettings();
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atea-idlm-settings-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        if (
          confirm(
            "Import these settings? This will overwrite current settings."
          )
        ) {
          localStorage.setItem("atea-idlm-config", JSON.stringify(settings));
          alert("Settings imported successfully! The page will reload.");
          location.reload();
        }
      } catch (error) {
        alert("Failed to import settings: Invalid JSON file");
      }
    };
    reader.readAsText(file);
    event.target.value = ""; // Reset file input
  },

  gatherAllSettings() {
    return {
      environment:
        document.querySelector('input[name="environment"]:checked')?.value ||
        "cloud",
      azure: {
        clientId: document.getElementById("azureClientId")?.value || "",
        tenantId: document.getElementById("azureTenantId")?.value || "",
        authority: `https://login.microsoftonline.com/${
          document.getElementById("azureTenantId")?.value || ""
        }`,
      },
      ui: {
        theme: document.getElementById("themeSelect")?.value || "light",
        language: document.getElementById("languageSelect")?.value || "en",
        dateFormat:
          document.getElementById("dateFormatSelect")?.value || "YYYY-MM-DD",
        currency: document.getElementById("currencySelect")?.value || "NOK",
        inactivityDays:
          parseInt(document.getElementById("inactivityDays")?.value) || 90,
      },
      features: {
        signInMap:
          document.getElementById("featureSignInMap")?.checked !== false,
        licenseManagement:
          document.getElementById("featureLicenses")?.checked !== false,
        securityReports:
          document.getElementById("featureSecurity")?.checked !== false,
        mfaAnalysis: document.getElementById("featureMfa")?.checked !== false,
        riskDetection:
          document.getElementById("featureRisk")?.checked !== false,
      },
      dataRefresh: {
        interval:
          parseInt(document.getElementById("refreshInterval")?.value) || 300,
        cacheDuration:
          parseInt(document.getElementById("cacheDuration")?.value) || 5,
      },
      exportedAt: new Date().toISOString(),
    };
  },

  showConnectionDetails(type) {
    const details = {
      graph: `Microsoft Graph API Connection\n\nEndpoint: https://graph.microsoft.com/v1.0\nStatus: ${
        App?.useRealApi && GraphAPI?.accessToken ? "Connected" : "Not connected"
      }\nToken: ${
        GraphAPI?.accessToken ? "Present (expires soon)" : "Not available"
      }`,
      auth: `Authentication Status\n\nMSAL Initialized: ${
        typeof MSALAuth !== "undefined" && MSALAuth.isInitialized ? "Yes" : "No"
      }\nUser Signed In: ${
        typeof MSALAuth !== "undefined" && MSALAuth.isLoggedIn?.()
          ? "Yes"
          : "No"
      }\nAccount: ${MSALAuth?.account?.username || "N/A"}`,
      data: `Data Access Status\n\nLast Updated: ${
        App?.data?.lastUpdated
          ? new Date(App.data.lastUpdated).toLocaleString()
          : "Never"
      }\nUsers Loaded: ${App?.data?.users?.length || 0}\nLicenses Loaded: ${
        App?.data?.licenses?.length || 0
      }`,
      permissions: `API Permissions\n\nUser Authentication:\n- User.Read (for login)\n\nData Access:\n- Backend API uses Application permissions\n- No per-user consent required`,
    };
    alert(details[type] || "No details available");
  },

  showConnectionLog() {
    const log = [
      `${new Date().toLocaleTimeString()} - Connection status check initiated`,
      `${new Date().toLocaleTimeString()} - MSAL initialized: ${
        typeof MSALAuth !== "undefined"
      }`,
      `${new Date().toLocaleTimeString()} - Graph API token: ${
        GraphAPI?.accessToken ? "Present" : "Missing"
      }`,
      `${new Date().toLocaleTimeString()} - App data: ${
        App?.data ? "Loaded" : "Not loaded"
      }`,
    ].join("\n");
    alert("Connection Log:\n\n" + log);
  },

  checkPermissionStatus() {
    const permissionStatus = document.getElementById("permissionStatus");
    const permissionDetail = document.getElementById("permissionDetail");

    if (!permissionStatus || !permissionDetail) return;

    if (App?.useRealApi && GraphAPI?.accessToken) {
      permissionStatus.textContent = "✅";
      permissionDetail.textContent = "Permissions granted";
    } else if (typeof MSALAuth !== "undefined" && MSALAuth.isInitialized) {
      permissionStatus.textContent = "⚠️";
      permissionDetail.textContent = "Sign in to verify";
    } else {
      permissionStatus.textContent = "❓";
      permissionDetail.textContent = "Unknown";
    }
  },

  async testAzureConnection() {
    const clientId = document.getElementById("azureClientId").value;
    const tenantId = document.getElementById("azureTenantId").value;
    const resultsPanel = document.getElementById("testResultsPanel");
    const resultsContent = document.getElementById("testResultsContent");

    if (!clientId || !tenantId) {
      alert("Please enter both Client ID and Tenant ID");
      return;
    }

    // Show results panel
    resultsPanel.style.display = "block";
    resultsContent.innerHTML =
      '<div class="loading-spinner"></div><p>Testing connection...</p>';

    const results = [];
    const guidPattern =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    // Test 1: GUID format validation
    const clientValid = guidPattern.test(clientId);
    const tenantValid = guidPattern.test(tenantId);
    results.push({
      test: "Client ID Format",
      status: clientValid ? "pass" : "fail",
      message: clientValid ? "Valid GUID format" : "Invalid GUID format",
    });
    results.push({
      test: "Tenant ID Format",
      status: tenantValid ? "pass" : "fail",
      message: tenantValid ? "Valid GUID format" : "Invalid GUID format",
    });

    // Test 2: Check if MSAL is available
    results.push({
      test: "MSAL Library",
      status: typeof msal !== "undefined" ? "pass" : "warn",
      message:
        typeof msal !== "undefined"
          ? "MSAL library loaded"
          : "MSAL library not detected",
    });

    // Test 3: Authority endpoint reachability
    try {
      const authorityUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
      const response = await fetch(authorityUrl, { mode: "cors" });
      if (response.ok) {
        results.push({
          test: "Tenant Endpoint",
          status: "pass",
          message: "Tenant authority endpoint is reachable",
        });
      } else {
        results.push({
          test: "Tenant Endpoint",
          status: "fail",
          message: `HTTP ${response.status}: Tenant may not exist or is inaccessible`,
        });
      }
    } catch (error) {
      results.push({
        test: "Tenant Endpoint",
        status: "warn",
        message: "Could not verify tenant (CORS restriction - this is normal)",
      });
    }

    // Test 4: Current authentication state
    if (typeof MSALAuth !== "undefined" && MSALAuth.isInitialized) {
      if (MSALAuth.isLoggedIn()) {
        results.push({
          test: "Current Auth",
          status: "pass",
          message: `Signed in as ${MSALAuth.account?.username}`,
        });
      } else {
        results.push({
          test: "Current Auth",
          status: "warn",
          message: "MSAL initialized but not signed in",
        });
      }
    } else {
      results.push({
        test: "Current Auth",
        status: "warn",
        message: "MSAL not initialized - save config and refresh",
      });
    }

    // Test 5: Redirect URI match
    const currentOrigin = window.location.origin;
    results.push({
      test: "Redirect URI",
      status: "info",
      message: `Ensure "${currentOrigin}" is configured in Azure AD App Registration`,
    });

    // Render results
    const overallPass = results.every((r) => r.status !== "fail");
    resultsContent.innerHTML = `
      <div class="test-summary ${overallPass ? "success" : "error"}">
        ${
          overallPass
            ? "✅ Configuration appears valid"
            : "❌ Configuration has issues"
        }
      </div>
      <div class="test-results-list">
        ${results
          .map(
            (r) => `
          <div class="test-result test-${r.status}">
            <span class="test-icon">${
              r.status === "pass"
                ? "✅"
                : r.status === "fail"
                ? "❌"
                : r.status === "warn"
                ? "⚠️"
                : "ℹ️"
            }</span>
            <strong>${r.test}:</strong> ${r.message}
          </div>
        `
          )
          .join("")}
      </div>
      <p class="test-note">
        ${
          overallPass
            ? 'Click "Sign In for Real Data" in the header to complete authentication.'
            : "Fix the issues above and test again."
        }
      </p>
    `;

    this.testResults = results;
  },

  saveAzureConfig() {
    const clientId = document.getElementById("azureClientId").value;
    const tenantId = document.getElementById("azureTenantId").value;

    if (!clientId || !tenantId) {
      alert("Please enter both Client ID and Tenant ID");
      return;
    }

    // Save to Config object and localStorage
    if (typeof Config !== "undefined") {
      Config.setCloudConfig(clientId, tenantId);
    }

    const savedConfig = JSON.parse(
      localStorage.getItem("atea-idlm-config") || "{}"
    );
    savedConfig.azure = {
      clientId: clientId,
      tenantId: tenantId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    };
    localStorage.setItem("atea-idlm-config", JSON.stringify(savedConfig));

    alert(
      "✅ Azure AD configuration saved! Refresh the page to apply changes."
    );

    this.hasUnsavedChanges = false;
    const bar = document.getElementById("unsavedChangesBar");
    if (bar) bar.style.display = "none";
  },

  checkConnectionStatus() {
    // Graph API status
    const graphStatus = document.getElementById("graphApiStatus");
    const graphDetail = document.getElementById("graphApiDetail");

    if (App.useRealApi && GraphAPI.accessToken) {
      graphStatus.textContent = "✅";
      graphDetail.textContent = "Connected";
    } else {
      graphStatus.textContent = "⚠️";
      graphDetail.textContent = "Not connected - sign in required";
    }

    // Auth status
    const authStatus = document.getElementById("authStatus");
    const authDetail = document.getElementById("authDetail");

    if (typeof MSALAuth !== "undefined" && MSALAuth.isInitialized) {
      if (MSALAuth.isLoggedIn()) {
        authStatus.textContent = "✅";
        authDetail.textContent = `Logged in as ${
          MSALAuth.account?.username || "user"
        }`;
      } else {
        authStatus.textContent = "⚠️";
        authDetail.textContent = "Not signed in";
      }
    } else {
      authStatus.textContent = "❌";
      authDetail.textContent = "MSAL not initialized";
    }

    // Data status
    const dataStatus = document.getElementById("dataStatus");
    const dataDetail = document.getElementById("dataDetail");

    if (App.data) {
      dataStatus.textContent = "✅";
      dataDetail.textContent = `Last updated: ${
        typeof LocaleUtils !== "undefined"
          ? LocaleUtils.formatTime(App.data.lastUpdated || Date.now())
          : new Date(App.data.lastUpdated || Date.now()).toLocaleTimeString(
              "nb-NO",
              { hour: "2-digit", minute: "2-digit" }
            )
      }`;
    } else {
      dataStatus.textContent = "⏳";
      dataDetail.textContent = "Loading...";
    }

    // Also check permission status
    this.checkPermissionStatus();
  },

  applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else if (theme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      document.body.classList.toggle("dark-theme", prefersDark);
    } else {
      document.body.classList.remove("dark-theme");
    }
    this.markUnsaved();
  },

  saveAllSettings() {
    const settings = this.gatherAllSettings();

    localStorage.setItem("atea-idlm-config", JSON.stringify(settings));

    this.hasUnsavedChanges = false;
    const bar = document.getElementById("unsavedChangesBar");
    if (bar) bar.style.display = "none";

    // Show success notification
    const notification = document.createElement("div");
    notification.className = "save-notification";
    notification.innerHTML = "✅ All settings saved successfully!";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  },

  resetSettings() {
    if (
      confirm(
        "Are you sure you want to reset all settings to defaults? This cannot be undone."
      )
    ) {
      localStorage.removeItem("atea-idlm-config");
      localStorage.removeItem("atea-idlm-setup-complete");
      localStorage.removeItem("atea-idlm-report-history");
      localStorage.removeItem("atea-idlm-favorite-reports");
      localStorage.removeItem("atea-idlm-email-settings");
      alert("Settings reset. The page will now reload.");
      location.reload();
    }
  },

  showDocs() {
    // Navigate to documentation page
    if (typeof App !== "undefined" && App.navigateTo) {
      App.navigateTo("documentation");
    } else {
      alert("Documentation is available in the Documentation tab.");
    }
  },

  /**
   * Render theme options grid
   */
  renderThemeOptions() {
    if (typeof ThemeManager === "undefined") {
      return '<p class="text-muted">Theme manager not loaded</p>';
    }

    const currentTheme = ThemeManager.getCurrentTheme();
    const themes = ThemeManager.themes;

    return Object.entries(themes)
      .map(
        ([key, theme]) => `
        <button class="theme-option-card ${
          key === currentTheme ? "active" : ""
        }" 
                data-theme="${key}"
                onclick="SettingsPage.applyTheme('${key}')">
          <span class="theme-icon">${theme.icon}</span>
          <span class="theme-name">${theme.name}</span>
          ${key === currentTheme ? '<span class="theme-check">✓</span>' : ""}
        </button>
      `
      )
      .join("");
  },

  /**
   * Apply a theme from the settings page
   */
  applyTheme(themeName) {
    if (typeof ThemeManager !== "undefined") {
      ThemeManager.applyTheme(themeName);

      // Update the theme grid UI
      const themeGrid = document.getElementById("themeGrid");
      if (themeGrid) {
        themeGrid.innerHTML = this.renderThemeOptions();
      }
    }
  },
};
