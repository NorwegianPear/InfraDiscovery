/**
 * PDF Export Utility
 * Generates PDF reports using browser's print functionality
 * with custom PDF-friendly styling
 */

const PDFExport = {
  /**
   * Default export options
   */
  defaultOptions: {
    title: "Atea Identity & License Portal Report",
    subtitle: "",
    includeTimestamp: true,
    includeLogo: true,
    pageOrientation: "portrait", // 'portrait' or 'landscape'
    pageSize: "A4",
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  },

  /**
   * Generate PDF-ready HTML document
   * @param {string} content - Main content HTML
   * @param {Object} options - Export options
   * @returns {string} Complete HTML document
   */
  generatePrintableHTML(content, options = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const timestamp = opts.includeTimestamp
      ? new Date().toLocaleString("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        })
      : "";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${opts.title}</title>
    <style>
        /* PDF Export Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: ${opts.pageSize} ${opts.pageOrientation};
            margin: ${opts.margins.top}mm ${opts.margins.right}mm ${
      opts.margins.bottom
    }mm ${opts.margins.left}mm;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #1e293b;
            background: white;
        }

        /* Header */
        .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 15px;
            margin-bottom: 20px;
            border-bottom: 2px solid #0066b3;
        }

        .pdf-header-left {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .pdf-logo {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #0066b3 0%, #00a0e3 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }

        .pdf-title {
            font-size: 18pt;
            font-weight: 600;
            color: #0066b3;
        }

        .pdf-subtitle {
            font-size: 11pt;
            color: #64748b;
            margin-top: 2px;
        }

        .pdf-timestamp {
            font-size: 9pt;
            color: #64748b;
            text-align: right;
        }

        /* Content sections */
        .pdf-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }

        .pdf-section-title {
            font-size: 14pt;
            font-weight: 600;
            color: #0066b3;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
        }

        /* Tables */
        .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 10pt;
        }

        .pdf-table th {
            background-color: #f8fafc;
            color: #334155;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            border-bottom: 2px solid #e2e8f0;
        }

        .pdf-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }

        .pdf-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        /* Stats grid */
        .pdf-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }

        .pdf-stat-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #0066b3;
        }

        .pdf-stat-value {
            font-size: 20pt;
            font-weight: 700;
            color: #0066b3;
        }

        .pdf-stat-label {
            font-size: 9pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Status badges */
        .pdf-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 9pt;
            font-weight: 500;
        }

        .pdf-badge-success {
            background-color: rgba(16, 185, 129, 0.15);
            color: #059669;
        }

        .pdf-badge-warning {
            background-color: rgba(245, 158, 11, 0.15);
            color: #d97706;
        }

        .pdf-badge-danger {
            background-color: rgba(239, 68, 68, 0.15);
            color: #dc2626;
        }

        .pdf-badge-info {
            background-color: rgba(59, 130, 246, 0.15);
            color: #2563eb;
        }

        /* Charts placeholder */
        .pdf-chart-placeholder {
            background: #f8fafc;
            border: 1px dashed #e2e8f0;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #64748b;
        }

        /* Progress bars */
        .pdf-progress {
            background: #e2e8f0;
            border-radius: 4px;
            height: 8px;
            overflow: hidden;
        }

        .pdf-progress-bar {
            height: 100%;
            border-radius: 4px;
        }

        .pdf-progress-bar-blue { background: #0066b3; }
        .pdf-progress-bar-green { background: #10b981; }
        .pdf-progress-bar-yellow { background: #f59e0b; }
        .pdf-progress-bar-red { background: #ef4444; }

        /* Footer */
        .pdf-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            font-size: 9pt;
            color: #64748b;
            text-align: center;
        }

        /* Page breaks */
        .page-break {
            page-break-after: always;
        }

        .no-break {
            page-break-inside: avoid;
        }

        /* Print-specific */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="pdf-header">
        <div class="pdf-header-left">
            ${opts.includeLogo ? '<div class="pdf-logo">A</div>' : ""}
            <div>
                <div class="pdf-title">${opts.title}</div>
                ${
                  opts.subtitle
                    ? `<div class="pdf-subtitle">${opts.subtitle}</div>`
                    : ""
                }
            </div>
        </div>
        ${
          timestamp
            ? `<div class="pdf-timestamp">Generated: ${timestamp}</div>`
            : ""
        }
    </div>

    <div class="pdf-content">
        ${content}
    </div>

    <div class="pdf-footer">
        Atea Identity & License Management Portal • Confidential
    </div>
</body>
</html>`;
  },

  /**
   * Export users data to PDF
   * @param {Array} users - Array of user objects
   * @param {Object} options - Export options
   */
  async exportUsers(users, options = {}) {
    const opts = {
      ...options,
      title: options.title || "User Directory Report",
      subtitle: options.subtitle || `${users.length} users`,
    };

    // Generate stats summary
    const activeUsers = users.filter((u) => u.accountEnabled !== false).length;
    const mfaEnabled = users.filter((u) => u.mfaRegistered).length;
    const guestUsers = users.filter((u) => u.userType === "Guest").length;

    const statsHtml = `
            <div class="pdf-stats-grid">
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${users.length}</div>
                    <div class="pdf-stat-label">Total Users</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${activeUsers}</div>
                    <div class="pdf-stat-label">Active Users</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${mfaEnabled}</div>
                    <div class="pdf-stat-label">MFA Enabled</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${guestUsers}</div>
                    <div class="pdf-stat-label">Guest Users</div>
                </div>
            </div>
        `;

    // Generate users table
    const tableHtml = `
            <div class="pdf-section">
                <h2 class="pdf-section-title">User Details</h2>
                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th>Display Name</th>
                            <th>Email</th>
                            <th>User Type</th>
                            <th>Status</th>
                            <th>MFA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users
                          .map(
                            (user) => `
                            <tr>
                                <td>${user.displayName || "N/A"}</td>
                                <td>${
                                  user.mail || user.userPrincipalName || "N/A"
                                }</td>
                                <td>${user.userType || "Member"}</td>
                                <td>
                                    <span class="pdf-badge ${
                                      user.accountEnabled !== false
                                        ? "pdf-badge-success"
                                        : "pdf-badge-danger"
                                    }">
                                        ${
                                          user.accountEnabled !== false
                                            ? "Active"
                                            : "Disabled"
                                        }
                                    </span>
                                </td>
                                <td>
                                    <span class="pdf-badge ${
                                      user.mfaRegistered
                                        ? "pdf-badge-success"
                                        : "pdf-badge-warning"
                                    }">
                                        ${
                                          user.mfaRegistered
                                            ? "Enabled"
                                            : "Disabled"
                                        }
                                    </span>
                                </td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    const content = statsHtml + tableHtml;
    await this.print(content, opts);
  },

  /**
   * Export licenses data to PDF
   * @param {Array} licenses - Array of license objects
   * @param {Object} options - Export options
   */
  async exportLicenses(licenses, options = {}) {
    const opts = {
      ...options,
      title: options.title || "License Usage Report",
      subtitle: options.subtitle || `${licenses.length} licenses`,
    };

    // Calculate totals
    const totalConsumed = licenses.reduce(
      (sum, l) => sum + (l.consumedUnits || 0),
      0
    );
    const totalPrepaid = licenses.reduce(
      (sum, l) => sum + (l.prepaidUnits?.enabled || 0),
      0
    );
    const utilizationRate =
      totalPrepaid > 0 ? ((totalConsumed / totalPrepaid) * 100).toFixed(1) : 0;

    const statsHtml = `
            <div class="pdf-stats-grid">
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${licenses.length}</div>
                    <div class="pdf-stat-label">License Types</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${totalConsumed.toLocaleString()}</div>
                    <div class="pdf-stat-label">Assigned Licenses</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${totalPrepaid.toLocaleString()}</div>
                    <div class="pdf-stat-label">Available Licenses</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${utilizationRate}%</div>
                    <div class="pdf-stat-label">Utilization Rate</div>
                </div>
            </div>
        `;

    // Generate licenses table
    const tableHtml = `
            <div class="pdf-section">
                <h2 class="pdf-section-title">License Details</h2>
                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th>License Name</th>
                            <th>Assigned</th>
                            <th>Available</th>
                            <th>Utilization</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${licenses
                          .map((license) => {
                            const assigned = license.consumedUnits || 0;
                            const total = license.prepaidUnits?.enabled || 0;
                            const available = total - assigned;
                            const utilization =
                              total > 0
                                ? ((assigned / total) * 100).toFixed(1)
                                : 0;
                            const utilizationClass =
                              utilization > 90
                                ? "pdf-badge-danger"
                                : utilization > 70
                                ? "pdf-badge-warning"
                                : "pdf-badge-success";

                            return `
                                <tr>
                                    <td>${
                                      license.skuPartNumber ||
                                      license.displayName ||
                                      "Unknown"
                                    }</td>
                                    <td>${assigned.toLocaleString()}</td>
                                    <td>${available.toLocaleString()}</td>
                                    <td>
                                        <span class="pdf-badge ${utilizationClass}">${utilization}%</span>
                                    </td>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;

    const content = statsHtml + tableHtml;
    await this.print(content, opts);
  },

  /**
   * Export security report to PDF
   * @param {Object} securityData - Security data object
   * @param {Object} options - Export options
   */
  async exportSecurity(securityData, options = {}) {
    const opts = {
      ...options,
      title: options.title || "Security Assessment Report",
      subtitle: options.subtitle || "Identity Security Overview",
    };

    const { alerts = [], riskyUsers = [], score = 0 } = securityData;

    // Security score visualization
    const scoreClass =
      score >= 70
        ? "pdf-badge-success"
        : score >= 50
        ? "pdf-badge-warning"
        : "pdf-badge-danger";

    const statsHtml = `
            <div class="pdf-stats-grid">
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${score}%</div>
                    <div class="pdf-stat-label">Security Score</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${alerts.length}</div>
                    <div class="pdf-stat-label">Active Alerts</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${riskyUsers.length}</div>
                    <div class="pdf-stat-label">Risky Users</div>
                </div>
                <div class="pdf-stat-card">
                    <div class="pdf-stat-value">${
                      alerts.filter((a) => a.severity === "high").length
                    }</div>
                    <div class="pdf-stat-label">High Severity</div>
                </div>
            </div>
        `;

    // Alerts table
    let alertsHtml = "";
    if (alerts.length > 0) {
      alertsHtml = `
                <div class="pdf-section">
                    <h2 class="pdf-section-title">Security Alerts</h2>
                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th>Alert</th>
                                <th>Severity</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alerts
                              .map((alert) => {
                                const severityClass =
                                  alert.severity === "high"
                                    ? "pdf-badge-danger"
                                    : alert.severity === "medium"
                                    ? "pdf-badge-warning"
                                    : "pdf-badge-info";
                                return `
                                    <tr>
                                        <td>${
                                          alert.title ||
                                          alert.alertType ||
                                          "Unknown Alert"
                                        }</td>
                                        <td><span class="pdf-badge ${severityClass}">${
                                  alert.severity || "unknown"
                                }</span></td>
                                        <td>${alert.status || "Active"}</td>
                                        <td>${
                                          alert.createdDateTime
                                            ? new Date(
                                                alert.createdDateTime
                                              ).toLocaleDateString()
                                            : "N/A"
                                        }</td>
                                    </tr>
                                `;
                              })
                              .join("")}
                        </tbody>
                    </table>
                </div>
            `;
    }

    // Risky users table
    let riskyUsersHtml = "";
    if (riskyUsers.length > 0) {
      riskyUsersHtml = `
                <div class="pdf-section">
                    <h2 class="pdf-section-title">Risky Users</h2>
                    <table class="pdf-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Risk Level</th>
                                <th>Risk State</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${riskyUsers
                              .map((user) => {
                                const riskClass =
                                  user.riskLevel === "high"
                                    ? "pdf-badge-danger"
                                    : user.riskLevel === "medium"
                                    ? "pdf-badge-warning"
                                    : "pdf-badge-info";
                                return `
                                    <tr>
                                        <td>${
                                          user.userDisplayName ||
                                          user.userPrincipalName ||
                                          "Unknown"
                                        }</td>
                                        <td><span class="pdf-badge ${riskClass}">${
                                  user.riskLevel || "unknown"
                                }</span></td>
                                        <td>${user.riskState || "Active"}</td>
                                        <td>${
                                          user.riskLastUpdatedDateTime
                                            ? new Date(
                                                user.riskLastUpdatedDateTime
                                              ).toLocaleDateString()
                                            : "N/A"
                                        }</td>
                                    </tr>
                                `;
                              })
                              .join("")}
                        </tbody>
                    </table>
                </div>
            `;
    }

    const content = statsHtml + alertsHtml + riskyUsersHtml;
    await this.print(content, opts);
  },

  /**
   * Export custom report to PDF
   * @param {string} content - HTML content
   * @param {Object} options - Export options
   */
  async exportCustom(content, options = {}) {
    await this.print(content, options);
  },

  /**
   * Print/save the PDF
   * @param {string} content - HTML content
   * @param {Object} options - Export options
   */
  async print(content, options = {}) {
    const html = this.generatePrintableHTML(content, options);

    // Create a new window for printing
    const printWindow = window.open("", "_blank", "width=800,height=600");

    if (!printWindow) {
      Toast.error("Please allow popups to export PDF");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load
    await new Promise((resolve) => {
      printWindow.onload = resolve;
      setTimeout(resolve, 500); // Fallback timeout
    });

    // Trigger print dialog
    printWindow.print();

    // Close window after print (or cancel)
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  },

  /**
   * Quick export current page content
   * @param {string} pageId - Page identifier
   */
  async exportCurrentPage(pageId) {
    const pageConfigs = {
      dashboard: {
        title: "Dashboard Overview",
        getData: () => this.captureDashboardData(),
      },
      users: {
        title: "User Directory Report",
        getData: () => window.UsersPage?.users || [],
      },
      licenses: {
        title: "License Usage Report",
        getData: () => window.LicensesPage?.licenses || [],
      },
      security: {
        title: "Security Assessment Report",
        getData: () => window.SecurityPage?.securityData || {},
      },
    };

    const config = pageConfigs[pageId];
    if (!config) {
      Toast.warning("Export not available for this page");
      return;
    }

    Toast.loading("Generating PDF report...");

    try {
      const data = await config.getData();

      switch (pageId) {
        case "users":
          await this.exportUsers(data, { title: config.title });
          break;
        case "licenses":
          await this.exportLicenses(data, { title: config.title });
          break;
        case "security":
          await this.exportSecurity(data, { title: config.title });
          break;
        default:
          // Generic export
          const content =
            document.querySelector(".content-area")?.innerHTML || "";
          await this.exportCustom(content, { title: config.title });
      }

      Toast.success("PDF generated successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      Toast.error("Failed to generate PDF");
    }
  },

  /**
   * Capture dashboard data for export
   */
  captureDashboardData() {
    // Collect visible stats from dashboard cards
    const cards = document.querySelectorAll(".stat-card");
    const stats = [];

    cards.forEach((card) => {
      const value = card.querySelector(".stat-value")?.textContent;
      const label = card.querySelector(".stat-label")?.textContent;
      if (value && label) {
        stats.push({ value, label });
      }
    });

    return stats;
  },
};

// Make available globally
window.PDFExport = PDFExport;
