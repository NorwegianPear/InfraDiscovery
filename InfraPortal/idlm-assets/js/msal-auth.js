/**
 * MSAL Authentication for Local Development
 * Uses Microsoft Authentication Library for browser-based authentication
 * to fetch real data from Microsoft Graph API
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const MSALAuth = {
  msalInstance: null,
  account: null,
  accessToken: null,
  isInitialized: false,

  /**
   * Initialize MSAL
   */
  async init() {
    // Get config from Config object (which has hardcoded values) or localStorage
    const savedConfig = this.getSavedConfig();
    const clientId =
      savedConfig.azure?.clientId ||
      (typeof Config !== "undefined" ? Config.azure?.clientId : null);
    const tenantId =
      savedConfig.azure?.tenantId ||
      (typeof Config !== "undefined" ? Config.azure?.tenantId : null);

    if (!clientId || !tenantId) {
      console.log("🔸 MSAL not configured - authentication required");
      return false;
    }

    console.log("🔧 MSAL initializing with clientId:", clientId);

    // Use 'organizations' endpoint to allow multi-tenant access (users from different tenants like atea.no)
    // This requires the App Registration to be configured as multi-tenant in Azure Portal
    const authorityEndpoint = savedConfig.azure?.singleTenant
      ? `https://login.microsoftonline.com/${tenantId}`
      : "https://login.microsoftonline.com/organizations";

    console.log("🔧 MSAL authority:", authorityEndpoint);

    const msalConfig = {
      auth: {
        clientId: clientId,
        authority: authorityEndpoint,
        redirectUri: window.location.origin,
        navigateToLoginRequestUrl: true,
        knownAuthorities: ["login.microsoftonline.com"],
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) return;
            switch (level) {
              case msal.LogLevel.Error:
                console.error("MSAL:", message);
                break;
              case msal.LogLevel.Warning:
                console.warn("MSAL:", message);
                break;
              case msal.LogLevel.Info:
                console.info("MSAL:", message);
                break;
              default:
                console.debug("MSAL:", message);
            }
          },
          logLevel: msal.LogLevel.Warning,
        },
      },
    };

    try {
      this.msalInstance = new msal.PublicClientApplication(msalConfig);
      await this.msalInstance.initialize();

      // Handle redirect response
      const response = await this.msalInstance.handleRedirectPromise();
      if (response) {
        this.account = response.account;
        this.accessToken = response.accessToken;
        console.log("✅ MSAL: Logged in via redirect");

        // Initialize RBAC after redirect login
        if (typeof RBAC !== "undefined") {
          const rbacResult = await RBAC.init(this.account);
          if (
            !rbacResult.success &&
            rbacResult.error === "unauthorized_tenant"
          ) {
            console.error("🚫 Tenant not authorized");
            RBAC.showUnauthorizedTenantError();
            this.account = null;
            this.accessToken = null;
            return false;
          }
        }
      }

      // Check for existing accounts
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        this.account = accounts[0];
        console.log("✅ MSAL: Found existing account:", this.account.username);

        // Initialize RBAC for existing session
        if (typeof RBAC !== "undefined") {
          const rbacResult = await RBAC.init(this.account);
          if (
            !rbacResult.success &&
            rbacResult.error === "unauthorized_tenant"
          ) {
            console.error("🚫 Tenant not authorized");
            RBAC.showUnauthorizedTenantError();
            this.account = null;
            this.accessToken = null;
            return false;
          }
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("❌ MSAL initialization failed:", error);
      return false;
    }
  },

  /**
   * Get saved configuration from localStorage
   */
  getSavedConfig() {
    try {
      const config = localStorage.getItem("atea-idlm-config");
      return config ? JSON.parse(config) : {};
    } catch (e) {
      return {};
    }
  },

  /**
   * Login with popup
   */
  async loginPopup() {
    if (!this.msalInstance) {
      throw new Error("MSAL not initialized");
    }

    // Only request User.Read for basic authentication
    // Backend API uses Application permissions to access Graph API data
    const scopes = ["User.Read"];

    const loginRequest = {
      scopes: scopes,
      prompt: "select_account",
    };

    try {
      const response = await this.msalInstance.loginPopup(loginRequest);
      this.account = response.account;
      this.accessToken = response.accessToken;
      console.log("✅ MSAL: Login successful");

      // Initialize RBAC after login
      if (typeof RBAC !== "undefined") {
        const rbacResult = await RBAC.init(this.account);
        if (!rbacResult.success && rbacResult.error === "unauthorized_tenant") {
          console.error("🚫 Tenant not authorized");
          RBAC.showUnauthorizedTenantError();
          this.account = null;
          this.accessToken = null;
          return null;
        }
      }

      return response;
    } catch (error) {
      console.error("❌ MSAL login failed:", error);
      throw error;
    }
  },

  /**
   * Login with redirect (for browsers that block popups)
   */
  async loginRedirect() {
    if (!this.msalInstance) {
      throw new Error("MSAL not initialized");
    }

    // Only request User.Read for basic authentication
    const scopes = ["User.Read"];

    const loginRequest = {
      scopes: scopes,
    };

    await this.msalInstance.loginRedirect(loginRequest);
  },

  /**
   * Get access token silently or via interaction
   */
  async getAccessToken() {
    if (!this.msalInstance || !this.account) {
      console.warn("🔑 MSAL: Cannot get token - not initialized or no account");
      return null;
    }

    // Return cached token if available and not expired
    if (this.accessToken) {
      return this.accessToken;
    }

    // Only request User.Read for basic authentication
    const scopes = ["User.Read"];

    const tokenRequest = {
      scopes: scopes,
      account: this.account,
    };

    try {
      const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
      this.accessToken = response.accessToken;
      console.log("🔑 MSAL: Token acquired silently");
      return response.accessToken;
    } catch (error) {
      console.warn("🔑 MSAL: Silent token acquisition failed:", error.message);
      // Don't try popup automatically - it might be blocked
      // Instead, try redirect if the error is interaction_required
      if (error.errorCode === "interaction_required" || 
          error.errorCode === "consent_required" ||
          error.errorCode === "login_required") {
        console.log("🔑 MSAL: Interaction required, redirecting...");
        try {
          await this.msalInstance.acquireTokenRedirect(tokenRequest);
          return null; // Will reload page after redirect
        } catch (redirectError) {
          console.error("🔑 MSAL: Redirect failed:", redirectError);
        }
      }
      return null;
    }
  },

  /**
   * Logout
   */
  async logout() {
    if (!this.msalInstance) return;

    await this.msalInstance.logoutPopup({
      account: this.account,
    });

    this.account = null;
    this.accessToken = null;
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.account !== null;
  },

  /**
   * Get current user info
   */
  getUserInfo() {
    if (!this.account) return null;
    return {
      name: this.account.name,
      username: this.account.username,
      tenantId: this.account.tenantId,
    };
  },
};
