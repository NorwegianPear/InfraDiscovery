/**
 * Authentication Manager
 * Handles Azure AD authentication via Easy Auth
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const Auth = {
  currentUser: null,
  isAuthenticated: false,
  accessToken: null,

  /**
   * Initialize authentication
   */
  async init() {
    console.log("🔐 Initializing authentication...");

    try {
      // Check if we're in local development
      if (this.isLocalDevelopment()) {
        console.log("🏠 Local development mode - using mock user");
        this.setMockUser();
        return;
      }

      // Fetch user info from Azure Easy Auth
      const response = await fetch("/.auth/me");

      if (!response.ok) {
        console.warn("⚠️ Not authenticated");
        this.updateUI(null);
        return;
      }

      const data = await response.json();

      // Handle both Static Web Apps and App Service formats
      let userInfo = data.clientPrincipal;

      // App Service Easy Auth returns array format
      if (!userInfo && Array.isArray(data) && data.length > 0) {
        const authData = data[0];
        userInfo = {
          userId: authData.user_id || authData.userId,
          userDetails: authData.user_id || authData.userId,
          identityProvider: authData.provider_name || "aad",
          claims: (authData.user_claims || []).map((c) => ({
            typ: c.typ || c.type,
            val: c.val || c.value,
          })),
        };

        // Get display name from claims
        const nameClaim = userInfo.claims.find(
          (c) =>
            c.typ === "name" ||
            c.typ ===
              "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        );
        if (nameClaim) {
          userInfo.userDetails = nameClaim.val;
        }

        // Get access token if available
        if (authData.access_token) {
          this.accessToken = authData.access_token;
          console.log("🎫 Access token obtained from Easy Auth");
        }
      }

      if (userInfo) {
        this.currentUser = userInfo;
        this.isAuthenticated = true;
        console.log("✅ User authenticated:", this.getUserName());
        this.updateUI(userInfo);
      }
    } catch (error) {
      console.error("❌ Authentication error:", error);

      // Fall back to mock user in development
      if (this.isLocalDevelopment()) {
        this.setMockUser();
      }
    }
  },

  /**
   * Get access token for Graph API from Easy Auth
   * Requires App Service to be configured with token store enabled
   */
  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    if (this.isLocalDevelopment()) {
      return null;
    }

    try {
      // Try to refresh and get token
      const response = await fetch("/.auth/refresh");
      if (response.ok) {
        // Fetch updated auth info with token
        const meResponse = await fetch("/.auth/me");
        if (meResponse.ok) {
          const data = await meResponse.json();
          if (Array.isArray(data) && data.length > 0 && data[0].access_token) {
            this.accessToken = data[0].access_token;
            console.log("🎫 Access token refreshed from Easy Auth");
            return this.accessToken;
          }
        }
      }
    } catch (error) {
      console.error("Failed to get access token:", error);
    }

    return null;
  },

  /**
   * Check if we have a valid access token
   */
  hasAccessToken() {
    return !!this.accessToken;
  },

  /**
   * Check if running in local development
   */
  isLocalDevelopment() {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "file:"
    );
  },

  /**
   * Set mock user for development
   */
  setMockUser() {
    this.currentUser = {
      userId: "dev-user-001",
      userDetails: "Developer User",
      identityProvider: "local",
      userRoles: ["admin"],
      claims: [
        { typ: "name", val: "Developer User" },
        { typ: "email", val: "developer@localhost" },
      ],
    };
    this.isAuthenticated = true;
    this.updateUI(this.currentUser);
  },

  /**
   * Get user's display name
   */
  getUserName() {
    if (!this.currentUser) return "Guest";
    return this.currentUser.userDetails || this.currentUser.userId || "User";
  },

  /**
   * Get user's email
   */
  getUserEmail() {
    if (!this.currentUser || !this.currentUser.claims) return "";

    const emailClaim = this.currentUser.claims.find(
      (c) =>
        c.typ === "email" ||
        c.typ === "preferred_username" ||
        c.typ ===
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    );

    return emailClaim ? emailClaim.val : "";
  },

  /**
   * Update UI with user info
   */
  updateUI(userInfo) {
    const userNameEl = document.querySelector(".user-name");
    const userRoleEl = document.querySelector(".user-role");

    if (userInfo) {
      if (userNameEl) {
        userNameEl.textContent = this.getUserName();
      }
      if (userRoleEl) {
        userRoleEl.textContent = this.isLocalDevelopment()
          ? "Local Dev"
          : "Authenticated";
      }
    } else {
      if (userNameEl) {
        userNameEl.textContent = "Not signed in";
      }
      if (userRoleEl) {
        userRoleEl.textContent = "Guest";
      }
    }
  },

  /**
   * Sign out user
   */
  signOut() {
    if (this.isLocalDevelopment()) {
      this.currentUser = null;
      this.isAuthenticated = false;
      this.updateUI(null);
      return;
    }

    window.location.href = "/.auth/logout";
  },
};
