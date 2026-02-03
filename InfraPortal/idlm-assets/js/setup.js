/**
 * Atea Identity and License Management Portal
 * Setup Wizard Logic
 *
 * Handles first-run configuration and environment setup
 */

(function () {
  "use strict";

  // ========================================================================
  // Configuration
  // ========================================================================

  const CONFIG_STORAGE_KEY = "atea-idlm-config";
  const SETUP_COMPLETE_KEY = "atea-idlm-setup-complete";

  let currentStep = 1;
  const totalSteps = 4;

  // ========================================================================
  // DOM Elements
  // ========================================================================

  const elements = {
    steps: null,
    stepIndicators: null,
    prevBtn: null,
    nextBtn: null,
    testConnectionBtn: null,
    saveBtn: null,

    // Form fields
    environmentType: null,
    tenantId: null,
    clientId: null,
    subscriptionId: null,
    githubEnabled: null,
    githubOrg: null,
    githubRepo: null,
    onpremServer: null,
    onpremBasePath: null,

    // Status
    connectionStatus: null,
    saveStatus: null,
  };

  // ========================================================================
  // Initialization
  // ========================================================================

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    // Get DOM elements
    elements.steps = document.querySelectorAll(".wizard-step");
    elements.stepIndicators = document.querySelectorAll(".step-indicator");
    elements.prevBtn = document.getElementById("prevBtn");
    elements.nextBtn = document.getElementById("nextBtn");
    elements.testConnectionBtn = document.getElementById("testConnection");
    elements.saveBtn = document.getElementById("saveConfig");

    // Form fields
    elements.environmentType = document.querySelectorAll(
      'input[name="environmentType"]'
    );
    elements.tenantId = document.getElementById("tenantId");
    elements.clientId = document.getElementById("clientId");
    elements.subscriptionId = document.getElementById("subscriptionId");
    elements.githubEnabled = document.getElementById("githubEnabled");
    elements.githubOrg = document.getElementById("githubOrg");
    elements.githubRepo = document.getElementById("githubRepo");
    elements.onpremServer = document.getElementById("onpremServer");
    elements.onpremBasePath = document.getElementById("onpremBasePath");

    elements.connectionStatus = document.getElementById("connectionStatus");
    elements.saveStatus = document.getElementById("saveStatus");

    // Load existing config
    loadExistingConfig();

    // Event listeners
    elements.prevBtn?.addEventListener("click", goToPrevStep);
    elements.nextBtn?.addEventListener("click", goToNextStep);
    elements.testConnectionBtn?.addEventListener("click", testConnection);
    elements.saveBtn?.addEventListener("click", saveConfiguration);

    // Environment type change
    elements.environmentType.forEach((radio) => {
      radio.addEventListener("change", onEnvironmentTypeChange);
    });

    // GitHub toggle
    elements.githubEnabled?.addEventListener("change", onGitHubToggle);

    // Auto-detect Azure info
    detectAzureInfo();

    // Initialize step display
    showStep(currentStep);
  }

  // ========================================================================
  // Step Navigation
  // ========================================================================

  function showStep(step) {
    elements.steps.forEach((el, idx) => {
      el.classList.toggle("active", idx === step - 1);
    });

    elements.stepIndicators.forEach((el, idx) => {
      el.classList.toggle("active", idx === step - 1);
      el.classList.toggle("completed", idx < step - 1);
    });

    // Update buttons
    elements.prevBtn.style.display = step === 1 ? "none" : "inline-flex";
    elements.nextBtn.style.display =
      step === totalSteps ? "none" : "inline-flex";
    elements.saveBtn.style.display =
      step === totalSteps ? "inline-flex" : "none";

    // On-prem settings visibility
    const onpremSettings = document.getElementById("onpremSettings");
    if (onpremSettings) {
      const envType = getSelectedEnvironmentType();
      onpremSettings.style.display =
        envType === "hybrid" || envType === "onprem" ? "block" : "none";
    }
  }

  function goToNextStep() {
    if (validateCurrentStep() && currentStep < totalSteps) {
      currentStep++;
      showStep(currentStep);
    }
  }

  function goToPrevStep() {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  }

  function validateCurrentStep() {
    switch (currentStep) {
      case 1:
        // Environment type - always valid (has default)
        return true;

      case 2:
        // Azure config
        const envType = getSelectedEnvironmentType();
        if (envType === "onprem") return true; // Skip Azure validation for on-prem

        if (!elements.tenantId.value.trim()) {
          showError("Tenant ID is required for cloud/hybrid environments");
          elements.tenantId.focus();
          return false;
        }
        if (!elements.clientId.value.trim()) {
          showError("Client ID is required");
          elements.clientId.focus();
          return false;
        }
        return true;

      case 3:
        // GitHub - optional
        return true;

      default:
        return true;
    }
  }

  // ========================================================================
  // Event Handlers
  // ========================================================================

  function onEnvironmentTypeChange() {
    const envType = getSelectedEnvironmentType();
    const azureSection = document.getElementById("azureSection");
    const onpremSettings = document.getElementById("onpremSettings");

    if (azureSection) {
      azureSection.style.opacity = envType === "onprem" ? "0.5" : "1";
    }

    if (onpremSettings) {
      onpremSettings.style.display =
        envType === "hybrid" || envType === "onprem" ? "block" : "none";
    }

    // Update description
    const descriptions = {
      cloud: "Pure Azure environment with Entra ID only",
      hybrid: "Combined Azure AD and on-premises Active Directory",
      onprem: "On-premises Active Directory only (no Azure)",
    };

    const desc = document.querySelector(".env-description");
    if (desc) {
      desc.textContent = descriptions[envType] || "";
    }
  }

  function onGitHubToggle() {
    const githubSettings = document.getElementById("githubSettings");
    if (githubSettings) {
      githubSettings.style.display = elements.githubEnabled.checked
        ? "block"
        : "none";
    }
  }

  // ========================================================================
  // Azure Detection
  // ========================================================================

  async function detectAzureInfo() {
    // Try to get tenant ID from current URL or authentication
    try {
      // Check if we have auth info in URL
      const urlParams = new URLSearchParams(window.location.search);

      if (urlParams.has("tenantId")) {
        elements.tenantId.value = urlParams.get("tenantId");
      }

      if (urlParams.has("clientId")) {
        elements.clientId.value = urlParams.get("clientId");
      }

      // Try to detect from Easy Auth headers (if deployed to Azure)
      const response = await fetch("/.auth/me");
      if (response.ok) {
        const authInfo = await response.json();
        if (authInfo && authInfo[0]) {
          const claims = authInfo[0].user_claims || [];
          const tenantClaim = claims.find(
            (c) =>
              c.typ === "http://schemas.microsoft.com/identity/claims/tenantid"
          );
          if (tenantClaim && !elements.tenantId.value) {
            elements.tenantId.value = tenantClaim.val;
          }
        }
      }
    } catch (e) {
      // Not running on Azure or not authenticated - that's OK
      console.log("Auto-detection not available:", e.message);
    }
  }

  // ========================================================================
  // Connection Test
  // ========================================================================

  async function testConnection() {
    const status = elements.connectionStatus;
    status.className = "status-message info";
    status.textContent = "Testing connection...";
    status.style.display = "block";

    const envType = getSelectedEnvironmentType();

    try {
      if (envType === "cloud" || envType === "hybrid") {
        // Test Azure connection
        const tenantId = elements.tenantId.value.trim();
        const clientId = elements.clientId.value.trim();

        if (!tenantId || !clientId) {
          throw new Error("Tenant ID and Client ID are required");
        }

        // Test by trying to get the OpenID configuration
        const openIdResponse = await fetch(
          `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`
        );

        if (!openIdResponse.ok) {
          throw new Error("Invalid Tenant ID");
        }

        // Check if the app is registered
        // Note: We can't fully verify without authentication,
        // but we can check if the tenant is valid

        status.className = "status-message success";
        status.innerHTML =
          "✅ Azure tenant validated successfully!<br>" +
          "<small>Note: Full app validation requires authentication.</small>";
      }

      if (envType === "hybrid" || envType === "onprem") {
        // Test on-prem connection
        const server = elements.onpremServer?.value.trim();

        if (server) {
          // Try to reach the on-prem API endpoint
          const testResponse = await fetch(`${server}/api/health`, {
            method: "GET",
            credentials: "include",
            timeout: 5000,
          }).catch(() => null);

          if (testResponse && testResponse.ok) {
            status.innerHTML +=
              "<br>✅ On-premises server connection successful!";
          } else {
            status.innerHTML +=
              "<br>⚠️ On-premises server not reachable (will use local mode)";
          }
        }
      }
    } catch (error) {
      status.className = "status-message error";
      status.textContent = "❌ Connection test failed: " + error.message;
    }
  }

  // ========================================================================
  // Configuration Management
  // ========================================================================

  function loadExistingConfig() {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);

        // Populate form fields
        if (config.environmentType) {
          elements.environmentType.forEach((radio) => {
            radio.checked = radio.value === config.environmentType;
          });
          onEnvironmentTypeChange();
        }

        if (config.azure) {
          elements.tenantId.value = config.azure.tenantId || "";
          elements.clientId.value = config.azure.clientId || "";
          elements.subscriptionId.value = config.azure.subscriptionId || "";
        }

        if (config.github) {
          elements.githubEnabled.checked = config.github.enabled;
          elements.githubOrg.value = config.github.organization || "";
          elements.githubRepo.value = config.github.repository || "";
          onGitHubToggle();
        }

        if (config.onprem) {
          elements.onpremServer.value = config.onprem.server || "";
          elements.onpremBasePath.value = config.onprem.basePath || "";
        }
      }
    } catch (e) {
      console.error("Failed to load config:", e);
    }
  }

  function saveConfiguration() {
    const status = elements.saveStatus;

    try {
      const config = {
        environmentType: getSelectedEnvironmentType(),
        configured: true,
        configuredAt: new Date().toISOString(),
        azure: {
          tenantId: elements.tenantId.value.trim(),
          clientId: elements.clientId.value.trim(),
          subscriptionId: elements.subscriptionId.value.trim(),
        },
        github: {
          enabled: elements.githubEnabled?.checked || false,
          organization: elements.githubOrg?.value.trim() || "",
          repository: elements.githubRepo?.value.trim() || "",
        },
        onprem: {
          server: elements.onpremServer?.value.trim() || "",
          basePath: elements.onpremBasePath?.value.trim() || "",
        },
      };

      // Save to localStorage
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      localStorage.setItem(SETUP_COMPLETE_KEY, "true");

      status.className = "status-message success";
      status.textContent = "✅ Configuration saved successfully!";
      status.style.display = "block";

      // Redirect to main portal after a short delay
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } catch (error) {
      status.className = "status-message error";
      status.textContent = "❌ Failed to save configuration: " + error.message;
      status.style.display = "block";
    }
  }

  // ========================================================================
  // Utility Functions
  // ========================================================================

  function getSelectedEnvironmentType() {
    const selected = document.querySelector(
      'input[name="environmentType"]:checked'
    );
    return selected ? selected.value : "cloud";
  }

  function showError(message) {
    // Create a toast notification
    const toast = document.createElement("div");
    toast.className = "toast error";
    toast.textContent = message;
    toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  // ========================================================================
  // Public API
  // ========================================================================

  window.SetupWizard = {
    isConfigured: function () {
      return localStorage.getItem(SETUP_COMPLETE_KEY) === "true";
    },

    getConfig: function () {
      try {
        return JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "{}");
      } catch {
        return {};
      }
    },

    reset: function () {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      localStorage.removeItem(SETUP_COMPLETE_KEY);
      window.location.reload();
    },
  };
})();
