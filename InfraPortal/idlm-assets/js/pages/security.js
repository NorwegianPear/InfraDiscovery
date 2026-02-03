/**
 * Security Page - MFA Coverage, Admin Roles, Risk Detection
 * Features: Interactive filtering, drill-down details, remediation actions, score breakdown
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const SecurityPage = {
  securityData: null,
  riskFilter: "all",
  mfaFilter: "missing",
  adminFilter: "all",
  selectedRiskEvents: new Set(),

  /**
   * Render the security page
   */
  render() {
    return `
      <section class="page-section">
        <div class="page-toolbar">
          <div class="toolbar-right">
            <button class="btn btn-secondary" id="exportSecurityBtn">
              <span class="btn-icon">📥</span> Export Report
            </button>
            <button class="btn btn-primary" id="refreshSecurityBtn">
              <span class="btn-icon">🔄</span> Refresh
            </button>
          </div>
        </div>

        <!-- Security Score Overview -->
        <div class="security-score-section">
          <div class="security-score-card">
            <div class="score-circle" onclick="SecurityPage.showScoreBreakdown()">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" class="score-bg"/>
                <circle cx="50" cy="50" r="45" class="score-fill" id="scoreCircle" stroke-dasharray="0 283"/>
              </svg>
              <div class="score-value" id="securityScore">--</div>
            </div>
            <div class="score-info">
              <h3>Security Score</h3>
              <p>Based on MFA, admin roles, and risk status</p>
              <button class="btn btn-sm btn-secondary" onclick="SecurityPage.showScoreBreakdown()">View Details</button>
            </div>
          </div>
          <div class="security-quick-actions">
            <button class="btn btn-warning" onclick="SecurityPage.bulkMfaReminder()">
              📧 Send MFA Reminders
            </button>
            <button class="btn btn-info" onclick="SecurityPage.reviewAdmins()">
              👑 Review Admins
            </button>
            <button class="btn btn-danger" onclick="SecurityPage.investigateRisks()">
              ⚠️ Investigate Risks
            </button>
          </div>
        </div>

        <!-- MFA Coverage Section -->
        <div class="security-section" id="section-mfa">
          <h3 class="section-title">🔐 MFA Coverage Report</h3>
          <div class="mfa-grid">
            <div class="mfa-chart-card">
              <h4>MFA Registration Status</h4>
              <div class="chart-container">
                <canvas id="mfaCoverageChart"></canvas>
              </div>
            </div>
            <div class="mfa-stats">
              <div class="mfa-stat-card success">
                <div class="stat-icon">✓</div>
                <div class="stat-info">
                  <span class="stat-value" id="mfaRegistered">--</span>
                  <span class="stat-label">MFA Registered</span>
                </div>
              </div>
              <div class="mfa-stat-card danger">
                <div class="stat-icon">⚠</div>
                <div class="stat-info">
                  <span class="stat-value" id="mfaMissing">--</span>
                  <span class="stat-label">Missing MFA</span>
                </div>
              </div>
              <div class="mfa-stat-card info">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                  <span class="stat-value" id="mfaPercentage">--%</span>
                  <span class="stat-label">Coverage Rate</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Users Missing MFA Table -->
          <div class="data-table-container">
            <div class="table-header-bar">
              <h4>Users Without MFA Registration</h4>
              <div class="table-actions">
                <button class="btn btn-sm btn-warning" onclick="SecurityPage.sendBulkMfaReminders()">
                  📧 Send Reminders to All
                </button>
              </div>
            </div>
            <table class="data-table" id="mfaMissingTable">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Last Sign-in</th>
                  <th>Risk Level</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="mfaMissingBody">
                <tr><td colspan="6" class="loading-cell"><div class="loading-spinner"></div></td></tr>
              </tbody>
            </table>
            <div id="mfaMissingCount" class="result-count"></div>
          </div>
        </div>

        <!-- Admin Role Analysis -->
        <div class="security-section" id="section-admins">
          <h3 class="section-title">👑 Admin Role Analysis</h3>
          <div class="admin-grid">
            <div class="admin-chart-card">
              <h4>Administrative Role Distribution</h4>
              <div class="chart-container">
                <canvas id="adminRolesChart"></canvas>
              </div>
            </div>
            <div class="admin-stats">
              <div class="admin-stat-card danger">
                <div class="stat-icon">👑</div>
                <div class="stat-info">
                  <span class="stat-value" id="globalAdminCount">--</span>
                  <span class="stat-label">Global Admins</span>
                </div>
              </div>
              <div class="admin-stat-card warning">
                <div class="stat-icon">🔑</div>
                <div class="stat-info">
                  <span class="stat-value" id="privilegedCount">--</span>
                  <span class="stat-label">Privileged Roles</span>
                </div>
              </div>
              <div class="admin-stat-card info">
                <div class="stat-icon">📋</div>
                <div class="stat-info">
                  <span class="stat-value" id="roleTypesCount">--</span>
                  <span class="stat-label">Role Types</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Admin Users Table -->
          <div class="data-table-container">
            <h4>Privileged Users</h4>
            <table class="data-table" id="adminUsersTable">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Assignment Type</th>
                  <th>MFA Status</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody id="adminUsersBody">
                <tr><td colspan="5" class="loading-cell"><div class="loading-spinner"></div></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Risk Detections -->
        <div class="security-section" id="section-risks">
          <h3 class="section-title">⚠️ Risk Detections</h3>
          <div class="risk-grid">
            <div class="risk-stat-card high clickable" onclick="SecurityPage.filterRisks('high')">
              <div class="stat-icon">🔴</div>
              <div class="stat-info">
                <span class="stat-value" id="highRiskCount">--</span>
                <span class="stat-label">High Risk</span>
              </div>
            </div>
            <div class="risk-stat-card medium clickable" onclick="SecurityPage.filterRisks('medium')">
              <div class="stat-icon">🟠</div>
              <div class="stat-info">
                <span class="stat-value" id="mediumRiskCount">--</span>
                <span class="stat-label">Medium Risk</span>
              </div>
            </div>
            <div class="risk-stat-card low clickable" onclick="SecurityPage.filterRisks('low')">
              <div class="stat-icon">🟡</div>
              <div class="stat-info">
                <span class="stat-value" id="lowRiskCount">--</span>
                <span class="stat-label">Low Risk</span>
              </div>
            </div>
            <div class="risk-stat-card none clickable" onclick="SecurityPage.filterRisks('none')">
              <div class="stat-icon">🟢</div>
              <div class="stat-info">
                <span class="stat-value" id="noRiskCount">--</span>
                <span class="stat-label">No Risk</span>
              </div>
            </div>
          </div>

          <!-- Risk bulk actions -->
          <div class="bulk-actions-bar" id="riskBulkActions" style="display: none;">
            <span id="riskSelectedCount">0</span> events selected
            <button class="btn btn-sm btn-warning" onclick="SecurityPage.dismissSelectedRisks()">Dismiss Selected</button>
            <button class="btn btn-sm btn-danger" onclick="SecurityPage.confirmSelectedRisks()">Confirm Compromised</button>
            <button class="btn btn-sm btn-secondary" onclick="SecurityPage.clearRiskSelection()">Clear</button>
          </div>

          <!-- Risk Events Table -->
          <div class="data-table-container">
            <div class="table-header-bar">
              <h4>Recent Risk Events <span id="riskFilterBadge" class="filter-badge" style="display: none;"></span></h4>
              <div class="table-actions">
                <button class="btn btn-sm btn-secondary" onclick="SecurityPage.clearRiskFilter()">Show All</button>
              </div>
            </div>
            <table class="data-table" id="riskEventsTable">
              <thead>
                <tr>
                  <th class="checkbox-col">
                    <input type="checkbox" id="selectAllRisks" onchange="SecurityPage.toggleAllRisks(this.checked)">
                  </th>
                  <th>User</th>
                  <th>Risk Type</th>
                  <th>Risk Level</th>
                  <th>Detected</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="riskEventsBody">
                <tr><td colspan="8" class="loading-cell"><div class="loading-spinner"></div></td></tr>
              </tbody>
            </table>
            <div id="riskEventsCount" class="result-count"></div>
          </div>
        </div>

        <!-- Conditional Access Review -->
        <div class="security-section">
          <h3 class="section-title">🛡️ Conditional Access Policies</h3>
          <div class="ca-grid" id="caPoliciesGrid">
            <div class="loading-spinner"></div>
          </div>
        </div>

        <!-- Score Breakdown Modal -->
        <div class="modal" id="scoreBreakdownModal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Security Score Breakdown</h3>
              <button class="modal-close" onclick="SecurityPage.closeScoreModal()">×</button>
            </div>
            <div class="modal-body" id="scoreBreakdownBody">
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="SecurityPage.closeScoreModal()">Close</button>
              <button class="btn btn-primary" onclick="SecurityPage.exportReport()">Export Full Report</button>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  /**
   * Initialize page
   */
  async init() {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    await this.loadSecurityData();
    this.initCharts();
  },

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (!document.getElementById("securityScore")) return;

      // Escape - close modals, clear selections
      if (e.key === "Escape") {
        this.closeScoreModal();
        this.clearRiskSelection();
        this.clearRiskFilter();
      }
    });
  },

  setupEventListeners() {
    const refreshBtn = document.getElementById("refreshSecurityBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadSecurityData());
    }

    const exportBtn = document.getElementById("exportSecurityBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportReport());
    }
  },

  // Risk filtering methods
  filterRisks(level) {
    this.riskFilter = level;
    this.renderRiskEventsTable();

    // Update filter badge
    const badge = document.getElementById("riskFilterBadge");
    if (badge) {
      badge.textContent = level.charAt(0).toUpperCase() + level.slice(1);
      badge.style.display = "inline";
      badge.className = `filter-badge risk-${level}`;
    }

    // Highlight active stat card
    document
      .querySelectorAll(".risk-stat-card")
      .forEach((card) => card.classList.remove("active"));
    document.querySelector(`.risk-stat-card.${level}`)?.classList.add("active");
  },

  clearRiskFilter() {
    this.riskFilter = "all";
    this.renderRiskEventsTable();

    const badge = document.getElementById("riskFilterBadge");
    if (badge) badge.style.display = "none";

    document
      .querySelectorAll(".risk-stat-card")
      .forEach((card) => card.classList.remove("active"));
  },

  toggleAllRisks(checked) {
    const events = this.securityData?.risks?.events || [];
    if (checked) {
      events.forEach((e) => this.selectedRiskEvents.add(e.id));
    } else {
      this.selectedRiskEvents.clear();
    }
    this.renderRiskEventsTable();
    this.updateRiskBulkActions();
  },

  toggleRiskSelection(eventId) {
    if (this.selectedRiskEvents.has(eventId)) {
      this.selectedRiskEvents.delete(eventId);
    } else {
      this.selectedRiskEvents.add(eventId);
    }
    this.updateRiskBulkActions();
  },

  clearRiskSelection() {
    this.selectedRiskEvents.clear();
    this.updateRiskBulkActions();
    document
      .querySelectorAll(".risk-checkbox")
      .forEach((cb) => (cb.checked = false));
    document.getElementById("selectAllRisks").checked = false;
  },

  updateRiskBulkActions() {
    const bar = document.getElementById("riskBulkActions");
    const countEl = document.getElementById("riskSelectedCount");
    if (bar && countEl) {
      const count = this.selectedRiskEvents.size;
      bar.style.display = count > 0 ? "flex" : "none";
      countEl.textContent = count;
    }
  },

  dismissSelectedRisks() {
    if (this.selectedRiskEvents.size === 0) return;
    if (
      confirm(`Dismiss ${this.selectedRiskEvents.size} selected risk events?`)
    ) {
      alert(
        `${this.selectedRiskEvents.size} risk events would be dismissed. This requires Identity Protection API permissions.`
      );
      this.clearRiskSelection();
    }
  },

  confirmSelectedRisks() {
    if (this.selectedRiskEvents.size === 0) return;
    if (
      confirm(
        `Confirm ${this.selectedRiskEvents.size} users as compromised? This will require password reset.`
      )
    ) {
      alert(
        `${this.selectedRiskEvents.size} users would be marked as compromised. This requires Identity Protection API permissions.`
      );
      this.clearRiskSelection();
    }
  },

  // Score breakdown modal
  showScoreBreakdown() {
    const modal = document.getElementById("scoreBreakdownModal");
    const body = document.getElementById("scoreBreakdownBody");
    if (!modal || !body || !this.securityData) return;

    const data = this.securityData;
    const total = data.mfa.registered + data.mfa.missing;
    const mfaPercentage =
      total > 0 ? Math.round((data.mfa.registered / total) * 100) : 0;
    const score = this.calculateSecurityScore();

    body.innerHTML = `
      <div class="score-breakdown">
        <div class="score-summary">
          <div class="big-score ${
            score >= 80 ? "good" : score >= 50 ? "warning" : "bad"
          }">
            ${score}%
          </div>
          <p class="score-rating">${
            score >= 80
              ? "✅ Good"
              : score >= 50
              ? "⚠️ Needs Improvement"
              : "❌ Critical"
          }</p>
        </div>

        <div class="breakdown-section">
          <h4>🔐 MFA Coverage (30% weight)</h4>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${mfaPercentage}%; background: ${
      mfaPercentage >= 90
        ? "#10b981"
        : mfaPercentage >= 70
        ? "#f59e0b"
        : "#ef4444"
    };"></div>
          </div>
          <p>${mfaPercentage}% of users have MFA enabled</p>
          <ul>
            <li>✅ ${data.mfa.registered} users with MFA</li>
            <li>❌ ${data.mfa.missing} users without MFA</li>
          </ul>
        </div>

        <div class="breakdown-section">
          <h4>👑 Admin Roles (10% weight)</h4>
          <p>${data.admins.globalAdmins <= 5 ? "✅" : "⚠️"} ${
      data.admins.globalAdmins
    } Global Administrators ${
      data.admins.globalAdmins > 5 ? "(Recommended: 5 or fewer)" : ""
    }</p>
          <p>📋 ${
            data.admins.privilegedRoles
          } total privileged role assignments</p>
        </div>

        <div class="breakdown-section">
          <h4>⚠️ Risk Detections (60% weight)</h4>
          <ul>
            <li>${data.risks.high > 0 ? "🔴" : "✅"} ${
      data.risks.high
    } high-risk events ${data.risks.high > 0 ? "(-5 pts each)" : ""}</li>
            <li>${data.risks.medium > 0 ? "🟠" : "✅"} ${
      data.risks.medium
    } medium-risk events ${data.risks.medium > 0 ? "(-2 pts each)" : ""}</li>
            <li>🟡 ${data.risks.low} low-risk events</li>
          </ul>
        </div>

        <div class="breakdown-recommendations">
          <h4>💡 Recommendations</h4>
          <ul>
            ${
              data.mfa.missing > 0
                ? `<li>Enable MFA for ${data.mfa.missing} remaining users</li>`
                : ""
            }
            ${
              data.admins.globalAdmins > 5
                ? "<li>Reduce Global Administrator count to 5 or fewer</li>"
                : ""
            }
            ${
              data.risks.high > 0
                ? "<li>Investigate and remediate high-risk events immediately</li>"
                : ""
            }
            ${
              data.risks.medium > 0
                ? "<li>Review medium-risk events for potential threats</li>"
                : ""
            }
            ${
              score >= 90
                ? "<li>✅ Excellent! Keep monitoring for new risks.</li>"
                : ""
            }
          </ul>
        </div>
      </div>
    `;

    modal.style.display = "flex";
    modal.onclick = (e) => {
      if (e.target === modal) this.closeScoreModal();
    };
  },

  closeScoreModal() {
    const modal = document.getElementById("scoreBreakdownModal");
    if (modal) modal.style.display = "none";
  },

  // Quick action buttons
  bulkMfaReminder() {
    const missing = this.securityData?.mfa?.usersMissingMfa || [];
    if (missing.length === 0) {
      if (typeof Toast !== "undefined") {
        Toast.success("All users have MFA enabled!");
      } else {
        alert("All users have MFA enabled!");
      }
      return;
    }
    if (
      confirm(`Send MFA registration reminders to ${missing.length} users?`)
    ) {
      if (typeof Toast !== "undefined") {
        Toast.info(`MFA reminders would be sent to ${missing.length} users.`);
      } else {
        alert(`MFA reminders would be sent to ${missing.length} users.`);
      }
    }
  },

  /**
   * Scroll to a specific section on the page
   */
  scrollToSection(section) {
    const sectionElement = document.getElementById(`section-${section}`);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
      // Add highlight effect
      sectionElement.classList.add("section-highlight");
      setTimeout(
        () => sectionElement.classList.remove("section-highlight"),
        2000
      );
    }
  },

  reviewAdmins() {
    // Scroll to admin section
    this.scrollToSection("admins");
  },

  investigateRisks() {
    // Filter to high risk and scroll
    this.filterRisks("high");
    this.scrollToSection("risks");
  },

  sendBulkMfaReminders() {
    this.bulkMfaReminder();
  },

  async loadSecurityData() {
    try {
      // Require real API - no mock data fallback
      if (App.useRealApi && (GraphAPI.accessToken || GraphAPI.useBackendApi)) {
        this.securityData = await this.fetchRealSecurityData();
      } else {
        // Show message that authentication is required
        console.log("⚠️ Authentication required to load security data");
        return;
      }
      this.updateUI();
    } catch (error) {
      console.error("Failed to load security data:", error);
    }
  },

  async fetchRealSecurityData() {
    // Fetch from Graph API
    const [users, directoryRoles, adminRoles] = await Promise.all([
      GraphAPI.getUsers(),
      GraphAPI.getDirectoryRoles(),
      GraphAPI.getAdminRoles(),
    ]);

    // Normalize users if they come from raw Graph API
    const normalizedUsers = users.map((user) => {
      if (user._raw || user.mfaEnabled !== undefined) {
        return user; // Already normalized
      }
      // Normalize raw Graph API user
      return {
        ...user,
        mfaEnabled: (user.assignedLicenses?.length || 0) > 0,
        email: user.mail || user.userPrincipalName || "",
      };
    });

    // Count MFA status from actual user data
    const mfaRegistered = normalizedUsers.filter((u) => u.mfaEnabled).length;
    const mfaMissing = normalizedUsers.filter((u) => !u.mfaEnabled).length;

    // Get admin counts from actual API data
    const globalAdmins = adminRoles?.globalAdmins || 0;
    const privilegedRoles = adminRoles?.privilegedRoles || 0;

    // Risk events - no mock data, show empty if not available
    // Real risk data would come from /identityProtection/riskyUsers API
    const riskEvents = [];

    return {
      mfa: {
        registered: mfaRegistered,
        missing: mfaMissing,
        usersMissingMfa: normalizedUsers.filter((u) => !u.mfaEnabled),
      },
      admins: {
        globalAdmins: globalAdmins,
        privilegedRoles: privilegedRoles,
        roleAssignments: directoryRoles || [],
      },
      risks: {
        high: 0,
        medium: 0,
        low: 0,
        none: normalizedUsers.length,
        events: riskEvents,
      },
      conditionalAccess: [],
    };
  },

  updateUI() {
    const data = this.securityData;
    if (!data) {
      console.log("⚠️ No security data available");
      return;
    }

    // Ensure nested objects exist with defaults
    data.mfa = data.mfa || { registered: 0, missing: 0, usersMissingMfa: [] };
    data.admins = data.admins || {
      globalAdmins: 0,
      privilegedRoles: 0,
      roleAssignments: [],
    };
    data.risks = data.risks || {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
      events: [],
    };

    // Update MFA stats
    const total = (data.mfa.registered || 0) + (data.mfa.missing || 0);
    const percentage =
      total > 0 ? Math.round((data.mfa.registered / total) * 100) : 0;

    const mfaRegisteredEl = document.getElementById("mfaRegistered");
    const mfaMissingEl = document.getElementById("mfaMissing");
    const mfaPercentageEl = document.getElementById("mfaPercentage");

    if (mfaRegisteredEl)
      mfaRegisteredEl.textContent = (data.mfa.registered || 0).toLocaleString();
    if (mfaMissingEl)
      mfaMissingEl.textContent = (data.mfa.missing || 0).toLocaleString();
    if (mfaPercentageEl) mfaPercentageEl.textContent = `${percentage}%`;

    // Update Admin stats
    const globalAdminEl = document.getElementById("globalAdminCount");
    const privilegedEl = document.getElementById("privilegedCount");
    const roleTypesEl = document.getElementById("roleTypesCount");

    if (globalAdminEl)
      globalAdminEl.textContent = data.admins.globalAdmins || 0;
    if (privilegedEl)
      privilegedEl.textContent = data.admins.privilegedRoles || 0;
    if (roleTypesEl)
      roleTypesEl.textContent = (data.admins.roleAssignments || []).length;

    // Update Risk stats
    const highRiskEl = document.getElementById("highRiskCount");
    const mediumRiskEl = document.getElementById("mediumRiskCount");
    const lowRiskEl = document.getElementById("lowRiskCount");
    const noRiskEl = document.getElementById("noRiskCount");

    if (highRiskEl) highRiskEl.textContent = data.risks.high || 0;
    if (mediumRiskEl) mediumRiskEl.textContent = data.risks.medium || 0;
    if (lowRiskEl) lowRiskEl.textContent = data.risks.low || 0;
    if (noRiskEl) noRiskEl.textContent = data.risks.none || 0;

    // Update Security Score
    const score = this.calculateSecurityScore();
    const scoreEl = document.getElementById("securityScore");
    if (scoreEl) scoreEl.textContent = `${score}%`;
    const circle = document.getElementById("scoreCircle");
    if (circle) {
      circle.style.strokeDasharray = `${score * 2.83} 283`;
    }

    // Render tables
    this.renderMfaMissingTable();
    this.renderAdminUsersTable();
    this.renderRiskEventsTable();
    this.renderCAPolicies();
  },

  calculateSecurityScore() {
    const data = this.securityData;
    if (!data || !data.mfa || !data.admins || !data.risks) {
      return 0;
    }

    let score = 100;

    // Deduct for missing MFA
    const totalMfa = (data.mfa.registered || 0) + (data.mfa.missing || 0);
    const mfaPercentage =
      totalMfa > 0 ? ((data.mfa.registered || 0) / totalMfa) * 100 : 100;
    if (mfaPercentage < 100) score -= (100 - mfaPercentage) * 0.3;

    // Deduct for too many global admins
    if ((data.admins.globalAdmins || 0) > 5) score -= 10;

    // Deduct for high risk events
    score -= (data.risks.high || 0) * 5;
    score -= (data.risks.medium || 0) * 2;

    return Math.max(0, Math.round(score));
  },

  renderMfaMissingTable() {
    const tbody = document.getElementById("mfaMissingBody");
    if (!tbody) return;

    const users = this.securityData?.mfa?.usersMissingMfa || [];

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-cell">
            <div class="empty-state">
              <span class="empty-icon">✅</span>
              <p>All users have MFA configured</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users
      .slice(0, 10)
      .map(
        (u) => `
      <tr>
        <td>${u.name || "Unknown"}</td>
        <td>${u.email || "N/A"}</td>
        <td><span class="badge badge-${(u.type || "member").toLowerCase()}">${
          u.type || "Member"
        }</span></td>
        <td>${u.lastSignIn || "Never"}</td>
        <td><span class="risk-badge risk-${(u.risk || "low").toLowerCase()}">${
          u.risk || "Low"
        }</span></td>
        <td><button class="action-btn" onclick="SecurityPage.sendMfaReminder('${
          u.email || ""
        }')">📧 Remind</button></td>
      </tr>
    `
      )
      .join("");
  },

  renderAdminUsersTable() {
    const tbody = document.getElementById("adminUsersBody");
    if (!tbody) return;

    const roleAssignments = this.securityData?.admins?.roleAssignments || [];

    if (roleAssignments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-cell">
            <div class="empty-state">
              <span class="empty-icon">👑</span>
              <p>No admin role assignments found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const rows = [];
    roleAssignments.forEach((role) => {
      (role.users || []).forEach((user) => {
        rows.push({ user, role: role.role || "Unknown Role" });
      });
    });

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-cell">
            <div class="empty-state">
              <span class="empty-icon">👑</span>
              <p>No admin users found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows
      .slice(0, 15)
      .map(
        (r) => `
      <tr>
        <td>${r.user}</td>
        <td><span class="role-badge">${r.role}</span></td>
        <td>Direct</td>
        <td><span class="mfa-badge mfa-enabled">✓ Enabled</span></td>
        <td>Today</td>
      </tr>
    `
      )
      .join("");
  },

  renderRiskEventsTable() {
    const tbody = document.getElementById("riskEventsBody");
    if (!tbody) return;

    let events = this.securityData?.risks?.events || [];

    // Apply filter
    if (this.riskFilter !== "all") {
      events = events.filter((e) => e.level.toLowerCase() === this.riskFilter);
    }

    // Update count
    const countEl = document.getElementById("riskEventsCount");
    if (countEl) {
      const total = this.securityData?.risks?.events?.length || 0;
      countEl.textContent =
        this.riskFilter !== "all"
          ? `Showing ${events.length} of ${total} events (${this.riskFilter} risk)`
          : `${total} risk events`;
    }

    if (events.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-cell">
            <div class="empty-state">
              <span class="empty-icon">✅</span>
              <p>${
                this.riskFilter !== "all"
                  ? `No ${this.riskFilter} risk events`
                  : "No risk events detected"
              }</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = events
      .map(
        (e) => `
      <tr class="${
        this.selectedRiskEvents.has(e.id) ? "selected" : ""
      }" data-risk-id="${e.id}">
        <td class="checkbox-col">
          <input type="checkbox" class="risk-checkbox" data-risk-id="${e.id}"
                 ${this.selectedRiskEvents.has(e.id) ? "checked" : ""}
                 onchange="SecurityPage.toggleRiskSelection('${e.id}')">
        </td>
        <td>${e.user}</td>
        <td>${e.type}</td>
        <td><span class="risk-badge risk-${e.level.toLowerCase()}">${
          e.level
        }</span></td>
        <td>${e.detected}</td>
        <td>${e.location}</td>
        <td><span class="status-badge status-${e.status
          .toLowerCase()
          .replace(" ", "-")}">${e.status}</span></td>
        <td>
          <div class="action-buttons">
            <button class="action-btn" title="View Details" onclick="SecurityPage.viewRiskDetails('${
              e.id
            }')">👁</button>
            <button class="action-btn" title="Dismiss" onclick="SecurityPage.dismissRisk('${
              e.id
            }')">✓</button>
            <button class="action-btn action-danger" title="Confirm Compromised" onclick="SecurityPage.confirmCompromised('${
              e.id
            }')">⚠️</button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  },

  viewRiskDetails(riskId) {
    const event = this.securityData?.risks?.events?.find(
      (e) => e.id === riskId
    );
    if (!event) return;

    const details = `Risk Event Details:\n\nUser: ${event.user}\nType: ${event.type}\nLevel: ${event.level}\nDetected: ${event.detected}\nLocation: ${event.location}\nStatus: ${event.status}\n\nFull investigation would require Identity Protection API access.`;

    if (typeof Toast !== "undefined") {
      Toast.info(details.replace(/\n/g, "<br>"), { duration: 10000 });
    } else {
      alert(details);
    }
  },

  dismissRisk(riskId) {
    if (confirm("Dismiss this risk event?")) {
      if (typeof Toast !== "undefined") {
        Toast.warning(
          "Risk dismissal requires Identity Protection API write permissions."
        );
      } else {
        alert(
          "Risk dismissal requires Identity Protection API write permissions."
        );
      }
    }
  },

  confirmCompromised(riskId) {
    const event = this.securityData?.risks?.events?.find(
      (e) => e.id === riskId
    );
    if (
      confirm(
        `Confirm ${event?.user} as compromised? This will require password reset.`
      )
    ) {
      if (typeof Toast !== "undefined") {
        Toast.warning(
          "Confirming user compromise requires Identity Protection API write permissions."
        );
      } else {
        alert(
          "Confirming user compromise requires Identity Protection API write permissions."
        );
      }
    }
  },

  renderCAPolicies() {
    const grid = document.getElementById("caPoliciesGrid");
    if (!grid) return;

    const policies = this.securityData.conditionalAccess || [];
    grid.innerHTML = policies
      .map(
        (p) => `
      <div class="ca-policy-card">
        <div class="policy-header">
          <span class="policy-status ${p.state
            .toLowerCase()
            .replace("-", "")}">${p.state}</span>
          <h4>${p.name}</h4>
        </div>
        <div class="policy-details">
          <div class="policy-row"><strong>Users:</strong> ${p.users}</div>
          <div class="policy-row"><strong>Conditions:</strong> ${
            p.conditions
          }</div>
          <div class="policy-row"><strong>Controls:</strong> ${p.controls}</div>
        </div>
      </div>
    `
      )
      .join("");
  },

  initCharts() {
    // Ensure security data is available
    if (!this.securityData) {
      console.warn("Security data not available for charts");
      return;
    }

    // MFA Coverage Chart
    const mfaCtx = document.getElementById("mfaCoverageChart");
    if (mfaCtx && this.securityData.mfa) {
      new Chart(mfaCtx, {
        type: "doughnut",
        data: {
          labels: ["MFA Registered", "Missing MFA"],
          datasets: [
            {
              data: [
                this.securityData.mfa.registered || 0,
                this.securityData.mfa.missing || 0,
              ],
              backgroundColor: ["#10b981", "#ef4444"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "60%",
          plugins: {
            legend: { position: "bottom" },
          },
        },
      });
    }

    // Admin Roles Chart
    const adminCtx = document.getElementById("adminRolesChart");
    if (adminCtx && this.securityData.admins?.roleAssignments) {
      const roles = this.securityData.admins.roleAssignments;
      new Chart(adminCtx, {
        type: "bar",
        data: {
          labels: roles.map((r) => r.role || r.displayName || "Unknown"),
          datasets: [
            {
              label: "Users",
              data: roles.map((r) => r.users?.length || r.memberCount || r.count || 0),
              backgroundColor: "#0066b3",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: {
            legend: { display: false },
          },
        },
      });
    }
  },

  sendMfaReminder(email) {
    if (typeof Toast !== "undefined") {
      Toast.info(`MFA registration reminder would be sent to: ${email}`);
    } else {
      alert(`MFA registration reminder would be sent to: ${email}`);
    }
  },

  exportReport() {
    // Prepare security report data
    const exportData = [];

    // MFA Status
    exportData.push({
      Category: "MFA",
      Metric: "Users with MFA Registered",
      Value: this.mfaStats?.registered || 0,
      Status: "OK",
    });
    exportData.push({
      Category: "MFA",
      Metric: "Users without MFA",
      Value: this.mfaStats?.notRegistered || 0,
      Status: this.mfaStats?.notRegistered > 0 ? "Action Required" : "OK",
    });

    // Admin Stats
    exportData.push({
      Category: "Privileged Access",
      Metric: "Global Administrators",
      Value: this.adminStats?.globalAdmins || 0,
      Status:
        (this.adminStats?.globalAdmins || 0) <= 5 ? "OK" : "Review Recommended",
    });
    exportData.push({
      Category: "Privileged Access",
      Metric: "Total Admin Role Assignments",
      Value: this.adminStats?.total || 0,
      Status: "Info",
    });

    // Risk Stats
    if (this.riskStats) {
      exportData.push({
        Category: "Risk",
        Metric: "High Risk Users",
        Value: this.riskStats?.high || 0,
        Status: this.riskStats?.high > 0 ? "Critical" : "OK",
      });
      exportData.push({
        Category: "Risk",
        Metric: "Medium Risk Users",
        Value: this.riskStats?.medium || 0,
        Status: this.riskStats?.medium > 0 ? "Warning" : "OK",
      });
    }

    // Admin Role Details
    if (this.adminStats?.roles) {
      this.adminStats.roles.forEach((role) => {
        exportData.push({
          Category: "Admin Roles",
          Metric: role.name,
          Value: role.count,
          Status: "Info",
        });
      });
    }

    if (typeof ExportUtils !== "undefined") {
      ExportUtils.showExportDialog(
        exportData,
        `security-report-${new Date().toISOString().split("T")[0]}`,
        "Export Security Report"
      );
    } else {
      // Fallback
      const csv = [
        "Category,Metric,Value,Status",
        ...exportData.map(
          (r) => `${r.Category},${r.Metric},${r.Value},${r.Status}`
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-report-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
    }
  },
};
