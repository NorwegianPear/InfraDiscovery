/**
 * Role-Based Access Control (RBAC) Module
 * Manages user roles, permissions, and access control for the portal
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const RBAC = {
  // Current user's role and permissions
  currentUser: null,
  currentRole: null,

  // Allowed Tenant IDs - dynamically populated from Config
  // If empty, all tenants are allowed (useful for initial setup)
  allowedTenantIds: [],

  // Allowed email domains - dynamically populated from Config
  // If empty, all domains from the same tenant are allowed
  allowedDomains: [],

  // Configuration mode: 'strict' requires authorizedUsers, 'auto' assigns roles automatically
  // 'auto' mode: First user becomes admin, all others become operators
  configMode: "auto",

  /**
   * Role Definitions
   * - Admin: Full access to all features including user management
   * - Operator: Can create/manage mitigation tasks and operational changes
   * - Viewer: Read-only access to dashboards and reports
   */
  roles: {
    admin: {
      name: "Administrator",
      description:
        "Full access to all features including user and role management",
      level: 3,
      icon: "👑",
    },
    operator: {
      name: "Operator",
      description:
        "Can create and manage mitigation tasks, perform operational changes",
      level: 2,
      icon: "🔧",
    },
    viewer: {
      name: "Viewer",
      description: "Read-only access to dashboards, reports, and documentation",
      level: 1,
      icon: "👁️",
    },
  },

  /**
   * Permission Definitions
   * Maps actions to minimum required role level
   */
  permissions: {
    // Dashboard & Reports (all users)
    "view:dashboard": 1,
    "view:users": 1,
    "view:licenses": 1,
    "view:security": 1,
    "view:reports": 1,
    "view:documentation": 1,
    "view:mitigation": 1,

    // Mitigation Tasks (Operators and Admins)
    "create:task": 2,
    "edit:task": 2,
    "delete:task": 2,
    "complete:task": 2,
    "assign:task": 2,
    "schedule:task": 2,

    // Recommendations
    "view:recommendations": 1,
    "accept:recommendation": 2,
    "dismiss:recommendation": 2,

    // Operational Changes (Operators and Admins)
    "execute:action": 2,
    "modify:settings": 2,
    "export:data": 2,

    // Remediation Actions - Azure AD Write Operations (Admins only)
    "user:disable": 3, // Disable user accounts
    "user:enable": 3, // Enable user accounts
    "user:revokeSessions": 3, // Revoke all sign-in sessions
    "license:remove": 3, // Remove licenses from users
    "license:assign": 3, // Assign licenses to users
    "bulk:userDisable": 3, // Bulk disable users
    "bulk:licenseRemove": 3, // Bulk remove licenses

    // Approval Workflow (Admins only - for approving others' actions)
    "action:approve": 3, // Approve pending remediation actions
    "action:reject": 3, // Reject pending remediation actions
    "view:pendingApprovals": 3, // View pending approval queue

    // Administrative (Admins only)
    "manage:roles": 3,
    "manage:users": 3,
    "view:auditlog": 3,
    "configure:portal": 3,
  },

  /**
   * Authorized Users List
   * Maps email addresses to roles
   * Format: email (lowercase) -> role
   *
   * In 'auto' mode (default for new deployments):
   * - First user to access becomes admin
   * - Subsequent users from same tenant become operators
   *
   * In 'strict' mode:
   * - Only listed users have access with specified roles
   * - Others become viewers
   */
  authorizedUsers: {
    // This is populated dynamically or via deployment configuration
    // Example entries (uncomment and customize for strict mode):
    // "admin@yourdomain.com": "admin",
    // "operator@yourdomain.com": "operator",
  },

  /**
   * Initialize RBAC system
   * Called after MSAL authentication
   * All tenant users can read, but write operations require specific roles
   */
  async init(account) {
    if (!account) {
      console.log("🔐 RBAC: No account provided, defaulting to viewer");
      this.currentRole = "viewer";
      return { success: true, role: "viewer" };
    }

    // Always load default authorized users first (hardcoded for security)
    const defaultUsers = this.getDefaultAuthorizedUsers();
    this.authorizedUsers = { ...this.authorizedUsers, ...defaultUsers };

    // Load saved RBAC configuration if available (but defaults take precedence)
    this.loadSavedConfig();

    this.currentUser = account;
    const email = (account.username || account.email || "").toLowerCase();
    const tenantId = account.tenantId || this.extractTenantFromAccount(account);

    console.log("🔐 RBAC: Initializing for user:", email);
    console.log("🔐 RBAC: User tenant:", tenantId);

    // If user is in default authorized list, always allow them
    if (defaultUsers[email]) {
      console.log(
        "✅ RBAC: User is in default authorized list, bypassing tenant validation"
      );
    } else if (!this.validateTenant(tenantId, email)) {
      // Validate tenant only for non-default users
      console.error("🚫 RBAC: Tenant/domain validation failed");
      return { success: false, error: "unauthorized_tenant" };
    }

    // Determine role based on config mode
    if (this.configMode === "auto") {
      this.currentRole = this.determineAutoRole(email, tenantId);
    } else {
      // Strict mode: use authorizedUsers list, default to viewer
      this.currentRole = this.authorizedUsers[email] || "viewer";
    }

    console.log(
      `🔐 RBAC: User role assigned: ${this.currentRole} (${
        this.roles[this.currentRole].name
      })`
    );

    // Store in session
    sessionStorage.setItem("rbac-role", this.currentRole);
    sessionStorage.setItem("rbac-user", email);

    return { success: true, role: this.currentRole };
  },

  /**
   * Load saved RBAC configuration from localStorage
   */
  loadSavedConfig() {
    try {
      const savedRbac = localStorage.getItem("atea-idlm-rbac");
      if (savedRbac) {
        const config = JSON.parse(savedRbac);
        if (config.authorizedUsers) {
          Object.assign(this.authorizedUsers, config.authorizedUsers);
        }
        if (config.allowedTenantIds) {
          this.allowedTenantIds = config.allowedTenantIds;
        }
        if (config.allowedDomains) {
          this.allowedDomains = config.allowedDomains;
        }
        if (config.configMode) {
          this.configMode = config.configMode;
        }
        console.log("🔐 RBAC: Loaded saved configuration");
      }
    } catch (e) {
      console.warn("🔐 RBAC: Could not load saved config:", e);
    }
  },

  /**
   * Save RBAC configuration to localStorage
   */
  saveConfig() {
    const config = {
      authorizedUsers: this.authorizedUsers,
      allowedTenantIds: this.allowedTenantIds,
      allowedDomains: this.allowedDomains,
      configMode: this.configMode,
    };
    localStorage.setItem("atea-idlm-rbac", JSON.stringify(config));
    console.log("🔐 RBAC: Configuration saved");
  },

  /**
   * Determine role automatically (for 'auto' mode)
   * - Users with explicit roles keep their roles
   * - Users from atea.no get viewer role (read-only access)
   * - First user from primary tenant becomes admin
   * - Others from primary tenant become operators
   */
  determineAutoRole(email, tenantId) {
    // Check if user has explicit role
    if (this.authorizedUsers[email]) {
      return this.authorizedUsers[email];
    }

    const emailDomain = email.split("@")[1]?.toLowerCase();

    // Users from atea.no domain get viewer role (read-only access)
    // This allows all Atea employees to view data but not make changes
    if (emailDomain === "atea.no") {
      console.log(
        "🔐 RBAC: atea.no user detected, assigning viewer role (read-only)"
      );
      this.authorizedUsers[email] = "viewer";
      this.saveConfig();
      return "viewer";
    }

    // Check if there's already an admin
    const existingAdmins = Object.entries(this.authorizedUsers).filter(
      ([_, role]) => role === "admin"
    );

    if (existingAdmins.length === 0) {
      // No admins yet - first user becomes admin
      console.log("🔐 RBAC: First user detected, assigning admin role");
      this.authorizedUsers[email] = "admin";

      // Save the tenant for future validation
      if (tenantId && !this.allowedTenantIds.includes(tenantId)) {
        this.allowedTenantIds.push(tenantId);
      }

      // Save domain for validation
      if (emailDomain && !this.allowedDomains.includes(emailDomain)) {
        this.allowedDomains.push(emailDomain);
      }

      this.saveConfig();
      return "admin";
    }

    // Not the first user - default to operator for same tenant users
    this.authorizedUsers[email] = "operator";
    this.saveConfig();
    return "operator";
  },

  /**
   * Extract tenant ID from account object
   */
  extractTenantFromAccount(account) {
    // Try different properties where tenant might be stored
    if (account.tenantId) return account.tenantId;
    if (account.idTokenClaims?.tid) return account.idTokenClaims.tid;
    if (account.homeAccountId) {
      // homeAccountId format: <oid>.<tid>
      const parts = account.homeAccountId.split(".");
      if (parts.length >= 2) return parts[1];
    }
    return null;
  },

  /**
   * Validate that user belongs to allowed tenant or domain
   * Supports multiple tenants and validates by email domain as fallback
   * In 'auto' mode with no configured tenants, allows any tenant (first-time setup)
   */
  // Hardcoded trusted domains and tenants (always allowed)
  trustedDomains: ["ateara.onmicrosoft.com", "atea.no"],
  trustedTenantIds: ["973a580f-021f-4dc0-88de-48b060e43df1"], // ateara tenant

  validateTenant(tenantId, email = null) {
    // Check against hardcoded trusted domains first
    if (email) {
      const emailDomain = email.split("@")[1]?.toLowerCase();
      if (this.trustedDomains.some((d) => d.toLowerCase() === emailDomain)) {
        console.log("✅ RBAC: User validated by trusted domain:", emailDomain);
        return true;
      }
    }

    // Check against hardcoded trusted tenant IDs
    if (
      tenantId &&
      this.trustedTenantIds.some(
        (t) => t.toLowerCase() === tenantId.toLowerCase()
      )
    ) {
      console.log("✅ RBAC: Tenant validated by trusted tenant ID:", tenantId);
      return true;
    }

    // If no tenant restrictions configured (new deployment), allow any
    if (
      this.allowedTenantIds.length === 0 &&
      this.allowedDomains.length === 0
    ) {
      console.log(
        "✅ RBAC: No tenant restrictions configured, allowing access"
      );
      return true;
    }

    // First, check by tenant ID if available
    if (tenantId && this.allowedTenantIds.length > 0) {
      const isValidTenant = this.allowedTenantIds.some(
        (allowed) => allowed.toLowerCase() === tenantId.toLowerCase()
      );
      if (isValidTenant) {
        console.log("✅ RBAC: Tenant validated by ID:", tenantId);
        return true;
      }
    }

    // Fallback: validate by email domain
    if (email && this.allowedDomains.length > 0) {
      const emailDomain = email.split("@")[1]?.toLowerCase();
      const isValidDomain = this.allowedDomains.some(
        (domain) => domain.toLowerCase() === emailDomain
      );
      if (isValidDomain) {
        console.log("✅ RBAC: User validated by email domain:", emailDomain);
        return true;
      }
    }

    // If we have no restrictions but also no match, allow (first-time setup scenario)
    if (
      this.allowedTenantIds.length === 0 &&
      this.allowedDomains.length === 0
    ) {
      return true;
    }

    console.error(
      `🚫 RBAC: Access denied. Tenant ${tenantId} and email domain not authorized.`
    );
    console.log("Allowed tenant IDs:", this.allowedTenantIds);
    console.log("Allowed domains:", this.allowedDomains);
    return false;
  },

  /**
   * Check if current user has a specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  hasPermission(permission) {
    if (!this.currentRole) {
      // Only log once per session to avoid spam
      if (!this._noRoleWarned) {
        console.warn("🔐 RBAC: No role set, denying permissions");
        this._noRoleWarned = true;
      }
      return false;
    }

    const requiredLevel = this.permissions[permission];
    if (requiredLevel === undefined) {
      console.warn(`🔐 RBAC: Unknown permission: ${permission}`);
      return false;
    }

    const userLevel = this.roles[this.currentRole]?.level || 0;
    const hasAccess = userLevel >= requiredLevel;

    // Don't log permission denials - too spammy for UI permission checks
    return hasAccess;
  },

  /**
   * Check if current user has a specific role or higher
   * @param {string} role - Minimum required role
   * @returns {boolean}
   */
  hasRole(role) {
    if (!this.currentRole) return false;

    const requiredLevel = this.roles[role]?.level || 0;
    const userLevel = this.roles[this.currentRole]?.level || 0;

    return userLevel >= requiredLevel;
  },

  /**
   * Check if current user is admin
   */
  isAdmin() {
    return this.currentRole === "admin";
  },

  /**
   * Check if current user is operator or higher
   */
  isOperator() {
    return this.hasRole("operator");
  },

  /**
   * Get current user's role info
   */
  getRoleInfo() {
    if (!this.currentRole) {
      return {
        role: "viewer",
        ...this.roles.viewer,
      };
    }
    return {
      role: this.currentRole,
      ...this.roles[this.currentRole],
    };
  },

  /**
   * Get current user's email
   */
  getCurrentUserEmail() {
    return (
      this.currentUser?.username ||
      this.currentUser?.email ||
      "Unknown"
    ).toLowerCase();
  },

  /**
   * Get all authorized users (admin only)
   */
  getAuthorizedUsers() {
    if (!this.isAdmin()) {
      console.warn("🔐 RBAC: Only admins can view authorized users list");
      return [];
    }

    return Object.entries(this.authorizedUsers).map(([email, role]) => ({
      email,
      role,
      roleInfo: this.roles[role],
    }));
  },

  /**
   * Add authorized user (admin only)
   */
  addAuthorizedUser(email, role) {
    if (!this.isAdmin()) {
      console.error("🔐 RBAC: Only admins can add authorized users");
      return false;
    }

    if (!this.roles[role]) {
      console.error("🔐 RBAC: Invalid role:", role);
      return false;
    }

    this.authorizedUsers[email.toLowerCase()] = role;
    this.saveAuthorizedUsers();
    this.logAudit("add_user", { email, role });
    return true;
  },

  /**
   * Remove authorized user (admin only)
   */
  removeAuthorizedUser(email) {
    if (!this.isAdmin()) {
      console.error("🔐 RBAC: Only admins can remove authorized users");
      return false;
    }

    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail === this.getCurrentUserEmail()) {
      console.error("🔐 RBAC: Cannot remove your own account");
      return false;
    }

    delete this.authorizedUsers[normalizedEmail];
    this.saveAuthorizedUsers();
    this.logAudit("remove_user", { email });
    return true;
  },

  /**
   * Update user role (admin only)
   */
  updateUserRole(email, newRole) {
    if (!this.isAdmin()) {
      console.error("🔐 RBAC: Only admins can update user roles");
      return false;
    }

    if (!this.roles[newRole]) {
      console.error("🔐 RBAC: Invalid role:", newRole);
      return false;
    }

    const normalizedEmail = email.toLowerCase();
    this.authorizedUsers[normalizedEmail] = newRole;
    this.saveAuthorizedUsers();
    this.logAudit("update_role", { email, newRole });
    return true;
  },

  /**
   * Save authorized users to localStorage
   */
  saveAuthorizedUsers() {
    localStorage.setItem(
      "rbac-authorized-users",
      JSON.stringify(this.authorizedUsers)
    );
  },

  /**
   * Load authorized users from localStorage (merges with defaults)
   */
  loadAuthorizedUsers() {
    try {
      const saved = localStorage.getItem("rbac-authorized-users");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults (defaults take precedence for security)
        this.authorizedUsers = {
          ...parsed,
          ...this.getDefaultAuthorizedUsers(),
        };
      }
    } catch (e) {
      console.error("🔐 RBAC: Error loading authorized users:", e);
    }
  },

  /**
   * Get default authorized users (hardcoded for security)
   * Includes both @atea.no and @ateara.onmicrosoft.com domains
   */
  getDefaultAuthorizedUsers() {
    return {
      // Administrators - both domains
      "uylephan@ateara.onmicrosoft.com": "admin",
      "uy.le.phan@atea.no": "admin",
      "anders.dramstad@ateara.onmicrosoft.com": "admin",
      "anders.dramstad@atea.no": "admin",
      "roy-arne.hogestol@ateara.onmicrosoft.com": "admin",
      "roy-arne.hogestol@atea.no": "admin",
      "paul.johnny.klock@ateara.onmicrosoft.com": "admin",
      "paul.johnny.klock@atea.no": "admin",
      // Operators - both domains
      "lene.kadaa@ateara.onmicrosoft.com": "operator",
      "lene.kadaa@atea.no": "operator",
      "veronica@ateara.onmicrosoft.com": "operator",
      "veronica@atea.no": "operator",
    };
  },

  /**
   * Audit logging for RBAC actions
   */
  auditLog: [],

  logAudit(action, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      user: this.getCurrentUserEmail(),
      action,
      details,
    };

    this.auditLog.push(entry);

    // Keep only last 100 entries in memory
    if (this.auditLog.length > 100) {
      this.auditLog.shift();
    }

    // Save to localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("rbac-audit-log") || "[]");
      saved.push(entry);
      // Keep last 500 entries in storage
      if (saved.length > 500) {
        saved.splice(0, saved.length - 500);
      }
      localStorage.setItem("rbac-audit-log", JSON.stringify(saved));
    } catch (e) {
      console.error("🔐 RBAC: Error saving audit log:", e);
    }

    console.log("🔐 RBAC Audit:", action, details);
  },

  /**
   * Get audit log (admin only)
   */
  getAuditLog() {
    if (!this.isAdmin()) {
      console.warn("🔐 RBAC: Only admins can view audit log");
      return [];
    }

    try {
      return JSON.parse(localStorage.getItem("rbac-audit-log") || "[]");
    } catch (e) {
      return [];
    }
  },

  /**
   * Check permission and show error if denied
   * @returns {boolean} Whether permission was granted
   */
  requirePermission(permission, showAlert = true) {
    const hasAccess = this.hasPermission(permission);

    if (!hasAccess && showAlert) {
      const roleInfo = this.getRoleInfo();
      const requiredLevel = this.permissions[permission] || 0;
      const requiredRole =
        Object.entries(this.roles).find(
          ([_, r]) => r.level === requiredLevel
        )?.[0] || "operator";

      alert(
        `⛔ Access Denied\n\nThis action requires ${
          this.roles[requiredRole]?.name || requiredRole
        } privileges.\n\nYour current role: ${
          roleInfo.name
        }\n\nPlease contact an administrator if you need elevated access.`
      );
    }

    return hasAccess;
  },

  /**
   * Get UI elements visibility based on role
   */
  getUIPermissions() {
    return {
      // Task management
      canCreateTask: this.hasPermission("create:task"),
      canEditTask: this.hasPermission("edit:task"),
      canDeleteTask: this.hasPermission("delete:task"),
      canCompleteTask: this.hasPermission("complete:task"),
      canAcceptRecommendation: this.hasPermission("accept:recommendation"),
      canDismissRecommendation: this.hasPermission("dismiss:recommendation"),
      canExportData: this.hasPermission("export:data"),
      canModifySettings: this.hasPermission("modify:settings"),
      canManageUsers: this.hasPermission("manage:users"),
      canViewAuditLog: this.hasPermission("view:auditlog"),
      canConfigurePortal: this.hasPermission("configure:portal"),
      // Remediation actions (Admin only - writes to Azure AD)
      canDisableUser: this.hasPermission("user:disable"),
      canEnableUser: this.hasPermission("user:enable"),
      canRevokeSessions: this.hasPermission("user:revokeSessions"),
      canRemoveLicense: this.hasPermission("license:remove"),
      canAssignLicense: this.hasPermission("license:assign"),
      canBulkDisableUsers: this.hasPermission("bulk:userDisable"),
      canBulkRemoveLicenses: this.hasPermission("bulk:licenseRemove"),
      // Approval workflow (Admin only)
      canApproveActions: this.hasPermission("action:approve"),
      canRejectActions: this.hasPermission("action:reject"),
      canViewPendingApprovals: this.hasPermission("view:pendingApprovals"),
    };
  },

  /**
   * Render role badge HTML
   */
  renderRoleBadge() {
    const roleInfo = this.getRoleInfo();
    return `
      <div class="role-badge role-${this.currentRole || "viewer"}">
        <span class="role-icon">${roleInfo.icon}</span>
        <span class="role-name">${roleInfo.name}</span>
      </div>
    `;
  },

  /**
   * Show unauthorized tenant error page
   */
  showUnauthorizedTenantError() {
    const contentArea = document.getElementById("contentArea");
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="error-page">
          <div class="error-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>Your organization is not authorized to access this portal.</p>
          <p class="error-detail">This portal is restricted to authorized Atea tenants only.</p>
          <p>If you believe this is an error, please contact your administrator.</p>
          <button class="btn btn-primary" onclick="MSALAuth.signOut()">Sign Out</button>
        </div>
        <style>
          .error-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            text-align: center;
            padding: 40px;
          }
          .error-icon {
            font-size: 80px;
            margin-bottom: 20px;
          }
          .error-page h1 {
            color: var(--danger-color, #d13438);
            margin-bottom: 16px;
          }
          .error-page p {
            color: var(--text-secondary);
            margin-bottom: 12px;
            max-width: 400px;
          }
          .error-detail {
            background: var(--bg-secondary);
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
          }
          .error-page .btn {
            margin-top: 20px;
          }
        </style>
      `;
    }
  },
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  RBAC.loadAuthorizedUsers();
});
