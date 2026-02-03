/**
 * Microsoft Graph API Client
 * Handles all API calls to Microsoft Graph and on-premises APIs
 * Now supports Backend API mode (Application permissions) or direct Graph (Delegated)
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const GraphAPI = {
  accessToken: null,
  baseUrl: "https://graph.microsoft.com/v1.0",
  betaUrl: "https://graph.microsoft.com/beta",
  useBackendApi: false, // Will be set to true if backend API is available

  /**
   * Initialize the API client
   */
  async init(accessToken) {
    this.accessToken = accessToken;

    // Check if backend API is available
    await this.checkBackendApi();

    // If using backend API, pass the user token for authentication
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      BackendAPI.setUserToken(accessToken);
      console.log(
        "📡 Graph API client initialized (Backend API mode - user authenticated, app permissions for data)",
      );
    } else {
      console.log("📡 Graph API client initialized (Direct Graph API mode)");
    }
  },

  /**
   * Check if the backend API server is available
   */
  async checkBackendApi() {
    try {
      const response = await fetch("/api/health", { method: "GET" });
      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok") {
          this.useBackendApi = true;
          console.log(
            "✅ Backend API available - using Application permissions",
          );
          return true;
        }
      }
    } catch (e) {
      // Backend not available, use direct Graph API
    }
    this.useBackendApi = false;
    return false;
  },

  /**
   * Make authenticated request to Graph API
   */
  async request(endpoint, options = {}, useBeta = false) {
    const baseUrl = useBeta ? this.betaUrl : this.baseUrl;
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${baseUrl}${endpoint}`;

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorCode = error.error?.code || "";
        const errorMessage =
          error.error?.message || `API request failed: ${response.status}`;

        // Provide clearer error messages for common issues
        if (response.status === 403) {
          throw new Error(`Access Denied (403): ${errorMessage}`);
        }

        if (response.status === 401) {
          throw new Error(
            `Authentication Error: Your session may have expired. Please sign out and sign in again.`,
          );
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("Graph API Error:", error);
      throw error;
    }
  },

  /**
   * Get all pages of a paginated response
   */
  async getAllPages(endpoint, useBeta = false) {
    let results = [];
    let nextLink = endpoint;

    while (nextLink) {
      const response = await this.request(nextLink, {}, useBeta);
      results = results.concat(response.value || []);
      nextLink = response["@odata.nextLink"];

      // Safety limit
      if (results.length > 10000) {
        console.warn("Reached 10,000 item limit");
        break;
      }
    }

    return results;
  },

  // ============================================================================
  // User APIs
  // ============================================================================

  /**
   * Get all users with sign-in activity (with caching)
   * Uses Backend API when available (Application permissions)
   */
  async getUsers(forceRefresh = false) {
    // Use Backend API if available (Application permissions - no user consent needed!)
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      if (typeof DataCache !== "undefined") {
        return await DataCache.withCache(
          "users",
          async () => await BackendAPI.getUsers(),
          forceRefresh,
        );
      }
      return await BackendAPI.getUsers();
    }

    // Fallback to direct Graph API (requires delegated permissions)
    if (typeof DataCache !== "undefined") {
      return await DataCache.withCache(
        "users",
        async () => {
          const endpoint =
            "/users?$select=id,displayName,userPrincipalName,mail,userType,accountEnabled,createdDateTime,signInActivity,assignedLicenses&$top=999";
          return await this.getAllPages(endpoint, true);
        },
        forceRefresh,
      );
    }
    const endpoint =
      "/users?$select=id,displayName,userPrincipalName,mail,userType,accountEnabled,createdDateTime,signInActivity,assignedLicenses&$top=999";
    return await this.getAllPages(endpoint, true); // signInActivity requires beta
  },

  /**
   * Get MFA registration details for users
   * Uses the reports/authenticationMethods/userRegistrationDetails endpoint
   * Uses Backend API when available (Application permissions)
   */
  async getMfaRegistrationDetails() {
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      if (typeof DataCache !== "undefined") {
        return await DataCache.withCache("mfaDetails", async () => {
          try {
            return await BackendAPI.getMfaDetails();
          } catch (error) {
            console.warn("⚠️ MFA registration details not available:", error.message);
            return [];
          }
        });
      }
      try {
        return await BackendAPI.getMfaDetails();
      } catch (error) {
        console.warn("⚠️ MFA registration details not available:", error.message);
        return [];
      }
    }

    // Fallback to direct Graph API
    if (typeof DataCache !== "undefined") {
      return await DataCache.withCache("mfaDetails", async () => {
        try {
          const endpoint =
            "/reports/authenticationMethods/userRegistrationDetails?$top=999";
          const response = await this.getAllPages(endpoint, true);
          return response;
        } catch (error) {
          console.warn(
            "⚠️ MFA registration details not available:",
            error.message,
          );
          return [];
        }
      });
    }
    try {
      const endpoint =
        "/reports/authenticationMethods/userRegistrationDetails?$top=999";
      return await this.getAllPages(endpoint, true);
    } catch (error) {
      console.warn("⚠️ MFA registration details not available:", error.message);
      return [];
    }
  },

  /**
   * Get users with their MFA status
   */
  async getUsersWithMfaStatus(forceRefresh = false) {
    const [users, mfaDetails] = await Promise.all([
      this.getUsers(forceRefresh),
      this.getMfaRegistrationDetails(),
    ]);

    // Create a map of user MFA status
    const mfaMap = new Map();
    mfaDetails.forEach((detail) => {
      mfaMap.set(detail.userPrincipalName?.toLowerCase(), {
        isMfaRegistered: detail.isMfaRegistered || false,
        isMfaCapable: detail.isMfaCapable || false,
        methodsRegistered: detail.methodsRegistered || [],
        defaultMethod: detail.defaultMfaMethod || null,
      });
    });

    // Enrich users with MFA status
    return users.map((user) => {
      const upn = (user.userPrincipalName || user.mail || "").toLowerCase();
      const mfaInfo = mfaMap.get(upn);
      return {
        ...user,
        mfaRegistered: mfaInfo?.isMfaRegistered || false,
        mfaCapable: mfaInfo?.isMfaCapable || false,
        mfaMethods: mfaInfo?.methodsRegistered || [],
        defaultMfaMethod: mfaInfo?.defaultMethod,
      };
    });
  },

  /**
   * Get user statistics
   */
  async getUserStats() {
    const users = await this.getUsers();
    const now = new Date();
    const inactivityThreshold = new Date();
    inactivityThreshold.setDate(
      now.getDate() - (Config?.ui?.inactivityDays || 90),
    );

    const stats = {
      total: users.length,
      members: 0,
      guests: 0,
      active: 0,
      inactive: 0,
      disabled: 0,
    };

    users.forEach((user) => {
      // Count by type
      if (user.userType === "Guest") {
        stats.guests++;
      } else {
        stats.members++;
      }

      // Count by status
      if (!user.accountEnabled) {
        stats.disabled++;
      } else if (user.signInActivity?.lastSignInDateTime) {
        const lastSignIn = new Date(user.signInActivity.lastSignInDateTime);
        if (lastSignIn < inactivityThreshold) {
          stats.inactive++;
        } else {
          stats.active++;
        }
      } else {
        stats.inactive++; // No sign-in recorded
      }
    });

    return stats;
  },

  // ============================================================================
  // License APIs
  // ============================================================================

  /**
   * License price estimates (monthly cost per license in NOK)
   * Source: Microsoft Price List for Norway (approximate retail prices)
   * Free licenses are marked with 0
   */
  LICENSE_PRICES: {
    // ========== FREE LICENSES (0 NOK) ==========
    // These are free licenses provided by Microsoft
    POWER_BI_STANDARD: 0, // Power BI (free)
    FLOW_FREE: 0, // Power Automate Free
    POWERAPPS_VIRAL: 0, // Power Apps Free (viral)
    POWER_AUTOMATE_FREE: 0, // Power Automate Free
    TEAMS_EXPLORATORY: 0, // Teams Exploratory
    STREAM: 0, // Microsoft Stream
    WINDOWS_STORE: 0, // Windows Store for Business
    CCIBOTS_PRIVPREV_VIRAL: 0, // Power Virtual Agents Viral
    POWERPAGES_VIRAL: 0, // Power Pages vTrial for Makers
    RIGHTSMANAGEMENT_ADHOC: 0, // Rights Management Adhoc
    MICROSOFT_BUSINESS_CENTER: 0, // Microsoft Business Center
    FORMS_PRO: 0, // Forms Pro Trial
    POWERAPPS_DEV: 0, // Power Apps Developer Plan
    POWER_PAGES_VTRIAL_FOR_MAKERS: 0, // Power Pages vTrial

    // ========== MICROSOFT 365 ENTERPRISE ==========
    ENTERPRISEPREMIUM: 570, // Office 365 E5
    SPE_E5: 620, // Microsoft 365 E5
    ENTERPRISEPACK: 360, // Office 365 E3
    SPE_E3: 420, // Microsoft 365 E3
    ENTERPRISEWITHSCAL: 230, // Office 365 E4
    STANDARDPACK: 125, // Office 365 E1
    DEVELOPERPACK: 250, // Office 365 E3 Developer

    // ========== MICROSOFT 365 BUSINESS ==========
    O365_BUSINESS_PREMIUM: 220, // Microsoft 365 Business Premium
    O365_BUSINESS_ESSENTIALS: 60, // Microsoft 365 Business Basic
    SMB_BUSINESS: 160, // Microsoft 365 Business Standard
    SMB_BUSINESS_ESSENTIALS: 60, // Microsoft 365 Business Basic
    SPB: 220, // Microsoft 365 Business Premium

    // ========== FRONTLINE ==========
    DESKLESSPACK: 80, // Office 365 F3
    SPE_F1: 25, // Microsoft 365 F1
    M365_F1: 25, // Microsoft 365 F1
    M365_F3: 80, // Microsoft 365 F3

    // ========== POWER PLATFORM (PAID) ==========
    POWER_BI_PRO: 100, // Power BI Pro
    POWER_BI_PREMIUM_P1: 200, // Power BI Premium Per User
    POWERAPPS_PER_USER: 400, // Power Apps per user plan
    FLOW_PER_USER: 150, // Power Automate per user plan
    POWERAUTOMATE_ATTENDED_RPA: 400, // Power Automate Attended RPA
    POWER_AUTOMATE_ATTENDED_RPA: 400,

    // ========== PROJECT & VISIO ==========
    PROJECTPROFESSIONAL: 550, // Project Plan 3
    PROJECTPREMIUM: 850, // Project Plan 5
    PROJECT_P1: 100, // Project Plan 1
    VISIO_PLAN2: 150, // Visio Plan 2
    VISIO_PLAN1: 50, // Visio Plan 1
    VISIOCLIENT: 150, // Visio Plan 2

    // ========== DYNAMICS 365 ==========
    GUIDES_USER: 650, // Dynamics 365 Guides
    REMOTE_ASSIST: 650, // Dynamics 365 Remote Assist
    MICROSOFT_REMOTE_ASSIST: 650, // Microsoft Remote Assist

    // ========== SECURITY & COMPLIANCE ==========
    IDENTITY_THREAT_PROTECTION: 120,
    ATP_ENTERPRISE: 20, // Defender for Office 365 P1
    THREAT_INTELLIGENCE: 50, // Defender for Office 365 P2
    INFORMATION_PROTECTION_COMPLIANCE: 120,
    EMS: 170, // Enterprise Mobility + Security E3
    EMSPREMIUM: 270, // Enterprise Mobility + Security E5
    AAD_PREMIUM: 60, // Azure AD Premium P1
    AAD_PREMIUM_P2: 90, // Azure AD Premium P2
    INTUNE_A: 80, // Microsoft Intune

    // ========== EXCHANGE ==========
    EXCHANGESTANDARD: 40, // Exchange Online Plan 1
    EXCHANGEENTERPRISE: 80, // Exchange Online Plan 2
    EXCHANGE_S_DESKLESS: 20, // Exchange Online Kiosk
    EXCHANGEARCHIVE: 30, // Exchange Online Archiving

    // ========== SHAREPOINT & ONEDRIVE ==========
    SHAREPOINTSTANDARD: 50, // SharePoint Online Plan 1
    SHAREPOINTENTERPRISE: 100, // SharePoint Online Plan 2
    ONEDRIVEENTERPRISE: 50, // OneDrive for Business Plan 2

    // ========== TEAMS ==========
    TEAMS_PREMIUM: 100, // Teams Premium
    MCO_TEAMS_IW: 0, // Teams Trial
    MCOEV: 120, // Teams Phone Standard

    // ========== DEFENDER ==========
    MDATP_XPLAT: 52, // Defender for Endpoint P1
    WIN_DEF_ATP: 52, // Defender for Endpoint P2
    DEFENDER_ENDPOINT_P1: 30,
    ATP_ENTERPRISE_FACULTY: 20,
  },

  /**
   * Get the price for a SKU - NO GUESSING, only exact matches
   */
  getLicensePrice(skuPartNumber) {
    // Direct match
    if (this.LICENSE_PRICES[skuPartNumber] !== undefined) {
      return this.LICENSE_PRICES[skuPartNumber];
    }

    // Normalize the SKU name (uppercase, remove special chars)
    const normalized = skuPartNumber.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (this.LICENSE_PRICES[normalized] !== undefined) {
      return this.LICENSE_PRICES[normalized];
    }

    // Check if it's a free/trial/viral license (these are always free)
    const freePatterns = [
      "FREE",
      "TRIAL",
      "VIRAL",
      "PREVIEW",
      "PRIVPREV",
      "VTRIAL",
      "EXPLORATORY",
      "_DEV", // Developer licenses are typically free
    ];
    if (freePatterns.some((p) => skuPartNumber.toUpperCase().includes(p))) {
      return 0;
    }

    // NO FALLBACK GUESSING - return null for unknown licenses
    // This ensures we don't show incorrect prices
    console.warn(
      `⚠️ Unknown license SKU: ${skuPartNumber} - please add to LICENSE_PRICES`,
    );
    return null;
  },

  /**
   * Get all subscribed SKUs (licenses) - transformed for UI
   * Uses Backend API when available (Application permissions)
   */
  async getSubscribedSkus() {
    let skus;
    
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      skus = await BackendAPI.getLicenses();
    } else {
      const endpoint = "/subscribedSkus";
      const response = await this.request(endpoint);
      skus = response.value || [];
    }

    // Transform to format expected by licenses page
    return skus.map((sku) => {
      const purchased = sku.prepaidUnits?.enabled || 0;
      const assigned = sku.consumedUnits || 0;
      const available = purchased - assigned;
      const unitCost = this.getLicensePrice(sku.skuPartNumber);

      // If unitCost is null, mark as unknown
      const isUnknown = unitCost === null;
      const finalCost = isUnknown ? 0 : unitCost;

      return {
        id: sku.id,
        skuId: sku.skuId,
        skuPartNumber: sku.skuPartNumber,
        name: this.formatLicenseName(sku.skuPartNumber),
        purchased: purchased,
        assigned: assigned,
        available: available,
        unitCost: finalCost,
        isUnknownPrice: isUnknown,
        utilization:
          purchased > 0 ? Math.round((assigned / purchased) * 100) : 0,
      };
    });
  },

  /**
   * Format SKU part number into readable name
   */
  formatLicenseName(skuPartNumber) {
    const nameMap = {
      // Microsoft 365 Enterprise
      ENTERPRISEPREMIUM: "Office 365 E5",
      SPE_E5: "Microsoft 365 E5",
      ENTERPRISEPACK: "Office 365 E3",
      SPE_E3: "Microsoft 365 E3",
      STANDARDPACK: "Office 365 E1",
      DEVELOPERPACK: "Office 365 E3 Developer",

      // Microsoft 365 Business
      O365_BUSINESS_PREMIUM: "Microsoft 365 Business Premium",
      O365_BUSINESS_ESSENTIALS: "Microsoft 365 Business Basic",
      SMB_BUSINESS: "Microsoft 365 Business Standard",
      SMB_BUSINESS_ESSENTIALS: "Microsoft 365 Business Basic",
      SPB: "Microsoft 365 Business Premium",

      // Frontline
      DESKLESSPACK: "Office 365 F3",
      SPE_F1: "Microsoft 365 F1",
      M365_F1: "Microsoft 365 F1",
      M365_F3: "Microsoft 365 F3",

      // Power Platform - Free
      POWER_BI_STANDARD: "Power BI (Free)",
      FLOW_FREE: "Power Automate Free",
      POWERAPPS_VIRAL: "Power Apps (Free)",
      POWER_AUTOMATE_FREE: "Power Automate Free",
      POWERAPPS_DEV: "Power Apps Developer Plan",
      CCIBOTS_PRIVPREV_VIRAL: "Power Virtual Agents (Viral)",
      POWERPAGES_VIRAL: "Power Pages Trial",
      POWER_PAGES_VTRIAL_FOR_MAKERS: "Power Pages Trial for Makers",

      // Power Platform - Paid
      POWER_BI_PRO: "Power BI Pro",
      POWER_BI_PREMIUM_P1: "Power BI Premium Per User",
      POWERAUTOMATE_ATTENDED_RPA: "Power Automate RPA Attended",

      // Project & Visio
      PROJECTPROFESSIONAL: "Project Plan 3",
      PROJECTPREMIUM: "Project Plan 5",
      PROJECT_P1: "Project Plan 1",
      VISIO_PLAN2: "Visio Plan 2",
      VISIO_PLAN1: "Visio Plan 1",
      VISIOCLIENT: "Visio Plan 2",

      // Dynamics 365
      GUIDES_USER: "Dynamics 365 Guides",
      REMOTE_ASSIST: "Dynamics 365 Remote Assist",
      MICROSOFT_REMOTE_ASSIST: "Dynamics 365 Remote Assist",

      // Teams
      TEAMS_PREMIUM: "Teams Premium",
      TEAMS_EXPLORATORY: "Teams Exploratory (Free)",
      MCO_TEAMS_IW: "Teams Trial",
      MCOEV: "Teams Phone Standard",

      // Security
      EMS: "Enterprise Mobility + Security E3",
      EMSPREMIUM: "Enterprise Mobility + Security E5",
      AAD_PREMIUM: "Azure AD Premium P1",
      AAD_PREMIUM_P2: "Azure AD Premium P2",
      ATP_ENTERPRISE: "Defender for Office 365 P1",
      THREAT_INTELLIGENCE: "Defender for Office 365 P2",
      WIN_DEF_ATP: "Defender for Endpoint P2",
      MDATP_XPLAT: "Defender for Endpoint P1",
      INTUNE_A: "Microsoft Intune",

      // Exchange
      EXCHANGESTANDARD: "Exchange Online Plan 1",
      EXCHANGEENTERPRISE: "Exchange Online Plan 2",
      EXCHANGE_S_DESKLESS: "Exchange Online Kiosk",
      EXCHANGEARCHIVE: "Exchange Online Archiving",

      // SharePoint
      SHAREPOINTSTANDARD: "SharePoint Online Plan 1",
      SHAREPOINTENTERPRISE: "SharePoint Online Plan 2",

      // Other
      WINDOWS_STORE: "Windows Store for Business",
      STREAM: "Microsoft Stream",
    };

    return nameMap[skuPartNumber] || skuPartNumber.replace(/_/g, " ");
  },

  /**
   * Get raw subscribed SKUs (for internal use)
   * Uses Backend API when available (Application permissions)
   */
  async getSubscribedSkusRaw() {
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      return await BackendAPI.getLicenses();
    }
    
    const endpoint = "/subscribedSkus";
    const response = await this.request(endpoint);
    return response.value || [];
  },

  /**
   * Get license assignment details
   */
  async getLicenseStats() {
    const skus = await this.getSubscribedSkusRaw();
    const users = await this.getUsers();

    // Create a map of user status
    const now = new Date();
    const inactivityThreshold = new Date();
    inactivityThreshold.setDate(
      now.getDate() - (Config?.ui?.inactivityDays || 90),
    );

    const userStatusMap = new Map();
    users.forEach((user) => {
      let status = "active";
      if (!user.accountEnabled) {
        status = "disabled";
      } else if (
        !user.signInActivity?.lastSignInDateTime ||
        new Date(user.signInActivity.lastSignInDateTime) < inactivityThreshold
      ) {
        status = "inactive";
      }
      userStatusMap.set(user.id, status);
    });

    // License price estimates in NOK
    const priceEstimates = this.LICENSE_PRICES;

    let totalCost = 0;
    let unassigned = 0;
    let inactive = 0;
    let disabled = 0;
    const breakdown = [];

    for (const sku of skus) {
      const price = priceEstimates[sku.skuPartNumber] || 200; // Default NOK 200
      const total = sku.prepaidUnits?.enabled || 0;
      const consumed = sku.consumedUnits || 0;

      // Handle "unlimited" or bulk licenses
      // Microsoft uses various thresholds: 10000, 50000, 100000, 500000, 10000000 for unlimited/bulk
      // If total is much larger than consumed (10x+) and > 1000, it's likely a bulk/unlimited license
      const isUnlimited =
        total > 10000 || (total > 1000 && total > consumed * 10);
      const isFree = price === 0;

      // Calculate available (unassigned) licenses
      // Only count as unassigned for realistic quantities
      const rawAvailable = Math.max(0, total - consumed);
      const available = isUnlimited ? 0 : rawAvailable;

      // Only count unassigned for paid, limited, reasonable licenses
      // Also skip if available > 1000 (likely a provisioning artifact)
      if (!isUnlimited && !isFree && available <= 1000) {
        unassigned += available;
      }

      totalCost += consumed * price;

      breakdown.push({
        name: sku.skuPartNumber,
        displayName: this.formatLicenseName(sku.skuPartNumber),
        count: isUnlimited ? consumed : total, // Show consumed for unlimited
        consumed: consumed,
        cost: price,
        available: available,
        isUnlimited: isUnlimited,
        isFree: isFree,
      });
    }

    // Count licenses assigned to inactive/disabled users
    // Use the users we already have instead of a separate query
    users.forEach((user) => {
      const licenseCount = user.assignedLicenses?.length || 0;
      if (licenseCount > 0) {
        const status = userStatusMap.get(user.id);
        if (status === "inactive") {
          inactive += licenseCount;
        } else if (status === "disabled") {
          disabled += licenseCount;
        }
      }
    });

    // Calculate potential savings from unassigned paid licenses
    // Only count savings from licenses we could actually reclaim
    // Use weighted average based on actual license counts
    let potentialSavings = 0;

    // Add savings from unassigned licenses (already filtered)
    // Use average price of paid licenses
    const paidLicenses = breakdown.filter((l) => !l.isFree && !l.isUnlimited);
    const avgPrice =
      paidLicenses.length > 0
        ? paidLicenses.reduce((sum, l) => sum + l.cost, 0) / paidLicenses.length
        : 200;

    potentialSavings += unassigned * avgPrice;

    // Add savings from licenses on inactive/disabled users
    // These are actual recoverable savings
    potentialSavings += (inactive + disabled) * avgPrice;

    // Round to nearest whole number
    potentialSavings = Math.round(potentialSavings);

    return {
      totalCost,
      potentialSavings,
      unassigned,
      inactive,
      disabled,
      breakdown,
    };
  },

  // ============================================================================
  // Security APIs
  // ============================================================================

  /**
   * Get MFA registration details
   * Uses Backend API when available (Application permissions)
   */
  async getMfaStats() {
    let registrations;
    
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      try {
        registrations = await BackendAPI.getMfaDetails();
      } catch (error) {
        console.warn("⚠️ MFA stats not available:", error.message);
        return { registered: 0, missing: 0 };
      }
    } else {
      // Get authentication methods registration via direct Graph API
      const endpoint = "/reports/authenticationMethods/userRegistrationDetails";
      registrations = await this.getAllPages(endpoint, true);
    }

    let registered = 0;
    let missing = 0;

    registrations.forEach((reg) => {
      if (reg.isMfaRegistered) {
        registered++;
      } else {
        missing++;
      }
    });

    return { registered, missing };
  },

  /**
   * Get directory roles (raw)
   * Uses Backend API when available (Application permissions)
   */
  async getDirectoryRoles() {
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      return await BackendAPI.getRoles();
    }
    
    const endpoint = "/directoryRoles?$expand=members";
    const response = await this.request(endpoint);
    return response.value || [];
  },

  /**
   * Get directory roles and members (formatted for dashboard)
   * Uses Backend API when available (Application permissions)
   */
  async getAdminRoles() {
    let roles;
    
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      roles = await BackendAPI.getRoles();
    } else {
      const endpoint = "/directoryRoles?$expand=members";
      const response = await this.request(endpoint);
      roles = response.value || [];
    }

    let globalAdmins = 0;
    let totalPrivileged = 0;
    const adminRoles = [];

    roles.forEach((role) => {
      const memberCount = role.members?.length || 0;
      if (memberCount > 0) {
        totalPrivileged += memberCount;

        if (role.displayName === "Global Administrator") {
          globalAdmins = memberCount;
        }

        adminRoles.push({
          name: role.displayName,
          count: memberCount,
        });
      }
    });

    // Sort by count descending
    adminRoles.sort((a, b) => b.count - a.count);

    return {
      globalAdmins,
      privilegedRoles: totalPrivileged,
      adminRoles: adminRoles.slice(0, 10), // Top 10
    };
  },

  // ============================================================================
  // Sign-in APIs
  // ============================================================================

  /**
   * Get sign-in logs for the last N days
   * Uses Backend API when available (Application permissions)
   */
  async getSignInLogs(days = 7) {
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      try {
        const signIns = await BackendAPI.getSignIns();
        // Filter by date client-side
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return signIns.filter(s => new Date(s.createdDateTime) >= startDate);
      } catch (error) {
        console.warn("⚠️ Sign-in logs not available:", error.message);
        return [];
      }
    }

    // Fallback to direct Graph API
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const endpoint = `/auditLogs/signIns?$filter=createdDateTime ge ${startDateStr}&$top=999&$select=id,createdDateTime,userPrincipalName,appDisplayName,ipAddress,location,status,riskState,riskLevelDuringSignIn`;

    return await this.getAllPages(endpoint, true);
  },

  /**
   * Get sign-in statistics with location data
   */
  async getSignInStats(days = 7) {
    const signIns = await this.getSignInLogs(days);

    const locationMap = new Map();
    let totalSignIns = signIns.length;
    let failedSignIns = 0;
    let riskySignIns = 0;

    signIns.forEach((signIn) => {
      // Count failed
      if (signIn.status?.errorCode !== 0) {
        failedSignIns++;
      }

      // Count risky
      if (
        signIn.riskState &&
        signIn.riskState !== "none" &&
        signIn.riskState !== "dismissed"
      ) {
        riskySignIns++;
      }

      // Aggregate by location
      if (signIn.location?.countryOrRegion) {
        const country = signIn.location.countryOrRegion;
        const city = signIn.location.city || "Unknown";
        const key = `${country}|${city}`;

        if (!locationMap.has(key)) {
          locationMap.set(key, {
            country,
            city,
            lat: signIn.location.geoCoordinates?.latitude || 0,
            lon: signIn.location.geoCoordinates?.longitude || 0,
            successCount: 0,
            failedCount: 0,
          });
        }

        const loc = locationMap.get(key);
        if (signIn.status?.errorCode === 0) {
          loc.successCount++;
        } else {
          loc.failedCount++;
        }
      }
    });

    const locations = Array.from(locationMap.values());
    locations.sort(
      (a, b) =>
        b.successCount + b.failedCount - (a.successCount + a.failedCount),
    );

    return {
      totalSignIns,
      failedSignIns,
      riskySignIns,
      uniqueCountries: new Set(locations.map((l) => l.country)).size,
      locations,
    };
  },

  // ============================================================================
  // Domain and Policy APIs
  // ============================================================================

  /**
   * Get organization domains
   */
  async getDomains() {
    const endpoint = "/domains";
    const response = await this.request(endpoint);
    return response.value || [];
  },

  /**
   * Get conditional access policies
   * Uses Backend API when available (Application permissions)
   */
  async getConditionalAccessPolicies() {
    // Use Backend API if available
    if (this.useBackendApi && typeof BackendAPI !== "undefined") {
      return await BackendAPI.getPolicies();
    }
    
    const endpoint = "/identity/conditionalAccess/policies";
    const response = await this.request(endpoint);
    return response.value || [];
  },

  // ============================================================================
  // Remediation APIs (Write Operations)
  // ============================================================================

  /**
   * Disable a user account
   * Requires: User.ReadWrite.All
   * @param {string} userId - User ID or UPN
   * @returns {Promise<boolean>} Success status
   */
  async disableUser(userId) {
    console.log(`🔒 Disabling user: ${userId}`);
    const endpoint = `/users/${userId}`;
    await this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify({ accountEnabled: false }),
    });
    console.log(`✅ User disabled: ${userId}`);
    return true;
  },

  /**
   * Enable a user account
   * Requires: User.ReadWrite.All
   * @param {string} userId - User ID or UPN
   * @returns {Promise<boolean>} Success status
   */
  async enableUser(userId) {
    console.log(`🔓 Enabling user: ${userId}`);
    const endpoint = `/users/${userId}`;
    await this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify({ accountEnabled: true }),
    });
    console.log(`✅ User enabled: ${userId}`);
    return true;
  },

  /**
   * Revoke all sign-in sessions for a user
   * Requires: User.ReadWrite.All or User.RevokeSessions.All
   * @param {string} userId - User ID or UPN
   * @returns {Promise<boolean>} Success status
   */
  async revokeUserSessions(userId) {
    console.log(`🚫 Revoking sessions for user: ${userId}`);
    const endpoint = `/users/${userId}/revokeSignInSessions`;
    await this.request(endpoint, {
      method: "POST",
    });
    console.log(`✅ Sessions revoked for: ${userId}`);
    return true;
  },

  /**
   * Remove a license from a user
   * Requires: Directory.ReadWrite.All or User.ReadWrite.All
   * @param {string} userId - User ID or UPN
   * @param {string} skuId - SKU ID of the license to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeLicense(userId, skuId) {
    console.log(`📋 Removing license ${skuId} from user: ${userId}`);
    const endpoint = `/users/${userId}/assignLicense`;
    await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        addLicenses: [],
        removeLicenses: [skuId],
      }),
    });
    console.log(`✅ License removed from: ${userId}`);
    return true;
  },

  /**
   * Assign a license to a user
   * Requires: Directory.ReadWrite.All or User.ReadWrite.All
   * @param {string} userId - User ID or UPN
   * @param {string} skuId - SKU ID of the license to assign
   * @param {Array} disabledPlans - Optional array of service plan IDs to disable
   * @returns {Promise<boolean>} Success status
   */
  async assignLicense(userId, skuId, disabledPlans = []) {
    console.log(`📋 Assigning license ${skuId} to user: ${userId}`);
    const endpoint = `/users/${userId}/assignLicense`;
    await this.request(endpoint, {
      method: "POST",
      body: JSON.stringify({
        addLicenses: [
          {
            skuId: skuId,
            disabledPlans: disabledPlans,
          },
        ],
        removeLicenses: [],
      }),
    });
    console.log(`✅ License assigned to: ${userId}`);
    return true;
  },

  /**
   * Get user's assigned licenses
   * @param {string} userId - User ID or UPN
   * @returns {Promise<Array>} List of assigned licenses
   */
  async getUserLicenses(userId) {
    const endpoint = `/users/${userId}/licenseDetails`;
    const response = await this.request(endpoint);
    return response.value || [];
  },

  /**
   * Bulk disable multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<{success: Array, failed: Array}>} Results
   */
  async bulkDisableUsers(userIds) {
    const results = { success: [], failed: [] };

    for (const userId of userIds) {
      try {
        await this.disableUser(userId);
        results.success.push(userId);
      } catch (error) {
        console.error(`Failed to disable ${userId}:`, error);
        results.failed.push({ userId, error: error.message });
      }
    }

    return results;
  },

  /**
   * Bulk remove licenses from multiple users
   * @param {Array<{userId: string, skuId: string}>} assignments - Array of user/license pairs
   * @returns {Promise<{success: Array, failed: Array}>} Results
   */
  async bulkRemoveLicenses(assignments) {
    const results = { success: [], failed: [] };

    for (const { userId, skuId } of assignments) {
      try {
        await this.removeLicense(userId, skuId);
        results.success.push({ userId, skuId });
      } catch (error) {
        console.error(`Failed to remove license from ${userId}:`, error);
        results.failed.push({ userId, skuId, error: error.message });
      }
    }

    return results;
  },

  // ============================================================================
  // Combined Data Fetch
  // ============================================================================

  /**
   * Fetch all dashboard data
   * Uses backend API if available (no user consent needed)
   */
  async fetchDashboardData() {
    try {
      // Use backend API if available (Application permissions - no consent prompts!)
      if (this.useBackendApi && typeof BackendAPI !== "undefined") {
        console.log("📊 Fetching dashboard data via Backend API...");
        const data = await BackendAPI.getDashboardData();

        // Process data into expected format
        const users = data.users || [];
        const licenses = data.licenses || [];
        const signIns = data.signIns || [];
        const roles = data.roles || [];

        // Calculate user stats
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

        const activeUsers = users.filter((u) => {
          const lastSignIn = u.signInActivity?.lastSignInDateTime;
          return lastSignIn && new Date(lastSignIn) > thirtyDaysAgo;
        });

        const inactiveUsers = users.filter((u) => {
          const lastSignIn = u.signInActivity?.lastSignInDateTime;
          return !lastSignIn || new Date(lastSignIn) < ninetyDaysAgo;
        });

        const guestUsers = users.filter((u) => u.userType === "Guest");
        const disabledUsers = users.filter((u) => !u.accountEnabled);

        // Calculate license stats
        const totalLicenses = licenses.reduce(
          (sum, l) => sum + (l.prepaidUnits?.enabled || 0),
          0,
        );
        const usedLicenses = licenses.reduce(
          (sum, l) => sum + (l.consumedUnits || 0),
          0,
        );

        // Get admin roles
        const adminRoleNames = [
          "Global Administrator",
          "User Administrator",
          "Security Administrator",
          "Exchange Administrator",
          "SharePoint Administrator",
        ];
        const adminRoles = roles.filter((r) =>
          adminRoleNames.some((name) => r.displayName?.includes(name)),
        );
        const globalAdmins =
          adminRoles.find((r) =>
            r.displayName?.includes("Global Administrator"),
          )?.members?.length || 0;
        const totalAdmins = adminRoles.reduce(
          (sum, r) => sum + (r.members?.length || 0),
          0,
        );

        return {
          users: {
            total: users.length,
            active: activeUsers.length,
            inactive: inactiveUsers.length,
            guests: guestUsers.length,
            disabled: disabledUsers.length,
            list: users,
          },
          licenses: {
            total: totalLicenses,
            used: usedLicenses,
            available: totalLicenses - usedLicenses,
            list: licenses,
          },
          security: {
            mfaRegistered: 0, // Will be populated separately
            mfaMissing: 0,
            globalAdmins: globalAdmins,
            totalAdmins: totalAdmins,
            adminRoles: adminRoles,
          },
          signIns: signIns,
          lastUpdated: new Date().toISOString(),
        };
      }

      // Fall back to direct Graph API
      const [userStats, licenseStats, mfaStats, adminRoles, signInStats] =
        await Promise.all([
          this.getUserStats(),
          this.getLicenseStats(),
          this.getMfaStats(),
          this.getAdminRoles(),
          this.getSignInStats(7),
        ]);

      return {
        users: userStats,
        licenses: licenseStats,
        security: {
          mfaRegistered: mfaStats.registered,
          mfaMissing: mfaStats.missing,
          ...adminRoles,
        },
        signIns: signInStats,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  },
};
