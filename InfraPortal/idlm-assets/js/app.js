/**
 * Atea's Identity and License Management Portal - Main Application
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

// Application State
const App = {
  currentPage: "dashboard",
  data: null,
  isLoading: false,
  useRealApi: false, // Will be set to true when authenticated with Graph API
  msalInitialized: false,

  /**
   * Initialize the application
   */
  async init() {
    console.log("🚀 Initializing Atea Identity and License Management Portal");

    // Initialize configuration
    Config.init();

    // Check if configuration needs setup (has placeholder values)
    if (Config.needsSetup()) {
      console.log("🔧 Configuration needs setup - redirecting to setup wizard");
      this.showSetupRequired();
      return;
    }

    // Update environment badge
    this.updateEnvironmentBadge();

    // Initialize currency selector
    this.initCurrencySelector();

    // Setup navigation
    this.setupNavigation();

    // Setup dashboard section clicks
    this.setupDashboardSectionClicks();

    // Setup refresh button
    this.setupRefreshButton();

    // Setup sign-in button
    this.setupSignInButton();

    // Initialize authentication (if in cloud/hybrid mode)
    if (Config.environment !== "onprem") {
      await Auth.init();

      // Always use MSAL for Graph API tokens (Easy Auth doesn't provide Graph scopes)
      // Easy Auth handles user authentication, MSAL handles Graph API access
      await this.initializeMSAL();
    }

    // Initialize map
    SignInMap.init();

    // Load initial data
    await this.loadData();

    console.log("✅ Application initialized");
  },

  /**
   * Initialize currency selector dropdown
   */
  initCurrencySelector() {
    const selector = document.getElementById("currencySelect");
    if (!selector) return;

    // Set current value from config
    const currentCurrency = Config?.ui?.currency || "NOK";
    selector.value = currentCurrency;

    // Handle currency changes
    selector.addEventListener("change", (e) => {
      const newCurrency = e.target.value;
      if (Config?.ui) {
        Config.ui.currency = newCurrency;
        Config.save();
      }
      console.log(`💱 Currency changed to ${newCurrency}`);

      // Refresh current page to update all currency displays
      this.refreshCurrentPage();
    });
  },

  /**
   * Refresh current page to update displays
   */
  refreshCurrentPage() {
    // Re-navigate to current page to refresh all content with new currency
    const currentPage = this.currentPage;
    if (currentPage === "dashboard") {
      // Reload dashboard data
      this.loadData();
    } else {
      // Re-render the current page
      this.navigateToPage(currentPage);
    }
  },

  /**
   * Show setup required message
   */
  showSetupRequired() {
    const mainContent = document.querySelector(".main-content");
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="page-header">
          <h1>🔧 Configuration Required</h1>
        </div>
        <div style="padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 16px; margin-bottom: 30px;">
            <h2 style="margin: 0 0 20px 0; font-size: 1.5rem;">Welcome to Atea IDLM Portal</h2>
            <p style="margin: 0; opacity: 0.9;">This portal needs to be configured for your Azure AD tenant before you can use it.</p>
          </div>
          
          <div style="background: var(--bg-card); padding: 30px; border-radius: 12px; border: 1px solid var(--border-color);">
            <h3 style="margin: 0 0 20px 0;">Setup Options</h3>
            
            <div style="margin-bottom: 20px;">
              <a href="setup.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; font-size: 1rem;">
                <span>🧙‍♂️</span> Launch Setup Wizard
              </a>
            </div>
            
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
              Or run the deployment script for automated setup:
            </p>
            
            <code style="display: block; background: var(--bg-secondary); padding: 12px; border-radius: 6px; font-size: 0.85rem;">
              .\\Deploy-FullAzure.ps1
            </code>
          </div>
        </div>
      `;
    }
  },

  /**
   * Initialize MSAL for real API authentication
   * Auto-prompts for login if not already authenticated
   */
  async initializeMSAL() {
    try {
      if (typeof MSALAuth !== "undefined") {
        const initialized = await MSALAuth.init();
        this.msalInitialized = initialized;

        if (initialized && MSALAuth.isLoggedIn()) {
          console.log("✅ MSAL: User is logged in, will use real API");
          this.useRealApi = true;
          this.updateAuthUI(true);

          // Get access token for Graph API
          const token = await MSALAuth.getAccessToken();
          if (token) {
            await GraphAPI.init(token);
          }
        } else if (initialized) {
          // Not logged in - show login required screen
          // Don't auto-popup to avoid browser blocking issues
          console.log("ℹ️ MSAL: Not logged in, showing login screen");
          this.showLoginRequired();
        }
      }
    } catch (error) {
      console.warn("MSAL initialization skipped:", error.message);
      this.showLoginRequired();
    }
  },

  /**
   * Show login required message
   */
  showLoginRequired() {
    const contentArea = document.getElementById("contentArea");
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="login-required">
          <div class="login-icon">🔐</div>
          <h2>Authentication Required</h2>
          <p>Please sign in with your organizational account to access the portal.</p>
          <div class="login-buttons">
            <button class="btn btn-primary" onclick="App.signInRedirect()">
              <span class="btn-icon">🔑</span> Sign In
            </button>
          </div>
          <p class="login-note">You must be a member of the authorized tenant to access this portal.</p>
        </div>
        <style>
          .login-required {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            text-align: center;
            padding: 40px;
          }
          .login-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          .login-required h2 {
            color: var(--text-primary);
            margin-bottom: 12px;
          }
          .login-required p {
            color: var(--text-secondary);
            margin-bottom: 24px;
            max-width: 400px;
          }
          .login-buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 8px;
          }
          .login-note {
            font-size: 12px;
            color: var(--text-secondary);
            margin-top: 20px;
          }
        </style>
      `;
    }
  },

  /**
   * Sign in using redirect (more reliable than popup)
   */
  async signInRedirect() {
    try {
      console.log("🔑 Signing in via redirect...");
      await MSALAuth.loginRedirect();
    } catch (error) {
      console.error("Sign-in redirect failed:", error);
      this.showSignInError(error.message);
    }
  },

  /**
   * Retry sign-in
   */
  async retrySignIn() {
    try {
      console.log("🔑 Attempting sign-in...");
      await MSALAuth.loginPopup();
      if (MSALAuth.isLoggedIn()) {
        const token = await MSALAuth.getAccessToken();
        if (token) {
          await GraphAPI.init(token);
          this.useRealApi = true;
          this.updateAuthUI(true);
          // Reload the page to reinitialize
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("Sign-in popup failed:", error);
      // If popup blocked or failed, try redirect
      if (error.errorCode === "popup_window_error" || error.message?.includes("popup")) {
        console.log("Popup blocked, trying redirect...");
        try {
          await MSALAuth.loginRedirect();
        } catch (redirectError) {
          console.error("Redirect also failed:", redirectError);
          this.showSignInError(redirectError.message);
        }
      } else {
        this.showSignInError(error.message);
      }
    }
  },

  /**
   * Show sign-in error message
   */
  showSignInError(message) {
    if (typeof Toast !== "undefined") {
      Toast.error("Sign-in failed: " + message);
    } else {
      alert("Sign-in failed: " + message);
    }
  },

  /**
   * Setup sign-in button for real API access (legacy - button removed)
   */
  setupSignInButton() {
    // Sign-in button has been removed - auto-login is now mandatory
    // This function is kept for backwards compatibility
  },

  /**
   * Handle sign-in click
   */
  async handleSignIn() {
    if (!this.msalInitialized) {
      // Try to initialize MSAL again
      console.log("Attempting to initialize MSAL...");
      await this.initializeMSAL();
      if (!this.msalInitialized) {
        console.error("MSAL still not initialized after retry");
        return;
      }
    }

    try {
      if (MSALAuth.isLoggedIn()) {
        // Logout
        await MSALAuth.logout();
        this.useRealApi = false;
        this.updateAuthUI(false);
        await this.loadData();
      } else {
        // Login
        await MSALAuth.loginPopup();
        const token = await MSALAuth.getAccessToken();
        if (token) {
          await GraphAPI.init(token);
          this.useRealApi = true;
          this.updateAuthUI(true);
          await this.loadData();
        }
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      if (typeof Toast !== "undefined") {
        Toast.error("Sign-in failed: " + error.message);
      } else {
        alert("Sign-in failed: " + error.message);
      }
    }
  },

  /**
   * Update auth-related UI elements
   */
  updateAuthUI(isAuthenticated) {
    const dataSourceBadge = document.getElementById("dataSourceBadge");

    if (dataSourceBadge) {
      if (isAuthenticated) {
        dataSourceBadge.innerHTML =
          '<span class="badge-icon">✅</span> Live Data';
        dataSourceBadge.className = "data-source-badge live";
      } else {
        dataSourceBadge.innerHTML =
          '<span class="badge-icon">📊</span> Demo Data';
        dataSourceBadge.className = "data-source-badge demo";
      }
    }

    // Update user info in sidebar with role if authenticated
    if (isAuthenticated && typeof RBAC !== "undefined") {
      const userInfo = document.getElementById("userInfo");
      if (userInfo && MSALAuth.account) {
        const roleInfo = RBAC.getRoleInfo();
        userInfo.innerHTML = `
          <div class="user-avatar">${roleInfo.icon}</div>
          <div class="user-details">
            <span class="user-name">${
              MSALAuth.account.name || MSALAuth.account.username
            }</span>
            <span class="user-role">${roleInfo.name}</span>
          </div>
        `;
      }
    }
  },

  /**
   * Update environment badge display
   */
  updateEnvironmentBadge() {
    const badge = document.getElementById("environmentBadge");
    if (!badge) return;

    const envInfo = Config.getEnvironmentInfo();
    badge.className = `environment-badge ${envInfo.class}`;
    badge.querySelector(".env-icon").textContent = envInfo.icon;
    badge.querySelector(".env-text").textContent = envInfo.text;
  },

  /**
   * Setup sidebar navigation
   */
  setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const page = item.dataset.page;
        this.navigateTo(page);
      });
    });
  },

  /**
   * Setup dashboard section click handlers
   * Makes dashboard sections clickable to navigate to their respective pages
   */
  setupDashboardSectionClicks() {
    // Add click handler using event delegation
    document.addEventListener("click", (e) => {
      // Check for clickable card first
      const clickableCard = e.target.closest(".clickable-card");
      if (clickableCard) {
        const targetPage = clickableCard.dataset.navigate;
        const filter = clickableCard.dataset.filter;
        if (targetPage) {
          this.navigateToPageWithFilter(targetPage, filter);
        }
        return;
      }

      // Find the closest clickable section
      const section = e.target.closest(".clickable-section");
      if (section) {
        // Don't navigate if clicking on a chart or interactive element
        if (e.target.closest("canvas") || e.target.closest("button")) {
          return;
        }

        const targetPage = section.dataset.navigate;
        if (targetPage) {
          this.navigateTo(targetPage);
        }
      }
    });

    // Add click handler for section headers specifically
    document
      .querySelectorAll(".clickable-section .section-header")
      .forEach((header) => {
        header.style.cursor = "pointer";
        header.addEventListener("click", (e) => {
          const section = header.closest(".clickable-section");
          if (section) {
            const targetPage = section.dataset.navigate;
            if (targetPage) {
              this.navigateTo(targetPage);
            }
          }
        });
      });

    // Inject clickable section styles
    this.injectClickableSectionStyles();
  },

  /**
   * Navigate to a page with a specific filter applied
   */
  navigateToPageWithFilter(page, filter) {
    // Store the filter to apply after page loads
    this.pendingFilter = { page, filter };
    this.navigateTo(page);
  },

  /**
   * Apply pending filter after page loads
   */
  applyPendingFilter() {
    if (!this.pendingFilter) return;

    const { page, filter } = this.pendingFilter;
    this.pendingFilter = null;

    // Apply filter based on page
    setTimeout(() => {
      switch (page) {
        case "users":
          if (typeof UsersPage !== "undefined" && UsersPage.setFilter) {
            UsersPage.setFilter(filter);
          }
          break;
        case "licenses":
          if (typeof LicensesPage !== "undefined" && LicensesPage.setFilter) {
            LicensesPage.setFilter(filter);
          }
          break;
        case "security":
          if (typeof SecurityPage !== "undefined") {
            if (filter === "noMfa" || filter === "mfaEnabled") {
              SecurityPage.scrollToSection("mfa");
            } else if (filter === "admins" || filter === "privileged") {
              SecurityPage.scrollToSection("admins");
            }
          }
          break;
      }
    }, 100); // Small delay to ensure page is rendered
  },

  /**
   * Inject CSS for clickable sections
   */
  injectClickableSectionStyles() {
    if (document.getElementById("clickable-section-styles")) return;

    const styles = document.createElement("style");
    styles.id = "clickable-section-styles";
    styles.textContent = `
      .clickable-section .section-header {
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .clickable-section .section-header:hover {
        background: var(--bg-secondary, rgba(0,0,0,0.02));
        border-radius: 8px;
        padding-left: 8px;
        margin-left: -8px;
      }

      .clickable-section .section-link {
        opacity: 0;
        transition: opacity 0.2s ease;
        color: var(--primary-color, #0078d4);
        font-size: 14px;
        font-weight: 500;
        margin-left: auto;
      }

      .clickable-section .section-header:hover .section-link {
        opacity: 1;
      }

      .clickable-section .section-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .clickable-section .section-header .section-title {
        margin-right: 12px;
      }

      .clickable-section .section-header .section-description {
        flex: 1;
        min-width: 200px;
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Navigate to a page
   */
  navigateTo(page) {
    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.page === page);
    });

    // Update page title
    const titles = {
      dashboard: "Dashboard",
      users: "Users",
      licenses: "Licenses",
      security: "Security",
      reports: "Reports",
      mitigation: "Mitigation",
      documentation: "Documentation",
      settings: "Settings",
    };

    const subtitles = {
      dashboard: "Microsoft Entra ID Overview",
      users: "User Management & Analysis",
      licenses: "License Cost Optimization",
      security: "Security Posture & Compliance",
      reports: "Detailed Reports & Export",
      mitigation: "Task Planning & Remediation",
      documentation: "Architecture & System Diagrams",
      settings: "Portal Configuration",
    };

    document.querySelector(".page-title").textContent = titles[page] || page;
    document.querySelector(".page-subtitle").textContent =
      subtitles[page] || "";

    this.currentPage = page;

    // Load page content (for SPA behavior)
    this.loadPage(page);
  },

  /**
   * Load a page dynamically
   */
  async loadPage(page) {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;

    switch (page) {
      case "dashboard":
        this.showDashboard();
        break;
      case "users":
        if (typeof UsersPage !== "undefined") {
          contentArea.innerHTML = UsersPage.render();
          await UsersPage.init();
          this.applyPendingFilter();
        } else {
          this.showComingSoon(page);
        }
        break;
      case "licenses":
        if (typeof LicensesPage !== "undefined") {
          contentArea.innerHTML = LicensesPage.render();
          await LicensesPage.init();
          this.applyPendingFilter();
        } else {
          this.showComingSoon(page);
        }
        break;
      case "security":
        if (typeof SecurityPage !== "undefined") {
          contentArea.innerHTML = SecurityPage.render();
          await SecurityPage.init();
          this.applyPendingFilter();
        } else {
          this.showComingSoon(page);
        }
        break;
      case "reports":
        if (typeof ReportsPage !== "undefined") {
          contentArea.innerHTML = ReportsPage.render();
          await ReportsPage.init();
        } else {
          this.showComingSoon(page);
        }
        break;
      case "settings":
        if (typeof SettingsPage !== "undefined") {
          contentArea.innerHTML = SettingsPage.render();
          await SettingsPage.init();
        } else {
          this.showComingSoon(page);
        }
        break;
      case "mitigation":
        if (typeof MitigationPage !== "undefined") {
          contentArea.innerHTML = MitigationPage.render();
          await MitigationPage.init();
        } else {
          this.showComingSoon(page);
        }
        break;
      case "documentation":
        if (typeof DocumentationPage !== "undefined") {
          contentArea.innerHTML = DocumentationPage.render();
          await DocumentationPage.init();
        } else {
          this.showComingSoon(page);
        }
        break;
      default:
        this.showComingSoon(page);
    }
  },

  /**
   * Setup refresh button
   */
  setupRefreshButton() {
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadData());
    }
  },

  /**
   * Load data from API or mock data
   */
  async loadData() {
    if (this.isLoading) return;

    this.isLoading = true;
    console.log("📊 Loading data...");

    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
    }

    try {
      // Require real API - no mock data fallback
      if (this.useRealApi && GraphAPI.accessToken) {
        this.data = await GraphAPI.fetchDashboardData();
      } else {
        // Not authenticated - show login required
        console.log("⚠️ Not authenticated - real API required");
        this.showLoginRequired();
        return;
      }

      // Update last sync time
      const syncTime = document.getElementById("lastSyncTime");
      if (syncTime) {
        syncTime.textContent =
          typeof LocaleUtils !== "undefined"
            ? LocaleUtils.formatTime(new Date())
            : new Date().toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
              });
      }

      // Update dashboard
      console.log(
        "📈 Dashboard data:",
        JSON.stringify(this.data, null, 2).substring(0, 500),
      );
      Dashboard.update(this.data);

      // Update sign-in map
      if (this.data.signIns && Config.isFeatureEnabled("signInMap")) {
        SignInMap.update(this.data.signIns);
      }

      console.log("✅ Data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading data:", error);

      // Show generic error - admin consent is handled via Application permissions on the backend
      this.showError("Failed to load data: " + error.message);
    } finally {
      this.isLoading = false;
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<span class="btn-icon">🔄</span> Refresh';
      }
    }
  },

  /**
   * Show error message
   */
  showError(message) {
    const contentArea = document.getElementById("contentArea");
    if (contentArea) {
      contentArea.innerHTML = `
        <div style="max-width: 600px; margin: 2rem auto; padding: 2rem; background: var(--bg-card); border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <span style="font-size: 3rem;">⚠️</span>
            <h2 style="color: var(--text-primary); margin: 1rem 0;">Error Loading Data</h2>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="color: #991b1b; margin: 0;">${message}</p>
          </div>
          
          <div style="text-align: center;">
            <button onclick="window.location.reload()" 
                    style="display: inline-block; background: #0066b3; color: white; padding: 0.75rem 2rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 500;">
              🔄 Try Again
            </button>
          </div>
        </div>
      `;
    }
  },

  /**
   * Show error message
   */
  showError(message) {
    // Could be enhanced with a toast notification system
    console.error(message);
  },

  /**
   * Show coming soon message for unimplemented pages
   */
  showComingSoon(page) {
    const contentArea = document.getElementById("contentArea");
    if (contentArea) {
      const pageInfo = {
        users: {
          icon: "👥",
          features: [
            "User list with filters",
            "Activity status",
            "Guest management",
            "Bulk operations",
          ],
        },
        licenses: {
          icon: "📜",
          features: [
            "License inventory",
            "Cost analysis",
            "Optimization recommendations",
            "Assignment management",
          ],
        },
        security: {
          icon: "🔒",
          features: [
            "MFA coverage report",
            "Admin role analysis",
            "Risk detections",
            "Conditional access review",
          ],
        },
        reports: {
          icon: "📈",
          features: [
            "Scheduled reports",
            "Export to Excel/PDF",
            "Custom date ranges",
            "Email delivery",
          ],
        },
        settings: {
          icon: "⚙️",
          features: [
            "Environment configuration",
            "API connections",
            "Theme preferences",
            "Data refresh intervals",
          ],
        },
      };

      const info = pageInfo[page] || { icon: "🚧", features: [] };

      contentArea.innerHTML = `
                <div class="coming-soon-container">
                    <div class="coming-soon-card">
                        <div class="coming-soon-icon">${info.icon}</div>
                        <h2 class="coming-soon-title">${
                          page.charAt(0).toUpperCase() + page.slice(1)
                        }</h2>
                        <p class="coming-soon-subtitle">Coming Soon</p>
                        <div class="coming-soon-features">
                            <h4>Planned Features:</h4>
                            <ul>
                                ${info.features
                                  .map((f) => `<li>✓ ${f}</li>`)
                                  .join("")}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
    }
  },

  /**
   * Show dashboard content
   */
  showDashboard() {
    // Reload the page to reset dashboard
    location.reload();
  },
};

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
