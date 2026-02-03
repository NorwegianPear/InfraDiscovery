/**
 * Reports Page - Scheduled Reports, Export, Custom Date Ranges
 * Features: Search, filtering, templates, download tracking, report preview
 */

const ReportsPage = {
  reports: [],
  reportHistory: [],
  scheduledReports: [],
  dateRange: { start: null, end: null },
  historyFilter: "all",
  historySearch: "",
  favoriteReports: new Set(),

  /**
   * Render the reports page
   */
  render() {
    const today = new Date().toISOString().split("T")[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return `
      <section class="page-section">
        <div class="page-toolbar">
          <div class="toolbar-left">
            <div class="date-range-picker">
              <label>Date Range:</label>
              <input type="date" id="startDate" value="${lastMonth}" class="date-input">
              <span>to</span>
              <input type="date" id="endDate" value="${today}" class="date-input">
              <button class="btn btn-secondary" id="applyDateRange">Apply</button>
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-primary" id="generateReportBtn">
              <span class="btn-icon">📄</span> Generate Report
            </button>
          </div>
        </div>

        <!-- Quick Reports -->
        <div class="reports-section">
          <h3 class="section-title">📊 Quick Reports</h3>
          <div class="quick-reports-grid">
            <div class="report-card" onclick="ReportsPage.generateReport('users')">
              <div class="report-icon">👥</div>
              <h4>User Summary</h4>
              <p>All users with status, activity, and MFA info</p>
              <div class="report-actions">
                <button class="btn btn-sm btn-primary">Generate</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('users', 'excel')">Excel</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('users', 'pdf')">PDF</button>
              </div>
            </div>
            <div class="report-card" onclick="ReportsPage.generateReport('licenses')">
              <div class="report-icon">📜</div>
              <h4>License Report</h4>
              <p>License inventory, utilization, and costs</p>
              <div class="report-actions">
                <button class="btn btn-sm btn-primary">Generate</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('licenses', 'excel')">Excel</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('licenses', 'pdf')">PDF</button>
              </div>
            </div>
            <div class="report-card" onclick="ReportsPage.generateReport('security')">
              <div class="report-icon">🔒</div>
              <h4>Security Report</h4>
              <p>MFA coverage, admin roles, risk events</p>
              <div class="report-actions">
                <button class="btn btn-sm btn-primary">Generate</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('security', 'excel')">Excel</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('security', 'pdf')">PDF</button>
              </div>
            </div>
            <div class="report-card" onclick="ReportsPage.generateReport('signins')">
              <div class="report-icon">🌍</div>
              <h4>Sign-in Report</h4>
              <p>Sign-in locations, failures, and anomalies</p>
              <div class="report-actions">
                <button class="btn btn-sm btn-primary">Generate</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('signins', 'excel')">Excel</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('signins', 'pdf')">PDF</button>
              </div>
            </div>
            <div class="report-card" onclick="ReportsPage.generateReport('inactive')">
              <div class="report-icon">⏸️</div>
              <h4>Inactive Users</h4>
              <p>Users with no sign-in for 90+ days</p>
              <div class="report-actions">
                <button class="btn btn-sm btn-primary">Generate</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('inactive', 'excel')">Excel</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('inactive', 'pdf')">PDF</button>
              </div>
            </div>
            <div class="report-card" onclick="ReportsPage.generateReport('guests')">
              <div class="report-icon">🌐</div>
              <h4>Guest Users</h4>
              <p>External users and their access status</p>
              <div class="report-actions">
                <button class="btn btn-sm btn-primary">Generate</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('guests', 'excel')">Excel</button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ReportsPage.exportReport('guests', 'pdf')">PDF</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Scheduled Reports -->
        <div class="reports-section">
          <h3 class="section-title">📅 Scheduled Reports</h3>
          <div class="scheduled-reports">
            <div class="scheduled-header">
              <button class="btn btn-primary" id="addScheduleBtn">
                <span class="btn-icon">+</span> Add Schedule
              </button>
            </div>
            <div class="data-table-container">
              <table class="data-table" id="scheduledReportsTable">
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Type</th>
                    <th>Frequency</th>
                    <th>Recipients</th>
                    <th>Last Run</th>
                    <th>Next Run</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="scheduledReportsBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Report History -->
        <div class="reports-section">
          <h3 class="section-title">📋 Report History</h3>
          <div class="history-toolbar">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="historySearch" placeholder="Search reports..." class="search-input">
            </div>
            <div class="filter-group">
              <button class="filter-btn active" data-filter="all">All</button>
              <button class="filter-btn" data-filter="excel">Excel</button>
              <button class="filter-btn" data-filter="pdf">PDF</button>
              <button class="filter-btn" data-filter="csv">CSV</button>
            </div>
            <button class="btn btn-secondary" id="clearHistoryBtn">🗑️ Clear History</button>
          </div>
          <div class="data-table-container">
            <table class="data-table" id="reportHistoryTable">
              <thead>
                <tr>
                  <th class="sortable" data-sort="name">Report</th>
                  <th class="sortable" data-sort="generated">Generated</th>
                  <th>Generated By</th>
                  <th>Date Range</th>
                  <th>Format</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="reportHistoryBody">
              </tbody>
            </table>
          </div>
          <div id="historyResultCount" class="result-count"></div>
        </div>

        <!-- Email Delivery Settings -->
        <div class="reports-section">
          <h3 class="section-title">📧 Email Delivery</h3>
          <div class="email-settings-card">
            <div class="setting-row">
              <label>Default Recipients:</label>
              <input type="text" id="defaultRecipients" class="setting-input" placeholder="email1@company.com, email2@company.com" value="it-admin@ateara.onmicrosoft.com">
            </div>
            <div class="setting-row">
              <label>Email Subject Prefix:</label>
              <input type="text" id="emailPrefix" class="setting-input" value="[Atea IDLM Report]">
            </div>
            <div class="setting-row">
              <label>Include Report Summary:</label>
              <input type="checkbox" id="includeSummary" checked>
              <span>Include key metrics in email body</span>
            </div>
            <div class="setting-row">
              <button class="btn btn-primary" id="saveEmailSettings">Save Settings</button>
            </div>
          </div>
        </div>

        <!-- Report Preview Modal -->
        <div class="modal" id="reportPreviewModal" style="display: none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="reportPreviewTitle">Report Preview</h3>
              <button class="modal-close" onclick="ReportsPage.closeModal()">×</button>
            </div>
            <div class="modal-body" id="reportPreviewContent">
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="ReportsPage.closeModal()">Close</button>
              <button class="btn btn-primary" id="downloadReportBtn">Download</button>
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
    this.loadFavorites();
    this.setupEventListeners();
    this.loadScheduledReports();
    this.loadReportHistory();
    this.updateQuickReportCards();
  },

  /**
   * Load favorites from storage
   */
  loadFavorites() {
    try {
      const saved = localStorage.getItem("atea-idlm-favorite-reports");
      if (saved) {
        this.favoriteReports = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load favorite reports", e);
    }
  },

  /**
   * Toggle favorite status
   */
  toggleFavorite(reportType) {
    if (this.favoriteReports.has(reportType)) {
      this.favoriteReports.delete(reportType);
    } else {
      this.favoriteReports.add(reportType);
    }
    localStorage.setItem(
      "atea-idlm-favorite-reports",
      JSON.stringify([...this.favoriteReports])
    );
    this.updateQuickReportCards();
  },

  /**
   * Update quick report cards with favorite status
   */
  updateQuickReportCards() {
    document.querySelectorAll(".report-card").forEach((card) => {
      const type = card.getAttribute("data-report-type");
      if (type) {
        const favBtn = card.querySelector(".favorite-btn");
        if (favBtn) {
          favBtn.textContent = this.favoriteReports.has(type) ? "⭐" : "☆";
          favBtn.title = this.favoriteReports.has(type)
            ? "Remove from favorites"
            : "Add to favorites";
        }
      }
    });
  },

  setupEventListeners() {
    const applyBtn = document.getElementById("applyDateRange");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => this.applyDateRange());
    }

    const generateBtn = document.getElementById("generateReportBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => this.showReportWizard());
    }

    const addScheduleBtn = document.getElementById("addScheduleBtn");
    if (addScheduleBtn) {
      addScheduleBtn.addEventListener("click", () => this.addSchedule());
    }

    const saveEmailBtn = document.getElementById("saveEmailSettings");
    if (saveEmailBtn) {
      saveEmailBtn.addEventListener("click", () => this.saveEmailSettings());
    }

    // History search
    const historySearch = document.getElementById("historySearch");
    if (historySearch) {
      let debounceTimer;
      historySearch.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.historySearch = e.target.value.toLowerCase();
          this.renderReportHistory();
        }, 300);
      });
    }

    // History filter buttons
    document.querySelectorAll(".history-toolbar .filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".history-toolbar .filter-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.historyFilter = e.target.dataset.filter;
        this.renderReportHistory();
      });
    });

    // Clear history button
    const clearHistoryBtn = document.getElementById("clearHistoryBtn");
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", () => this.clearHistory());
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (!document.getElementById("reportHistoryTable")) return;

      // Ctrl+G - Generate report
      if (e.ctrlKey && e.key === "g") {
        e.preventDefault();
        this.showReportWizard();
      }
    });
  },

  applyDateRange() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    this.dateRange = { start: startDate, end: endDate };
    console.log("Date range applied:", this.dateRange);
  },

  loadScheduledReports() {
    const tbody = document.getElementById("scheduledReportsBody");
    if (!tbody) return;

    const scheduled = [
      {
        name: "Weekly Security Summary",
        type: "Security",
        frequency: "Weekly",
        recipients: "security-team@ateara.onmicrosoft.com",
        lastRun: "2025-12-08",
        nextRun: "2025-12-15",
        status: "Active",
      },
      {
        name: "Monthly License Report",
        type: "Licenses",
        frequency: "Monthly",
        recipients: "it-admin@ateara.onmicrosoft.com",
        lastRun: "2025-12-01",
        nextRun: "2026-01-01",
        status: "Active",
      },
      {
        name: "Daily Sign-in Anomalies",
        type: "Sign-ins",
        frequency: "Daily",
        recipients: "soc@ateara.onmicrosoft.com",
        lastRun: "2025-12-10",
        nextRun: "2025-12-11",
        status: "Active",
      },
    ];

    tbody.innerHTML = scheduled
      .map(
        (s) => `
      <tr>
        <td>${s.name}</td>
        <td><span class="badge badge-info">${s.type}</span></td>
        <td>${s.frequency}</td>
        <td>${s.recipients}</td>
        <td>${s.lastRun}</td>
        <td>${s.nextRun}</td>
        <td><span class="status-badge status-${s.status.toLowerCase()}">${
          s.status
        }</span></td>
        <td>
          <button class="action-btn" title="Edit">✏️</button>
          <button class="action-btn" title="Run Now">▶️</button>
          <button class="action-btn" title="Delete">🗑️</button>
        </td>
      </tr>
    `
      )
      .join("");
  },

  loadReportHistory() {
    // Load from storage or use default
    const saved = localStorage.getItem("atea-idlm-report-history");
    if (saved) {
      try {
        this.reportHistory = JSON.parse(saved);
      } catch (e) {
        this.reportHistory = this.getDefaultHistory();
      }
    } else {
      this.reportHistory = this.getDefaultHistory();
    }
    this.renderReportHistory();
  },

  getDefaultHistory() {
    return [
      {
        id: "rpt-001",
        name: "User Summary",
        generated: "2025-12-10 14:30",
        by: "Uy Le Thai Phan",
        range: "Last 30 days",
        format: "Excel",
        size: "245 KB",
        type: "users",
      },
      {
        id: "rpt-002",
        name: "Security Report",
        generated: "2025-12-10 12:15",
        by: "System",
        range: "Last 7 days",
        format: "PDF",
        size: "1.2 MB",
        type: "security",
      },
      {
        id: "rpt-003",
        name: "License Report",
        generated: "2025-12-09 09:00",
        by: "System",
        range: "Current",
        format: "Excel",
        size: "156 KB",
        type: "licenses",
      },
      {
        id: "rpt-004",
        name: "Inactive Users",
        generated: "2025-12-08 16:45",
        by: "Anders Dramstad",
        range: "All time",
        format: "CSV",
        size: "89 KB",
        type: "inactive",
      },
      {
        id: "rpt-005",
        name: "Guest Users",
        generated: "2025-12-07 11:20",
        by: "Lene Kaada",
        range: "Last 90 days",
        format: "Excel",
        size: "67 KB",
        type: "guests",
      },
    ];
  },

  renderReportHistory() {
    const tbody = document.getElementById("reportHistoryBody");
    if (!tbody) return;

    // Filter and search
    let filtered = this.reportHistory.filter((h) => {
      const matchesFilter =
        this.historyFilter === "all" ||
        h.format.toLowerCase() === this.historyFilter;
      const matchesSearch =
        !this.historySearch ||
        h.name.toLowerCase().includes(this.historySearch) ||
        h.by.toLowerCase().includes(this.historySearch) ||
        h.range.toLowerCase().includes(this.historySearch);
      return matchesFilter && matchesSearch;
    });

    // Update count
    const countEl = document.getElementById("historyResultCount");
    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${this.reportHistory.length} reports`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-cell">
            <div class="empty-state">
              <span class="empty-icon">📋</span>
              <p>No reports found</p>
              ${
                this.historySearch || this.historyFilter !== "all"
                  ? '<button class="btn btn-secondary btn-sm" onclick="ReportsPage.clearHistoryFilters()">Clear Filters</button>'
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (h) => `
      <tr data-report-id="${h.id}">
        <td>
          <div class="report-name-cell">
            <span class="report-type-icon">${this.getReportIcon(h.type)}</span>
            <span>${h.name}</span>
          </div>
        </td>
        <td>${this.formatReportDate(h.generated)}</td>
        <td>${h.by}</td>
        <td><span class="date-range-badge">${h.range}</span></td>
        <td><span class="badge badge-${h.format.toLowerCase()}">${
          h.format
        }</span></td>
        <td>${h.size}</td>
        <td>
          <button class="action-btn" title="Download" onclick="ReportsPage.downloadHistoryReport('${
            h.id
          }')">📥</button>
          <button class="action-btn" title="Re-generate" onclick="ReportsPage.regenerateReport('${
            h.type
          }')">🔄</button>
          <button class="action-btn" title="Email" onclick="ReportsPage.emailReport('${
            h.id
          }')">📧</button>
          <button class="action-btn action-delete" title="Delete" onclick="ReportsPage.deleteHistoryReport('${
            h.id
          }')">🗑️</button>
        </td>
      </tr>
    `
      )
      .join("");
  },

  getReportIcon(type) {
    const icons = {
      users: "👥",
      licenses: "📜",
      security: "🔒",
      signins: "🌍",
      inactive: "⏸️",
      guests: "🌐",
    };
    return icons[type] || "📊";
  },

  formatReportDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  },

  clearHistoryFilters() {
    this.historySearch = "";
    this.historyFilter = "all";
    document.getElementById("historySearch").value = "";
    document
      .querySelectorAll(".history-toolbar .filter-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector('.history-toolbar .filter-btn[data-filter="all"]')
      ?.classList.add("active");
    this.renderReportHistory();
  },

  downloadHistoryReport(reportId) {
    const report = this.reportHistory.find((r) => r.id === reportId);
    if (report) {
      // In real implementation, this would download the actual file
      alert(
        `Downloading: ${report.name}.${report.format.toLowerCase()}\nSize: ${
          report.size
        }`
      );
    }
  },

  regenerateReport(type) {
    this.generateReport(type);
  },

  emailReport(reportId) {
    const report = this.reportHistory.find((r) => r.id === reportId);
    if (report) {
      const recipients =
        document.getElementById("defaultRecipients")?.value || "";
      const email = prompt("Send report to:", recipients);
      if (email) {
        alert(`Report "${report.name}" would be emailed to: ${email}`);
      }
    }
  },

  deleteHistoryReport(reportId) {
    if (confirm("Delete this report from history?")) {
      this.reportHistory = this.reportHistory.filter((r) => r.id !== reportId);
      localStorage.setItem(
        "atea-idlm-report-history",
        JSON.stringify(this.reportHistory)
      );
      this.renderReportHistory();
    }
  },

  clearHistory() {
    if (confirm("Clear all report history? This cannot be undone.")) {
      this.reportHistory = [];
      localStorage.setItem(
        "atea-idlm-report-history",
        JSON.stringify(this.reportHistory)
      );
      this.renderReportHistory();
    }
  },

  /**
   * Add report to history
   */
  addToHistory(name, type, format, size) {
    const newReport = {
      id: "rpt-" + Date.now(),
      name,
      generated: new Date().toISOString().replace("T", " ").substring(0, 16),
      by:
        typeof MSALAuth !== "undefined" && MSALAuth.account
          ? MSALAuth.account.name
          : "Current User",
      range: this.dateRange.start
        ? `${this.dateRange.start} to ${this.dateRange.end}`
        : "Current",
      format,
      size,
      type,
    };
    this.reportHistory.unshift(newReport);
    // Keep only last 50 reports
    if (this.reportHistory.length > 50) {
      this.reportHistory = this.reportHistory.slice(0, 50);
    }
    localStorage.setItem(
      "atea-idlm-report-history",
      JSON.stringify(this.reportHistory)
    );
    this.renderReportHistory();
  },

  generateReport(type) {
    const reportTypes = {
      users: "User Summary Report",
      licenses: "License Report",
      security: "Security Report",
      signins: "Sign-in Report",
      inactive: "Inactive Users Report",
      guests: "Guest Users Report",
    };

    const title = reportTypes[type] || "Report";
    this.showReportPreview(type, title);
  },

  showReportPreview(type, title) {
    const modal = document.getElementById("reportPreviewModal");
    const titleEl = document.getElementById("reportPreviewTitle");
    const contentEl = document.getElementById("reportPreviewContent");

    if (!modal || !contentEl) return;

    titleEl.textContent = title;
    contentEl.innerHTML = this.getReportPreviewContent(type);
    modal.style.display = "flex";
  },

  getReportPreviewContent(type) {
    const data = App.data || {};

    switch (type) {
      case "users":
        return `
          <div class="report-preview">
            <div class="report-summary">
              <h4>Summary</h4>
              <div class="summary-grid">
                <div class="summary-item"><strong>Total Users:</strong> ${
                  data.users?.total || 1670
                }</div>
                <div class="summary-item"><strong>Members:</strong> ${
                  data.users?.members || 1247
                }</div>
                <div class="summary-item"><strong>Guests:</strong> ${
                  data.users?.guests || 423
                }</div>
                <div class="summary-item"><strong>Active:</strong> ${
                  data.users?.active || 1389
                }</div>
                <div class="summary-item"><strong>Inactive:</strong> ${
                  data.users?.inactive || 198
                }</div>
                <div class="summary-item"><strong>Disabled:</strong> ${
                  data.users?.disabled || 83
                }</div>
              </div>
            </div>
            <div class="report-note">
              <p>📄 Full report will include detailed user list with all attributes.</p>
            </div>
          </div>
        `;
      case "licenses":
        return `
          <div class="report-preview">
            <div class="report-summary">
              <h4>Summary</h4>
              <div class="summary-grid">
                <div class="summary-item"><strong>Monthly Cost:</strong> ${
                  typeof LocaleUtils !== "undefined"
                    ? LocaleUtils.formatCurrency(
                        data.licenses?.totalCost || 502350
                      )
                    : new Intl.NumberFormat(
                        Config?.ui?.currency === "NOK" ? "nb-NO" : "en-US",
                        {
                          style: "currency",
                          currency: Config?.ui?.currency || "NOK",
                          minimumFractionDigits: 0,
                        }
                      ).format(data.licenses?.totalCost || 502350)
                }</div>
                <div class="summary-item"><strong>Potential Savings:</strong> ${
                  typeof LocaleUtils !== "undefined"
                    ? LocaleUtils.formatCurrency(
                        data.licenses?.potentialSavings || 90574
                      )
                    : new Intl.NumberFormat(
                        Config?.ui?.currency === "NOK" ? "nb-NO" : "en-US",
                        {
                          style: "currency",
                          currency: Config?.ui?.currency || "NOK",
                          minimumFractionDigits: 0,
                        }
                      ).format(data.licenses?.potentialSavings || 90574)
                }</div>
                <div class="summary-item"><strong>Unassigned:</strong> ${
                  data.licenses?.unassigned || 45
                }</div>
                <div class="summary-item"><strong>Inactive Assigned:</strong> ${
                  data.licenses?.inactive || 67
                }</div>
              </div>
            </div>
          </div>
        `;
      default:
        return `<div class="report-preview"><p>Report preview loading...</p></div>`;
    }
  },

  closeModal() {
    const modal = document.getElementById("reportPreviewModal");
    if (modal) modal.style.display = "none";
  },

  exportReport(type, format) {
    const data = App.data || {};

    // Get actual data based on report type
    let exportData = [];
    let filename = `${type}-report-${new Date().toISOString().split("T")[0]}`;

    switch (type) {
      case "users":
        exportData = (data.users || []).map((u) => ({
          "Display Name": u.displayName || "",
          Email: u.userPrincipalName || u.mail || "",
          Type: u.userType || "Member",
          Status: u.accountEnabled === false ? "Disabled" : "Active",
          "Last Sign-in":
            u.signInActivity?.lastSignInDateTime || u.lastSignIn || "Never",
          MFA: u.mfaEnabled ? "Enabled" : "Not Configured",
        }));
        break;
      case "licenses":
        exportData = (data.licenses || []).map((l) => ({
          "License Name": l.skuPartNumber || l.name || "",
          Purchased: l.prepaidUnits?.enabled || l.count || 0,
          Assigned: l.consumedUnits || l.utilized || 0,
          Available: (l.prepaidUnits?.enabled || 0) - (l.consumedUnits || 0),
          "Monthly Cost": l.cost ? LocaleUtils.formatCurrency(l.cost) : "N/A",
        }));
        break;
      case "security":
        // Security posture data
        const mfaStats = data.mfaStats || {};
        const adminUsers = data.adminUsers || [];
        exportData = [
          {
            Category: "MFA",
            Metric: "Users with MFA",
            Value: mfaStats.mfaEnabled || 0,
          },
          {
            Category: "MFA",
            Metric: "Users without MFA",
            Value: mfaStats.mfaMissing || 0,
          },
          {
            Category: "Privileged Access",
            Metric: "Admin Users",
            Value: adminUsers.length,
          },
        ];
        break;
      case "signins":
        exportData = (data.signInLogs || []).slice(0, 1000).map((s) => ({
          User: s.userDisplayName || s.userPrincipalName || "",
          "Sign-in Time": s.createdDateTime || "",
          Status: s.status?.errorCode === 0 ? "Success" : "Failed",
          Location: s.location?.city
            ? `${s.location.city}, ${s.location.countryOrRegion}`
            : "",
          "IP Address": s.ipAddress || "",
          Application: s.appDisplayName || "",
        }));
        break;
      case "inactive":
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        exportData = (data.users || [])
          .filter((u) => {
            const lastSignIn = u.signInActivity?.lastSignInDateTime;
            if (!lastSignIn) return true;
            return new Date(lastSignIn) < thirtyDaysAgo;
          })
          .map((u) => ({
            "Display Name": u.displayName || "",
            Email: u.userPrincipalName || "",
            "Last Sign-in": u.signInActivity?.lastSignInDateTime || "Never",
            "Account Status": u.accountEnabled ? "Enabled" : "Disabled",
          }));
        break;
      case "guests":
        exportData = (data.users || [])
          .filter((u) => u.userType === "Guest")
          .map((u) => ({
            "Display Name": u.displayName || "",
            Email: u.userPrincipalName || u.mail || "",
            "Created Date": u.createdDateTime || "",
            "Last Sign-in": u.signInActivity?.lastSignInDateTime || "Never",
          }));
        break;
      default:
        exportData = [];
    }

    if (exportData.length === 0) {
      alert("No data available for this report.");
      return;
    }

    // Use ExportUtils if available
    if (typeof ExportUtils !== "undefined") {
      if (format === "excel" || format === "xlsx") {
        ExportUtils.toXLSX(exportData, filename, type);
      } else if (format === "pdf") {
        // Show dialog for format selection since PDF needs special handling
        ExportUtils.showExportDialog(
          exportData,
          filename,
          `Export ${type} Report`
        );
      } else {
        ExportUtils.toCSV(exportData, filename);
      }
    } else {
      // Fallback to simple CSV
      const keys = Object.keys(exportData[0]);
      let csv = keys.join(",") + "\n";
      exportData.forEach((row) => {
        csv +=
          keys
            .map((k) => `"${String(row[k] || "").replace(/"/g, '""')}"`)
            .join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  },

  showReportWizard() {
    alert("Report Wizard - Select report type and configure options");
  },

  addSchedule() {
    alert("Add Schedule - Configure scheduled report delivery");
  },

  saveEmailSettings() {
    const recipients = document.getElementById("defaultRecipients").value;
    const prefix = document.getElementById("emailPrefix").value;
    const includeSummary = document.getElementById("includeSummary").checked;

    localStorage.setItem(
      "atea-idlm-email-settings",
      JSON.stringify({
        recipients,
        prefix,
        includeSummary,
      })
    );

    alert("Email settings saved!");
  },
};
