/**
 * Application Configuration
 * Supports Cloud (Azure AD), Hybrid, and On-Premises environments
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const Config = {
  // Environment types: 'cloud', 'hybrid', 'onprem'
  environment: "cloud",

  // Azure AD / Entra ID Configuration (for cloud and hybrid)
  // These values are replaced during deployment or configured via setup wizard
  // Use __PLACEHOLDER__ format for deployment script replacement
  azure: {
    clientId: "904a8d1a-0f3a-44b9-9c03-c9c50e52f007",
    tenantId: "973a580f-021f-4dc0-88de-48b060e43df1",
    authority:
      "https://login.microsoftonline.com/973a580f-021f-4dc0-88de-48b060e43df1",
    redirectUri: window.location.origin,
    // Only basic User.Read scope needed for user authentication
    // Backend API uses Application permissions to access Graph API data
    scopes: ["User.Read"],
  },

  // On-Premises Configuration
  onPrem: {
    apiBaseUrl: "", // URL to on-prem data collector API
    authType: "windows", // 'windows', 'basic', 'oauth'
    domain: "",
  },

  // Hybrid Configuration
  hybrid: {
    syncEnabled: true,
    cloudApiUrl: "https://graph.microsoft.com/v1.0",
    onPremApiUrl: "", // URL to on-prem connector
  },

  // Feature flags
  features: {
    signInMap: true,
    licenseManagement: true,
    securityReports: true,
    userManagement: true,
    onPremSync: false,
    mfaAnalysis: true,
    riskDetection: true,
  },

  // UI Settings
  ui: {
    theme: "light",
    language: "nb-NO",
    dateFormat: "dd.MM.yyyy",
    currency: "NOK",
    inactivityDays: 90, // Days to consider user inactive
  },

  // Config version - increment to force reset of cached settings
  configVersion: 2,

  /**
   * Check if configuration needs setup (has placeholder values)
   */
  needsSetup() {
    return (
      !this.azure.clientId ||
      !this.azure.tenantId ||
      this.azure.clientId.startsWith("__") ||
      this.azure.tenantId.startsWith("__")
    );
  },

  /**
   * Initialize configuration from environment
   */
  init() {
    // Check for configuration in localStorage (set by deployment or setup wizard)
    const savedConfig = localStorage.getItem("atea-idlm-config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);

        // Check config version - if old version, reset UI settings to defaults
        if (
          !parsed.configVersion ||
          parsed.configVersion < this.configVersion
        ) {
          console.log(
            "🔄 Config version updated - resetting UI settings to Norwegian defaults",
          );
          // Keep azure settings but reset UI to Norwegian defaults
          Object.assign(this.azure, parsed.azure || {});
          Object.assign(this.onPrem, parsed.onPrem || {});
          Object.assign(this.hybrid, parsed.hybrid || {});
          // Don't load old UI settings - use defaults (NOK, nb-NO, etc.)
          this.environment = parsed.environment || "cloud";
          // Save with new version
          this.save();
        } else {
          Object.assign(this.azure, parsed.azure || {});
          Object.assign(this.onPrem, parsed.onPrem || {});
          Object.assign(this.hybrid, parsed.hybrid || {});
          Object.assign(this.ui, parsed.ui || {});
          Object.assign(this.features, parsed.features || {});
          this.environment = parsed.environment || "cloud";
        }
      } catch (e) {
        console.error("Error parsing saved config:", e);
      }
    }

    // Set authority based on tenant (only if valid tenant ID)
    if (this.azure.tenantId && !this.azure.tenantId.startsWith("__")) {
      this.azure.authority = `https://login.microsoftonline.com/${this.azure.tenantId}`;
    }

    // Update feature flags based on environment
    this.updateFeatureFlags();

    console.log(`🔧 Config initialized: ${this.environment} environment`);
    console.log(`💱 Currency: ${this.ui.currency}`);
    return this;
  },

  /**
   * Update feature flags based on environment
   */
  updateFeatureFlags() {
    switch (this.environment) {
      case "onprem":
        this.features.signInMap = false; // Limited without Azure AD
        this.features.riskDetection = false;
        this.features.onPremSync = true;
        break;
      case "hybrid":
        this.features.onPremSync = true;
        break;
      case "cloud":
      default:
        this.features.onPremSync = false;
        break;
    }
  },

  /**
   * Configure for Azure/Cloud environment
   */
  setCloudConfig(clientId, tenantId) {
    this.environment = "cloud";
    this.azure.clientId = clientId;
    this.azure.tenantId = tenantId;
    this.azure.authority = `https://login.microsoftonline.com/${tenantId}`;
    this.save();
  },

  /**
   * Configure for On-Premises environment
   */
  setOnPremConfig(apiUrl, domain, authType = "windows") {
    this.environment = "onprem";
    this.onPrem.apiBaseUrl = apiUrl;
    this.onPrem.domain = domain;
    this.onPrem.authType = authType;
    this.updateFeatureFlags();
    this.save();
  },

  /**
   * Configure for Hybrid environment
   */
  setHybridConfig(clientId, tenantId, onPremApiUrl) {
    this.environment = "hybrid";
    this.azure.clientId = clientId;
    this.azure.tenantId = tenantId;
    this.azure.authority = `https://login.microsoftonline.com/${tenantId}`;
    this.hybrid.onPremApiUrl = onPremApiUrl;
    this.updateFeatureFlags();
    this.save();
  },

  /**
   * Save configuration to localStorage
   */
  save() {
    const config = {
      configVersion: this.configVersion,
      environment: this.environment,
      azure: this.azure,
      onPrem: this.onPrem,
      hybrid: this.hybrid,
      features: this.features,
      ui: this.ui,
    };
    localStorage.setItem("atea-idlm-config", JSON.stringify(config));
  },

  /**
   * Get environment display info
   */
  getEnvironmentInfo() {
    const envInfo = {
      cloud: { icon: "☁️", text: "Cloud", class: "cloud" },
      hybrid: { icon: "🔄", text: "Hybrid", class: "hybrid" },
      onprem: { icon: "🏢", text: "On-Premises", class: "onprem" },
    };
    return envInfo[this.environment] || envInfo.cloud;
  },

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.features[featureName] === true;
  },
};

// Initialize config on load
Config.init();
