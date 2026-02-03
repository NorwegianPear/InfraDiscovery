/**
 * Remediation Module
 * Handles Azure AD write operations with RBAC protection and confirmation dialogs
 * All operations require Admin role and are logged for audit
 *
 * APPROVAL WORKFLOW:
 * - High-risk actions require approval from a second Admin
 * - Actions go to "pending" state until approved
 * - Pending actions are stored and shown in approval queue
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const Remediation = {
  // Track pending operations awaiting approval
  pendingApprovals: [],

  // Operation history for undo (limited)
  history: [],

  // Actions that require 2nd admin approval
  actionsRequiringApproval: [
    "user:disable",
    "user:enable",
    "license:remove",
    "license:assign",
    "user:revokeSessions",
    "bulk:userDisable",
    "bulk:licenseRemove",
  ],

  // Approval settings
  approvalSettings: {
    enabled: true, // Toggle approval workflow
    selfApprovalAllowed: false, // Can requestor approve their own actions?
    notifyAdmins: true, // Send notifications to other admins
  },

  // Admin notifications queue
  adminNotifications: [],

  /**
   * Initialize remediation module
   */
  init() {
    console.log("🔧 Remediation module initialized");
    this.loadHistory();
    this.loadPendingApprovals();
    this.loadAdminNotifications();
    this.updatePendingBadge();
    this.checkForNewApprovals();
  },

  /**
   * Load admin notifications from localStorage
   */
  loadAdminNotifications() {
    try {
      this.adminNotifications = JSON.parse(
        localStorage.getItem("remediation-admin-notifications") || "[]"
      );
    } catch (e) {
      this.adminNotifications = [];
    }
  },

  /**
   * Save admin notifications
   */
  saveAdminNotifications() {
    try {
      localStorage.setItem(
        "remediation-admin-notifications",
        JSON.stringify(this.adminNotifications)
      );
    } catch (e) {
      console.error("Failed to save admin notifications:", e);
    }
  },

  /**
   * Check for new pending approvals and show notification to admins
   */
  checkForNewApprovals() {
    const currentUser =
      typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown";
    const canApprove =
      typeof RBAC !== "undefined" && RBAC.hasPermission("action:approve");

    if (!canApprove) return;

    // Check for pending approvals not created by current user
    const pendingForMe = this.pendingApprovals.filter(
      (p) => p.requestedBy !== currentUser && p.status === "pending"
    );

    if (pendingForMe.length > 0) {
      // Check if we've already shown this notification
      const lastShownKey = `approval-notification-shown-${currentUser}`;
      const lastShown = localStorage.getItem(lastShownKey);
      const latestPending = pendingForMe[pendingForMe.length - 1];

      if (lastShown !== latestPending.id) {
        // Show notification
        this.showApprovalNotificationBanner(pendingForMe.length);
        localStorage.setItem(lastShownKey, latestPending.id);
      }
    }
  },

  /**
   * Show a banner notification for pending approvals
   */
  showApprovalNotificationBanner(count) {
    // Remove any existing banner
    const existing = document.getElementById("approval-notification-banner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "approval-notification-banner";
    banner.className = "approval-notification-banner";
    banner.innerHTML = `
      <div class="banner-content">
        <span class="banner-icon">⚠️</span>
        <span class="banner-text">
          <strong>${count} pending approval${
      count > 1 ? "s" : ""
    }</strong> require your review
        </span>
        <button class="banner-btn" onclick="App.navigateTo('mitigation'); Remediation.closeBanner();">
          Review Now
        </button>
        <button class="banner-close" onclick="Remediation.closeBanner()">✕</button>
      </div>
    `;

    document.body.appendChild(banner);
    this.injectBannerStyles();

    // Auto-hide after 10 seconds
    setTimeout(() => {
      banner.classList.add("fade-out");
      setTimeout(() => banner.remove(), 300);
    }, 10000);
  },

  /**
   * Close the notification banner
   */
  closeBanner() {
    const banner = document.getElementById("approval-notification-banner");
    if (banner) {
      banner.classList.add("fade-out");
      setTimeout(() => banner.remove(), 300);
    }
  },

  /**
   * Inject banner styles
   */
  injectBannerStyles() {
    if (document.getElementById("approval-banner-styles")) return;

    const styles = document.createElement("style");
    styles.id = "approval-banner-styles";
    styles.textContent = `
      .approval-notification-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #ff9800, #f57c00);
        color: white;
        padding: 12px 20px;
        z-index: 9999;
        animation: slideDown 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }

      .approval-notification-banner.fade-out {
        animation: slideUp 0.3s ease;
      }

      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }

      @keyframes slideUp {
        from { transform: translateY(0); }
        to { transform: translateY(-100%); }
      }

      .banner-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .banner-icon {
        font-size: 20px;
      }

      .banner-text {
        font-size: 14px;
      }

      .banner-btn {
        background: white;
        color: #f57c00;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        font-size: 13px;
      }

      .banner-btn:hover {
        background: #fff9e6;
      }

      .banner-close {
        background: transparent;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        opacity: 0.8;
      }

      .banner-close:hover {
        opacity: 1;
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Notify other admins about a new pending approval
   */
  notifyAdminsOfPendingApproval(pendingItem) {
    if (!this.approvalSettings.notifyAdmins) return;

    // Store notification for other admins to see
    const notification = {
      id: `notif-${Date.now()}`,
      type: "pending_approval",
      pendingId: pendingItem.id,
      message: `${pendingItem.requestedBy} requested: ${pendingItem.description}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    this.adminNotifications.push(notification);
    this.saveAdminNotifications();

    // Also try to send browser notification if permitted
    this.sendBrowserNotification(
      "Approval Required",
      `${pendingItem.requestedBy} requested: ${pendingItem.description}`
    );
  },

  /**
   * Send browser notification (if permitted)
   */
  async sendBrowserNotification(title, body) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/assets/img/logo.png",
        tag: "approval-request",
      });
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification(title, {
          body,
          icon: "/assets/img/logo.png",
          tag: "approval-request",
        });
      }
    }
  },

  /**
   * Load pending approvals from localStorage
   */
  loadPendingApprovals() {
    try {
      this.pendingApprovals = JSON.parse(
        localStorage.getItem("remediation-pending-approvals") || "[]"
      );
      console.log(
        `📋 Loaded ${this.pendingApprovals.length} pending approvals`
      );
    } catch (e) {
      this.pendingApprovals = [];
    }
  },

  /**
   * Save pending approvals to localStorage
   */
  savePendingApprovals() {
    try {
      localStorage.setItem(
        "remediation-pending-approvals",
        JSON.stringify(this.pendingApprovals)
      );
      this.updatePendingBadge();
    } catch (e) {
      console.error("Failed to save pending approvals:", e);
    }
  },

  /**
   * Update the pending approvals badge count in UI
   */
  updatePendingBadge() {
    const badge = document.getElementById("pendingApprovalsBadge");
    if (badge) {
      badge.textContent = this.pendingApprovals.length;
      badge.style.display =
        this.pendingApprovals.length > 0 ? "inline-block" : "none";
    }
  },

  /**
   * Check if an action requires approval
   */
  requiresApproval(action) {
    return (
      this.approvalSettings.enabled &&
      this.actionsRequiringApproval.includes(action)
    );
  },

  /**
   * Submit an action for approval instead of executing immediately
   */
  async submitForApproval(action, data, description) {
    const currentUser =
      typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown";

    const pendingItem = {
      id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      description,
      requestedBy: currentUser,
      requestedAt: new Date().toISOString(),
      status: "pending",
    };

    this.pendingApprovals.push(pendingItem);
    this.savePendingApprovals();

    // Notify other admins
    this.notifyAdminsOfPendingApproval(pendingItem);

    // Log the submission
    this.logAction("approval:submitted", {
      pendingId: pendingItem.id,
      action,
      description,
    });

    this.showNotification(
      `Action submitted for approval: ${description}`,
      "info"
    );

    return pendingItem;
  },

  /**
   * Approve a pending action (must be different admin)
   */
  async approveAction(pendingId) {
    if (!this.checkPermission("action:approve")) {
      this.showNotification(
        "You don't have permission to approve actions",
        "error"
      );
      return false;
    }

    const pending = this.pendingApprovals.find((p) => p.id === pendingId);
    if (!pending) {
      this.showNotification("Pending action not found", "error");
      return false;
    }

    const currentUser =
      typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown";

    // Check self-approval
    if (
      !this.approvalSettings.selfApprovalAllowed &&
      pending.requestedBy === currentUser
    ) {
      this.showNotification(
        "You cannot approve your own action. Another admin must approve.",
        "error"
      );
      return false;
    }

    // Show confirmation
    const confirmed = await this.showConfirmDialog({
      title: "Approve Action",
      message: `Are you sure you want to approve this action?`,
      details: `
        <strong>Action:</strong> ${pending.description}<br>
        <strong>Requested by:</strong> ${pending.requestedBy}<br>
        <strong>Requested at:</strong> ${new Date(
          pending.requestedAt
        ).toLocaleString()}
      `,
      type: "warning",
      confirmText: "Approve & Execute",
    });

    if (!confirmed) return false;

    try {
      // Execute the approved action
      const success = await this.executeApprovedAction(pending);

      if (success) {
        // Remove from pending
        this.pendingApprovals = this.pendingApprovals.filter(
          (p) => p.id !== pendingId
        );
        this.savePendingApprovals();

        // Log approval
        this.logAction("approval:approved", {
          pendingId,
          action: pending.action,
          approvedBy: currentUser,
          requestedBy: pending.requestedBy,
        });

        this.showNotification(
          `Action approved and executed: ${pending.description}`,
          "success"
        );
        return true;
      }
    } catch (error) {
      console.error("Failed to execute approved action:", error);
      this.showNotification(
        `Failed to execute action: ${error.message}`,
        "error"
      );
    }

    return false;
  },

  /**
   * Reject a pending action
   */
  async rejectAction(pendingId, reason = "") {
    if (!this.checkPermission("action:reject")) {
      this.showNotification(
        "You don't have permission to reject actions",
        "error"
      );
      return false;
    }

    const pending = this.pendingApprovals.find((p) => p.id === pendingId);
    if (!pending) {
      this.showNotification("Pending action not found", "error");
      return false;
    }

    const currentUser =
      typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown";

    // Show rejection dialog with optional reason
    const confirmed = await this.showConfirmDialog({
      title: "Reject Action",
      message: `Are you sure you want to reject this action?`,
      details: `
        <strong>Action:</strong> ${pending.description}<br>
        <strong>Requested by:</strong> ${pending.requestedBy}<br><br>
        <em>This action will be cancelled and the requestor will be notified.</em>
      `,
      type: "danger",
      confirmText: "Reject Action",
    });

    if (!confirmed) return false;

    // Remove from pending
    this.pendingApprovals = this.pendingApprovals.filter(
      (p) => p.id !== pendingId
    );
    this.savePendingApprovals();

    // Log rejection
    this.logAction("approval:rejected", {
      pendingId,
      action: pending.action,
      rejectedBy: currentUser,
      requestedBy: pending.requestedBy,
      reason,
    });

    this.showNotification(`Action rejected: ${pending.description}`, "warning");
    return true;
  },

  /**
   * Execute an approved action
   */
  async executeApprovedAction(pending) {
    const { action, data } = pending;

    switch (action) {
      case "user:disable":
        return await GraphAPI.disableUser(data.userId);
      case "user:enable":
        return await GraphAPI.enableUser(data.userId);
      case "user:revokeSessions":
        return await GraphAPI.revokeUserSessions(data.userId);
      case "license:remove":
        return await GraphAPI.removeLicense(data.userId, data.skuId);
      case "license:assign":
        return await GraphAPI.assignLicense(data.userId, data.skuId);
      case "bulk:userDisable":
        return await GraphAPI.bulkDisableUsers(data.userIds);
      case "bulk:licenseRemove":
        return await GraphAPI.bulkRemoveLicenses(data.assignments);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  },

  /**
   * Get pending approvals list
   */
  getPendingApprovals() {
    return this.pendingApprovals;
  },

  /**
   * Render pending approvals UI
   */
  renderPendingApprovalsUI() {
    const pending = this.getPendingApprovals();
    const currentUser =
      typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown";
    const canApprove = this.checkPermission("action:approve");

    if (pending.length === 0) {
      return `
        <div class="empty-state">
          <span class="empty-icon">✅</span>
          <p>No pending approvals</p>
        </div>
      `;
    }

    return `
      <div class="pending-approvals-list">
        ${pending
          .map(
            (item) => `
          <div class="pending-approval-item" data-id="${item.id}">
            <div class="pending-info">
              <div class="pending-action">${this.getActionLabel(
                item.action
              )}</div>
              <div class="pending-description">${item.description}</div>
              <div class="pending-meta">
                <span>Requested by: ${item.requestedBy}</span>
                <span>•</span>
                <span>${
                  typeof LocaleUtils !== "undefined"
                    ? LocaleUtils.formatDateTime(item.requestedAt)
                    : new Date(item.requestedAt).toLocaleString("nb-NO")
                }</span>
              </div>
            </div>
            <div class="pending-actions">
              ${
                canApprove &&
                (this.approvalSettings.selfApprovalAllowed ||
                  item.requestedBy !== currentUser)
                  ? `
                <button class="btn btn-success btn-sm" onclick="Remediation.approveAction('${item.id}')">
                  ✅ Approve
                </button>
              `
                  : ""
              }
              ${
                canApprove
                  ? `
                <button class="btn btn-danger btn-sm" onclick="Remediation.rejectAction('${item.id}')">
                  ❌ Reject
                </button>
              `
                  : ""
              }
              ${
                !canApprove
                  ? '<span class="pending-status">Awaiting Admin Approval</span>'
                  : ""
              }
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  },

  /**
   * Get human-readable action label
   */
  getActionLabel(action) {
    const labels = {
      "user:disable": "🔒 Disable User",
      "user:enable": "🔓 Enable User",
      "user:revokeSessions": "🚫 Revoke Sessions",
      "license:remove": "❌ Remove License",
      "license:assign": "📜 Assign License",
      "bulk:userDisable": "🔒 Bulk Disable Users",
      "bulk:licenseRemove": "❌ Bulk Remove Licenses",
    };
    return labels[action] || action;
  },

  /**
   * Check if user has permission for remediation action
   * @param {string} permission - Permission to check
   * @returns {boolean}
   */
  checkPermission(permission) {
    if (typeof RBAC === "undefined") {
      console.warn("🔐 RBAC not available, denying remediation action");
      return false;
    }
    return RBAC.hasPermission(permission);
  },

  /**
   * Show confirmation dialog before executing action
   * @param {Object} options - Dialog options
   * @returns {Promise<boolean>} User confirmed
   */
  async showConfirmDialog(options) {
    const {
      title,
      message,
      details,
      type = "warning", // warning, danger, info
      confirmText = "Confirm",
      cancelText = "Cancel",
    } = options;

    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement("div");
      overlay.className = "remediation-modal-overlay";
      overlay.innerHTML = `
        <div class="remediation-modal ${type}">
          <div class="modal-header">
            <span class="modal-icon">${this.getTypeIcon(type)}</span>
            <h3>${title}</h3>
          </div>
          <div class="modal-body">
            <p class="modal-message">${message}</p>
            ${details ? `<div class="modal-details">${details}</div>` : ""}
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary cancel-btn">${cancelText}</button>
            <button class="btn btn-${
              type === "danger" ? "danger" : "primary"
            } confirm-btn">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Add styles if not already present
      this.injectStyles();

      // Handle button clicks
      overlay.querySelector(".cancel-btn").onclick = () => {
        overlay.remove();
        resolve(false);
      };

      overlay.querySelector(".confirm-btn").onclick = () => {
        overlay.remove();
        resolve(true);
      };

      // Close on overlay click
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      };
    });
  },

  /**
   * Get icon for dialog type
   */
  getTypeIcon(type) {
    const icons = {
      warning: "⚠️",
      danger: "🚨",
      info: "ℹ️",
      success: "✅",
    };
    return icons[type] || "❓";
  },

  /**
   * Show result notification
   * @param {string} message - Notification message
   * @param {string} type - success, error, warning
   */
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `remediation-notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${this.getTypeIcon(
        type === "error" ? "danger" : type
      )}</span>
      <span class="notification-message">${message}</span>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  },

  // ============================================================================
  // User Remediation Actions
  // ============================================================================

  /**
   * Disable a user account
   * @param {Object} user - User object with id and displayName
   * @returns {Promise<boolean>} Success
   */
  async disableUser(user) {
    // Check permission
    if (!this.checkPermission("user:disable")) {
      this.showNotification(
        "You don't have permission to disable users",
        "error"
      );
      return false;
    }

    // Show confirmation
    const confirmed = await this.showConfirmDialog({
      title: "Disable User Account",
      message: `Are you sure you want to disable the user account?`,
      details: `
        <strong>User:</strong> ${user.displayName}<br>
        <strong>Email:</strong> ${user.userPrincipalName || user.mail}<br><br>
        <em>This will prevent the user from signing in to any Microsoft services.</em>
        ${
          this.requiresApproval("user:disable")
            ? "<br><strong>⚠️ This action requires approval from another admin.</strong>"
            : ""
        }
      `,
      type: "warning",
      confirmText: this.requiresApproval("user:disable")
        ? "Submit for Approval"
        : "Disable User",
    });

    if (!confirmed) return false;

    // Check if approval is required
    if (this.requiresApproval("user:disable")) {
      await this.submitForApproval(
        "user:disable",
        {
          userId: user.id,
          userDisplayName: user.displayName,
          userEmail: user.userPrincipalName,
        },
        `Disable user: ${user.displayName} (${
          user.userPrincipalName || user.mail
        })`
      );
      return true;
    }

    try {
      await GraphAPI.disableUser(user.id);

      // Log action
      this.logAction("user:disable", {
        userId: user.id,
        userDisplayName: user.displayName,
        userEmail: user.userPrincipalName,
      });

      // Add to history for potential undo
      this.addToHistory({
        action: "user:disable",
        user,
        undoAction: "user:enable",
      });

      this.showNotification(
        `User "${user.displayName}" has been disabled`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Failed to disable user:", error);
      this.showNotification(
        `Failed to disable user: ${error.message}`,
        "error"
      );
      return false;
    }
  },

  /**
   * Enable a user account
   * @param {Object} user - User object with id and displayName
   * @returns {Promise<boolean>} Success
   */
  async enableUser(user) {
    if (!this.checkPermission("user:enable")) {
      this.showNotification(
        "You don't have permission to enable users",
        "error"
      );
      return false;
    }

    const confirmed = await this.showConfirmDialog({
      title: "Enable User Account",
      message: `Are you sure you want to enable the user account?`,
      details: `
        <strong>User:</strong> ${user.displayName}<br>
        <strong>Email:</strong> ${user.userPrincipalName || user.mail}
        ${
          this.requiresApproval("user:enable")
            ? "<br><br><strong>⚠️ This action requires approval from another admin.</strong>"
            : ""
        }
      `,
      type: "info",
      confirmText: this.requiresApproval("user:enable")
        ? "Submit for Approval"
        : "Enable User",
    });

    if (!confirmed) return false;

    // Check if approval is required
    if (this.requiresApproval("user:enable")) {
      await this.submitForApproval(
        "user:enable",
        {
          userId: user.id,
          userDisplayName: user.displayName,
          userEmail: user.userPrincipalName,
        },
        `Enable user: ${user.displayName} (${
          user.userPrincipalName || user.mail
        })`
      );
      return true;
    }

    try {
      await GraphAPI.enableUser(user.id);

      this.logAction("user:enable", {
        userId: user.id,
        userDisplayName: user.displayName,
        userEmail: user.userPrincipalName,
      });

      this.showNotification(
        `User "${user.displayName}" has been enabled`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Failed to enable user:", error);
      this.showNotification(`Failed to enable user: ${error.message}`, "error");
      return false;
    }
  },

  /**
   * Revoke all sign-in sessions for a user
   * @param {Object} user - User object with id and displayName
   * @returns {Promise<boolean>} Success
   */
  async revokeUserSessions(user) {
    if (!this.checkPermission("user:revokeSessions")) {
      this.showNotification(
        "You don't have permission to revoke sessions",
        "error"
      );
      return false;
    }

    const confirmed = await this.showConfirmDialog({
      title: "Revoke Sign-in Sessions",
      message: `Are you sure you want to revoke all sign-in sessions?`,
      details: `
        <strong>User:</strong> ${user.displayName}<br>
        <strong>Email:</strong> ${user.userPrincipalName || user.mail}<br><br>
        <em>This will sign the user out of all devices and applications immediately.</em>
        ${
          this.requiresApproval("user:revokeSessions")
            ? "<br><strong>⚠️ This action requires approval from another admin.</strong>"
            : ""
        }
      `,
      type: "danger",
      confirmText: this.requiresApproval("user:revokeSessions")
        ? "Submit for Approval"
        : "Revoke All Sessions",
    });

    if (!confirmed) return false;

    // Check if approval is required
    if (this.requiresApproval("user:revokeSessions")) {
      await this.submitForApproval(
        "user:revokeSessions",
        {
          userId: user.id,
          userDisplayName: user.displayName,
          userEmail: user.userPrincipalName,
        },
        `Revoke sessions for: ${user.displayName} (${
          user.userPrincipalName || user.mail
        })`
      );
      return true;
    }

    try {
      await GraphAPI.revokeUserSessions(user.id);

      this.logAction("user:revokeSessions", {
        userId: user.id,
        userDisplayName: user.displayName,
        userEmail: user.userPrincipalName,
      });

      this.showNotification(
        `All sessions revoked for "${user.displayName}"`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
      this.showNotification(
        `Failed to revoke sessions: ${error.message}`,
        "error"
      );
      return false;
    }
  },

  // ============================================================================
  // License Remediation Actions
  // ============================================================================

  /**
   * Remove a license from a user
   * @param {Object} user - User object
   * @param {Object} license - License object with skuId and skuPartNumber
   * @returns {Promise<boolean>} Success
   */
  async removeLicense(user, license) {
    if (!this.checkPermission("license:remove")) {
      this.showNotification(
        "You don't have permission to remove licenses",
        "error"
      );
      return false;
    }

    const confirmed = await this.showConfirmDialog({
      title: "Remove License",
      message: `Are you sure you want to remove this license?`,
      details: `
        <strong>User:</strong> ${user.displayName}<br>
        <strong>License:</strong> ${
          license.skuPartNumber || license.name
        }<br><br>
        <em>The user will lose access to services included in this license.</em>
        ${
          this.requiresApproval("license:remove")
            ? "<br><strong>⚠️ This action requires approval from another admin.</strong>"
            : ""
        }
      `,
      type: "warning",
      confirmText: this.requiresApproval("license:remove")
        ? "Submit for Approval"
        : "Remove License",
    });

    if (!confirmed) return false;

    // Check if approval is required
    if (this.requiresApproval("license:remove")) {
      await this.submitForApproval(
        "license:remove",
        {
          userId: user.id,
          userDisplayName: user.displayName,
          skuId: license.skuId,
          licenseName: license.skuPartNumber || license.name,
        },
        `Remove license "${license.skuPartNumber || license.name}" from ${
          user.displayName
        }`
      );
      return true;
    }

    try {
      await GraphAPI.removeLicense(user.id, license.skuId);

      this.logAction("license:remove", {
        userId: user.id,
        userDisplayName: user.displayName,
        skuId: license.skuId,
        licenseName: license.skuPartNumber,
      });

      // Add to history for potential undo
      this.addToHistory({
        action: "license:remove",
        user,
        license,
        undoAction: "license:assign",
      });

      this.showNotification(
        `License "${license.skuPartNumber}" removed from "${user.displayName}"`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Failed to remove license:", error);
      this.showNotification(
        `Failed to remove license: ${error.message}`,
        "error"
      );
      return false;
    }
  },

  /**
   * Assign a license to a user
   * @param {Object} user - User object
   * @param {Object} license - License object with skuId
   * @returns {Promise<boolean>} Success
   */
  async assignLicense(user, license) {
    if (!this.checkPermission("license:assign")) {
      this.showNotification(
        "You don't have permission to assign licenses",
        "error"
      );
      return false;
    }

    const confirmed = await this.showConfirmDialog({
      title: "Assign License",
      message: `Are you sure you want to assign this license?`,
      details: `
        <strong>User:</strong> ${user.displayName}<br>
        <strong>License:</strong> ${license.skuPartNumber || license.name}
        ${
          this.requiresApproval("license:assign")
            ? "<br><br><strong>⚠️ This action requires approval from another admin.</strong>"
            : ""
        }
      `,
      type: "info",
      confirmText: this.requiresApproval("license:assign")
        ? "Submit for Approval"
        : "Assign License",
    });

    if (!confirmed) return false;

    // Check if approval is required
    if (this.requiresApproval("license:assign")) {
      await this.submitForApproval(
        "license:assign",
        {
          userId: user.id,
          userDisplayName: user.displayName,
          skuId: license.skuId,
          licenseName: license.skuPartNumber || license.name,
        },
        `Assign license "${license.skuPartNumber || license.name}" to ${
          user.displayName
        }`
      );
      return true;
    }

    try {
      await GraphAPI.assignLicense(user.id, license.skuId);

      this.logAction("license:assign", {
        userId: user.id,
        userDisplayName: user.displayName,
        skuId: license.skuId,
        licenseName: license.skuPartNumber,
      });

      this.showNotification(
        `License "${license.skuPartNumber}" assigned to "${user.displayName}"`,
        "success"
      );
      return true;
    } catch (error) {
      console.error("Failed to assign license:", error);
      this.showNotification(
        `Failed to assign license: ${error.message}`,
        "error"
      );
      return false;
    }
  },

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Bulk disable multiple users
   * @param {Array<Object>} users - Array of user objects
   * @returns {Promise<Object>} Results with success/failed counts
   */
  async bulkDisableUsers(users) {
    if (!this.checkPermission("bulk:userDisable")) {
      this.showNotification(
        "You don't have permission for bulk user operations",
        "error"
      );
      return { success: [], failed: users };
    }

    const confirmed = await this.showConfirmDialog({
      title: "Bulk Disable Users",
      message: `Are you sure you want to disable ${users.length} user accounts?`,
      details: `
        <strong>Users to disable:</strong><br>
        <ul style="max-height: 150px; overflow-y: auto;">
          ${users
            .slice(0, 10)
            .map((u) => `<li>${u.displayName}</li>`)
            .join("")}
          ${
            users.length > 10
              ? `<li><em>...and ${users.length - 10} more</em></li>`
              : ""
          }
        </ul>
        <br><em>This action cannot be easily undone for all users at once.</em>
      `,
      type: "danger",
      confirmText: `Disable ${users.length} Users`,
    });

    if (!confirmed) return { success: [], failed: [] };

    try {
      const userIds = users.map((u) => u.id);
      const results = await GraphAPI.bulkDisableUsers(userIds);

      this.logAction("bulk:userDisable", {
        totalUsers: users.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
      });

      if (results.success.length > 0) {
        this.showNotification(
          `Successfully disabled ${results.success.length} users`,
          "success"
        );
      }
      if (results.failed.length > 0) {
        this.showNotification(
          `Failed to disable ${results.failed.length} users`,
          "error"
        );
      }

      return results;
    } catch (error) {
      console.error("Bulk disable failed:", error);
      this.showNotification(`Bulk operation failed: ${error.message}`, "error");
      return { success: [], failed: users };
    }
  },

  /**
   * Bulk remove licenses from multiple users
   * @param {Array<{user: Object, license: Object}>} assignments - Array of user/license pairs
   * @returns {Promise<Object>} Results
   */
  async bulkRemoveLicenses(assignments) {
    if (!this.checkPermission("bulk:licenseRemove")) {
      this.showNotification(
        "You don't have permission for bulk license operations",
        "error"
      );
      return { success: [], failed: assignments };
    }

    const confirmed = await this.showConfirmDialog({
      title: "Bulk Remove Licenses",
      message: `Are you sure you want to remove licenses from ${assignments.length} users?`,
      details: `
        <strong>License removals:</strong><br>
        <ul style="max-height: 150px; overflow-y: auto;">
          ${assignments
            .slice(0, 10)
            .map(
              (a) =>
                `<li>${a.user.displayName} - ${a.license.skuPartNumber}</li>`
            )
            .join("")}
          ${
            assignments.length > 10
              ? `<li><em>...and ${assignments.length - 10} more</em></li>`
              : ""
          }
        </ul>
      `,
      type: "danger",
      confirmText: `Remove ${assignments.length} Licenses`,
    });

    if (!confirmed) return { success: [], failed: [] };

    try {
      const data = assignments.map((a) => ({
        userId: a.user.id,
        skuId: a.license.skuId,
      }));
      const results = await GraphAPI.bulkRemoveLicenses(data);

      this.logAction("bulk:licenseRemove", {
        totalAssignments: assignments.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
      });

      if (results.success.length > 0) {
        this.showNotification(
          `Successfully removed ${results.success.length} licenses`,
          "success"
        );
      }
      if (results.failed.length > 0) {
        this.showNotification(
          `Failed to remove ${results.failed.length} licenses`,
          "error"
        );
      }

      return results;
    } catch (error) {
      console.error("Bulk license removal failed:", error);
      this.showNotification(`Bulk operation failed: ${error.message}`, "error");
      return { success: [], failed: assignments };
    }
  },

  // ============================================================================
  // Audit & History
  // ============================================================================

  /**
   * Log remediation action
   */
  logAction(action, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      user:
        typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown",
    };

    console.log("🔧 Remediation Action:", entry);

    // Also log to RBAC audit if available
    if (typeof RBAC !== "undefined" && RBAC.logAudit) {
      RBAC.logAudit(`remediation:${action}`, details);
    }

    // Save to localStorage
    try {
      const log = JSON.parse(localStorage.getItem("remediation-log") || "[]");
      log.push(entry);
      // Keep last 1000 entries
      if (log.length > 1000) {
        log.splice(0, log.length - 1000);
      }
      localStorage.setItem("remediation-log", JSON.stringify(log));
    } catch (e) {
      console.error("Failed to save remediation log:", e);
    }
  },

  /**
   * Get remediation action log
   */
  getActionLog() {
    try {
      return JSON.parse(localStorage.getItem("remediation-log") || "[]");
    } catch (e) {
      return [];
    }
  },

  /**
   * Add action to undo history
   */
  addToHistory(entry) {
    this.history.unshift({
      ...entry,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 actions
    if (this.history.length > 50) {
      this.history.pop();
    }

    this.saveHistory();
  },

  /**
   * Load history from localStorage
   */
  loadHistory() {
    try {
      this.history = JSON.parse(
        localStorage.getItem("remediation-history") || "[]"
      );
    } catch (e) {
      this.history = [];
    }
  },

  /**
   * Save history to localStorage
   */
  saveHistory() {
    try {
      localStorage.setItem("remediation-history", JSON.stringify(this.history));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  },

  // ============================================================================
  // UI Action Buttons
  // ============================================================================

  /**
   * Render action buttons for a user row
   * @param {Object} user - User object
   * @param {Object} options - Options for which buttons to show
   * @returns {string} HTML string
   */
  renderUserActions(user, options = {}) {
    const perms = typeof RBAC !== "undefined" ? RBAC.getUIPermissions() : {};

    const buttons = [];

    if (perms.canDisableUser && user.accountEnabled !== false) {
      buttons.push(`
        <button class="action-btn action-disable" 
                onclick="Remediation.disableUser(${JSON.stringify(user).replace(
                  /"/g,
                  "&quot;"
                )})"
                title="Disable User">
          🔒
        </button>
      `);
    }

    if (perms.canEnableUser && user.accountEnabled === false) {
      buttons.push(`
        <button class="action-btn action-enable" 
                onclick="Remediation.enableUser(${JSON.stringify(user).replace(
                  /"/g,
                  "&quot;"
                )})"
                title="Enable User">
          🔓
        </button>
      `);
    }

    if (perms.canRevokeSessions) {
      buttons.push(`
        <button class="action-btn action-revoke" 
                onclick="Remediation.revokeUserSessions(${JSON.stringify(
                  user
                ).replace(/"/g, "&quot;")})"
                title="Revoke Sessions">
          🚫
        </button>
      `);
    }

    return buttons.length > 0
      ? `<div class="user-actions">${buttons.join("")}</div>`
      : "";
  },

  /**
   * Render action buttons for a license row
   * @param {Object} user - User object
   * @param {Object} license - License object
   * @returns {string} HTML string
   */
  renderLicenseActions(user, license) {
    const perms = typeof RBAC !== "undefined" ? RBAC.getUIPermissions() : {};

    if (!perms.canRemoveLicense) return "";

    const userData = JSON.stringify(user).replace(/"/g, "&quot;");
    const licenseData = JSON.stringify(license).replace(/"/g, "&quot;");

    return `
      <button class="action-btn action-remove-license" 
              onclick="Remediation.removeLicense(${userData}, ${licenseData})"
              title="Remove License">
        ❌
      </button>
    `;
  },

  // ============================================================================
  // Styles
  // ============================================================================

  /**
   * Inject CSS styles for remediation UI
   */
  injectStyles() {
    if (document.getElementById("remediation-styles")) return;

    const styles = document.createElement("style");
    styles.id = "remediation-styles";
    styles.textContent = `
      /* Modal Overlay */
      .remediation-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      /* Modal Box */
      .remediation-modal {
        background: var(--bg-primary, #ffffff);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 480px;
        width: 90%;
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .remediation-modal.danger .modal-header {
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
      }

      .remediation-modal.warning .modal-header {
        background: linear-gradient(135deg, #ffc107, #e0a800);
        color: #212529;
      }

      .remediation-modal.info .modal-header {
        background: linear-gradient(135deg, #0078d4, #005a9e);
        color: white;
      }

      .modal-header {
        padding: 16px 20px;
        border-radius: 12px 12px 0 0;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .modal-icon {
        font-size: 24px;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .modal-body {
        padding: 20px;
      }

      .modal-message {
        margin: 0 0 12px 0;
        font-size: 15px;
        color: var(--text-primary, #333);
      }

      .modal-details {
        background: var(--bg-secondary, #f5f5f5);
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.5;
      }

      .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--border-color, #e0e0e0);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .modal-footer .btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        font-size: 14px;
      }

      .modal-footer .btn-secondary {
        background: var(--bg-secondary, #f0f0f0);
        color: var(--text-primary, #333);
      }

      .modal-footer .btn-primary {
        background: #0078d4;
        color: white;
      }

      .modal-footer .btn-danger {
        background: #dc3545;
        color: white;
      }

      .modal-footer .btn:hover {
        opacity: 0.9;
      }

      /* Notifications */
      .remediation-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 14px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        animation: slideIn 0.3s ease;
        max-width: 400px;
      }

      @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .remediation-notification.fade-out {
        animation: slideOut 0.3s ease;
      }

      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
      }

      .remediation-notification.success {
        background: linear-gradient(135deg, #28a745, #218838);
        color: white;
      }

      .remediation-notification.error {
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
      }

      .remediation-notification.warning {
        background: linear-gradient(135deg, #ffc107, #e0a800);
        color: #212529;
      }

      .remediation-notification.info {
        background: linear-gradient(135deg, #0078d4, #005a9e);
        color: white;
      }

      /* Action Buttons */
      .user-actions {
        display: flex;
        gap: 6px;
      }

      .action-btn {
        padding: 6px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        background: var(--bg-secondary, #f0f0f0);
      }

      .action-btn:hover {
        transform: scale(1.1);
      }

      .action-btn.action-disable:hover {
        background: #ffc107;
      }

      .action-btn.action-enable:hover {
        background: #28a745;
        color: white;
      }

      .action-btn.action-revoke:hover {
        background: #dc3545;
        color: white;
      }

      .action-btn.action-remove-license:hover {
        background: #dc3545;
        color: white;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .remediation-modal {
          background: #1e1e1e;
        }
        .modal-message {
          color: #e0e0e0;
        }
        .modal-details {
          background: #2d2d2d;
          color: #e0e0e0;
        }
        .modal-footer {
          border-color: #3d3d3d;
        }
        .modal-footer .btn-secondary {
          background: #3d3d3d;
          color: #e0e0e0;
        }
      }
    `;

    document.head.appendChild(styles);
  },
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  Remediation.init();
});
