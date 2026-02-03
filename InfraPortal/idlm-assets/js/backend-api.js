/**
 * Backend API Client
 * Calls the local backend API server which uses Application permissions
 * User authentication is required - the backend validates user tokens
 * but uses Application permissions to access Graph API data
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.1.0
 */

const BackendAPI = {
  baseUrl: window.location.origin,
  userToken: null,

  /**
   * Set the user's access token for API authentication
   */
  setUserToken(token) {
    this.userToken = token;
    console.log("🔑 BackendAPI: Token set", token ? "✓" : "✗");
  },

  /**
   * Get the user's access token from MSAL
   */
  async getUserToken() {
    // Always try to get fresh token from MSAL first
    if (typeof MSALAuth !== "undefined" && MSALAuth.isLoggedIn()) {
      try {
        const token = await MSALAuth.getAccessToken();
        if (token) {
          this.userToken = token;
          return token;
        }
      } catch (e) {
        console.warn("🔑 BackendAPI: Failed to get token from MSAL:", e.message);
      }
    }

    // Fall back to cached token
    if (this.userToken) {
      return this.userToken;
    }

    console.warn("🔑 BackendAPI: No token available");
    return null;
  },

  /**
   * Make request to backend API
   */
  async request(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;

    // Get user token for authentication
    const token = await this.getUserToken();
    
    console.log(`🔑 BackendAPI request to ${endpoint}, token present: ${!!token}, token length: ${token?.length || 0}`);
    
    const headers = {
      "Content-Type": "application/json",
    };

    // Add authorization header if user is authenticated
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn("🔑 BackendAPI: No token for request to", endpoint);
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (response.status === 401) {
        // User not authenticated - get more details
        const errorBody = await response.json().catch(() => ({}));
        console.error("🔑 BackendAPI 401 error details:", errorBody);
        throw new Error(errorBody.message || "Authentication required. Please sign in.");
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message || error.error || `API request failed: ${response.status}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Backend API Error:", error);
      throw error;
    }
  },

  /**
   * Get all users with sign-in activity
   */
  async getUsers() {
    const data = await this.request("/api/users");
    return data.value || [];
  },

  /**
   * Get subscribed licenses
   */
  async getLicenses() {
    const data = await this.request("/api/licenses");
    return data.value || [];
  },

  /**
   * Get sign-in logs
   */
  async getSignIns() {
    const data = await this.request("/api/signins");
    return data.value || [];
  },

  /**
   * Get directory roles
   */
  async getRoles() {
    const data = await this.request("/api/roles");
    return data.value || [];
  },

  /**
   * Get conditional access policies
   */
  async getPolicies() {
    const data = await this.request("/api/policies");
    return data.value || [];
  },

  /**
   * Get MFA registration details
   */
  async getMfaDetails() {
    const data = await this.request("/api/mfa");
    return data.value || [];
  },

  /**
   * Get risky users
   */
  async getRiskyUsers() {
    const data = await this.request("/api/risky-users");
    return data.value || [];
  },

  /**
   * Get all dashboard data in one call
   */
  async getDashboardData() {
    return await this.request("/api/dashboard");
  },

  /**
   * Health check
   */
  async healthCheck() {
    return await this.request("/api/health");
  },
};

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = BackendAPI;
}
