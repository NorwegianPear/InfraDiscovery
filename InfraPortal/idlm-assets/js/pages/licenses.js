/**
 * Licenses Page - License Inventory & Cost Optimization
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const LicensesPage = {
  licenses: [],
  assignments: [],

  /**
   * Render the licenses page
   */
  render() {
    return `
      <section class="page-section">
        <div class="page-toolbar">
          <div class="toolbar-left">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="licenseSearch" placeholder="Search licenses..." class="search-input">
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-secondary" id="exportLicensesBtn">
              <span class="btn-icon">📥</span> Export Report
            </button>
            <button class="btn btn-primary" id="refreshLicensesBtn">
              <span class="btn-icon">🔄</span> Refresh
            </button>
          </div>
        </div>

        <!-- Cost Overview Cards -->
        <div class="cost-overview">
          <div class="cost-card primary">
            <div class="cost-icon">💰</div>
            <div class="cost-info">
              <span class="cost-label">Monthly Cost</span>
              <span class="cost-value" id="totalMonthlyCost">--</span>
            </div>
          </div>
          <div class="cost-card success">
            <div class="cost-icon">💵</div>
            <div class="cost-info">
              <span class="cost-label">Potential Savings</span>
              <span class="cost-value" id="potentialSavings">--</span>
            </div>
          </div>
          <div class="cost-card warning">
            <div class="cost-icon">📊</div>
            <div class="cost-info">
              <span class="cost-label">Utilization Rate</span>
              <span class="cost-value" id="utilizationRate">--%</span>
            </div>
          </div>
          <div class="cost-card info">
            <div class="cost-icon">📜</div>
            <div class="cost-info">
              <span class="cost-label">Total Licenses</span>
              <span class="cost-value" id="totalLicenses">--</span>
            </div>
          </div>
        </div>

        <!-- Optimization Recommendations -->
        <div class="recommendations-section">
          <h3 class="section-title">💡 Optimization Recommendations</h3>
          <div class="recommendations-grid" id="recommendationsGrid">
            <div class="loading-spinner"></div>
          </div>
        </div>

        <!-- License Inventory Table -->
        <div class="license-inventory">
          <h3 class="section-title">📜 License Inventory</h3>
          <div class="data-table-container">
            <table class="data-table" id="licensesTable">
              <thead>
                <tr>
                  <th>License Name</th>
                  <th>SKU ID</th>
                  <th>Purchased</th>
                  <th>Assigned</th>
                  <th>Available</th>
                  <th>Utilization</th>
                  <th>Unit Cost</th>
                  <th>Monthly Cost</th>
                  <th>Waste</th>
                </tr>
              </thead>
              <tbody id="licensesTableBody">
                <tr>
                  <td colspan="9" class="loading-cell">
                    <div class="loading-spinner"></div>
                    <span>Loading licenses...</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- License Assignment Analysis -->
        <div class="assignment-analysis">
          <h3 class="section-title">📊 Assignment Analysis</h3>
          <div class="analysis-grid">
            <div class="analysis-card">
              <h4>Unassigned Licenses</h4>
              <div class="analysis-chart">
                <canvas id="unassignedChart"></canvas>
              </div>
              <div class="analysis-value" id="unassignedCount">-- licenses</div>
              <div class="analysis-cost">Wasted: <span id="unassignedCost">--</span>/month</div>
            </div>
            <div class="analysis-card">
              <h4>Assigned to Inactive Users</h4>
              <div class="analysis-chart">
                <canvas id="inactiveChart"></canvas>
              </div>
              <div class="analysis-value" id="inactiveCount">-- licenses</div>
              <div class="analysis-cost">Wasted: <span id="inactiveCost">--</span>/month</div>
              <div class="analysis-action" id="inactiveAction"></div>
            </div>
            <div class="analysis-card">
              <h4>Assigned to Disabled Users</h4>
              <div class="analysis-chart">
                <canvas id="disabledChart"></canvas>
              </div>
              <div class="analysis-value" id="disabledCount">-- licenses</div>
              <div class="analysis-cost">Wasted: <span id="disabledCost">--</span>/month</div>
              <div class="analysis-action" id="disabledAction"></div>
            </div>
          </div>
        </div>

        <!-- Cost Breakdown Chart -->
        <div class="cost-breakdown">
          <h3 class="section-title">📈 Cost Breakdown by License Type</h3>
          <div class="chart-container-large">
            <canvas id="costBreakdownChart"></canvas>
          </div>
        </div>

        <!-- License Comparison Tool -->
        <div class="license-comparison">
          <h3 class="section-title">🔄 License Comparison Tool</h3>
          <p class="section-description">Compare Microsoft 365 license tiers to understand what features you get, lose, or keep when upgrading or downgrading.</p>
          
          <div class="comparison-controls">
            <div class="comparison-select">
              <label for="currentLicense">Current License:</label>
              <select id="currentLicense" class="license-dropdown">
                <option value="">Select current license...</option>
                <option value="M365_BUSINESS_BASIC">Microsoft 365 Business Basic</option>
                <option value="M365_BUSINESS_STANDARD">Microsoft 365 Business Standard</option>
                <option value="M365_BUSINESS_PREMIUM">Microsoft 365 Business Premium</option>
                <option value="OFFICE_365_E1">Office 365 E1</option>
                <option value="OFFICE_365_E3">Office 365 E3</option>
                <option value="OFFICE_365_E5">Office 365 E5</option>
                <option value="M365_E3">Microsoft 365 E3</option>
                <option value="M365_E5">Microsoft 365 E5</option>
              </select>
            </div>
            <div class="comparison-arrow">→</div>
            <div class="comparison-select">
              <label for="targetLicense">Compare to:</label>
              <select id="targetLicense" class="license-dropdown">
                <option value="">Select target license...</option>
                <option value="M365_BUSINESS_BASIC">Microsoft 365 Business Basic</option>
                <option value="M365_BUSINESS_STANDARD">Microsoft 365 Business Standard</option>
                <option value="M365_BUSINESS_PREMIUM">Microsoft 365 Business Premium</option>
                <option value="OFFICE_365_E1">Office 365 E1</option>
                <option value="OFFICE_365_E3">Office 365 E3</option>
                <option value="OFFICE_365_E5">Office 365 E5</option>
                <option value="M365_E3">Microsoft 365 E3</option>
                <option value="M365_E5">Microsoft 365 E5</option>
              </select>
            </div>
            <button class="btn btn-primary" id="compareLicensesBtn">
              <span class="btn-icon">🔍</span> Compare
            </button>
          </div>

          <div id="comparisonResults" class="comparison-results hidden">
            <!-- Results will be rendered here -->
          </div>
        </div>
      </section>
    `;
  },

  /**
   * Initialize page after render
   */
  async init() {
    this.setupEventListeners();
    await this.loadLicenses();
    this.initCharts();
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const searchInput = document.getElementById("licenseSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.filterLicenses(e.target.value)
      );
    }

    const exportBtn = document.getElementById("exportLicensesBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportReport());
    }

    const refreshBtn = document.getElementById("refreshLicensesBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadLicenses());
    }

    // License comparison tool
    const compareBtn = document.getElementById("compareLicensesBtn");
    if (compareBtn) {
      compareBtn.addEventListener("click", () => {
        const currentLicense = document.getElementById("currentLicense").value;
        const targetLicense = document.getElementById("targetLicense").value;

        if (!currentLicense || !targetLicense) {
          if (typeof Toast !== "undefined") {
            Toast.warning(
              "Please select both a current license and a target license to compare."
            );
          } else {
            alert(
              "Please select both a current license and a target license to compare."
            );
          }
          return;
        }

        if (currentLicense === targetLicense) {
          if (typeof Toast !== "undefined") {
            Toast.warning("Please select two different licenses to compare.");
          } else {
            alert("Please select two different licenses to compare.");
          }
          return;
        }

        const results = this.compareLicenses(currentLicense, targetLicense);
        if (results) {
          this.renderComparisonResults(results);
        }
      });
    }
  },

  /**
   * Load licenses data with caching and skeleton loading
   */
  async loadLicenses() {
    const tbody = document.getElementById("licensesTableBody");

    // Show skeleton loading
    if (tbody && typeof SkeletonLoader !== "undefined") {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="padding: 0;">
            ${SkeletonLoader.tableRows(5, 9)}
          </td>
        </tr>
      `;
    }

    try {
      // Require real API - no mock data fallback
      if (App.useRealApi && (GraphAPI.accessToken || GraphAPI.useBackendApi)) {
        console.log("📡 Fetching licenses from Graph API...");
        this.licenses = await GraphAPI.getSubscribedSkus();
        console.log(`✅ Loaded ${this.licenses.length} licenses`);

        if (typeof Toast !== "undefined") {
          Toast.success(`Loaded ${this.licenses.length} licenses`);
        }
      } else {
        // Show message that authentication is required
        console.log("⚠️ Authentication required to load license data");
        console.log("  App.useRealApi:", App.useRealApi);
        console.log(
          "  GraphAPI.accessToken:",
          GraphAPI.accessToken ? "present" : "missing"
        );
        document.getElementById("licensesTableBody").innerHTML = `
          <tr>
            <td colspan="9" class="loading-cell">
              <span>🔐 Please sign in to view license data</span>
            </td>
          </tr>
        `;
        document.getElementById("totalLicenses").textContent = "0";
        return;
      }

      this.updateCostOverview();
      this.updateRecommendations();
      this.renderTable();
      this.updateAnalysis();
      this.updateCharts();
    } catch (error) {
      console.error("Failed to load licenses:", error);

      if (typeof Toast !== "undefined") {
        Toast.error("Failed to load licenses: " + error.message);
      }

      document.getElementById("licensesTableBody").innerHTML = `
        <tr>
          <td colspan="9" class="loading-cell">
            <span>❌ Error loading licenses: ${error.message}</span>
          </td>
        </tr>
      `;
      document.getElementById("totalLicenses").textContent = "Error";
    }
  },

  /**
   * Update cost overview cards
   */
  updateCostOverview() {
    // Only calculate costs for licenses with known prices AND non-zero cost
    // Free licenses should not affect cost calculations
    const paidLicenses = this.licenses.filter(
      (l) => !l.isUnknownPrice && l.unitCost > 0
    );
    const freeLicenses = this.licenses.filter((l) => l.unitCost === 0);
    const unknownLicenses = this.licenses.filter((l) => l.isUnknownPrice);

    const totalCost = paidLicenses.reduce(
      (sum, l) => sum + l.purchased * l.unitCost,
      0
    );

    // Calculate utilization only for paid licenses (free licenses skew the numbers)
    const paidUtilized = paidLicenses.reduce((sum, l) => sum + l.assigned, 0);
    const paidTotal = paidLicenses.reduce((sum, l) => sum + l.purchased, 0);
    const utilization =
      paidTotal > 0 ? Math.round((paidUtilized / paidTotal) * 100) : 0;

    // Waste is unused paid licenses only
    const waste = paidLicenses.reduce(
      (sum, l) => sum + (l.purchased - l.assigned) * l.unitCost,
      0
    );

    // Total licenses count includes all
    const totalAll = this.licenses.reduce((sum, l) => sum + l.purchased, 0);

    // Show cost with warning if some prices are unknown
    const costElement = document.getElementById("totalMonthlyCost");
    if (unknownLicenses.length > 0) {
      costElement.innerHTML = `${this.formatCurrency(
        totalCost
      )} <span class="unknown-price" title="${
        unknownLicenses.length
      } license(s) have unknown prices">*</span>`;
    } else {
      costElement.textContent = this.formatCurrency(totalCost);
    }

    document.getElementById("potentialSavings").textContent =
      this.formatCurrency(waste);
    document.getElementById("utilizationRate").textContent = `${utilization}%`;
    // Show paid license count, with total in parentheses if there are free licenses
    if (freeLicenses.length > 0) {
      document.getElementById(
        "totalLicenses"
      ).innerHTML = `${paidTotal.toLocaleString()} <span style="color: #64748b; font-size: 0.8em">(+${(
        totalAll - paidTotal
      ).toLocaleString()} free)</span>`;
    } else {
      document.getElementById("totalLicenses").textContent =
        totalAll.toLocaleString();
    }

    // Log details to console for debugging
    console.log(
      `📊 License Summary: ${paidLicenses.length} paid, ${freeLicenses.length} free, ${unknownLicenses.length} unknown`
    );
    console.log(
      `💰 Monthly Cost: ${this.formatCurrency(
        totalCost
      )}, Waste: ${this.formatCurrency(waste)}`
    );
    console.log(
      `📈 Utilization: ${paidUtilized}/${paidTotal} = ${utilization}%`
    );

    // Log unknown licenses to console for developer reference
    if (unknownLicenses.length > 0) {
      console.warn(
        `⚠️ ${unknownLicenses.length} license(s) have unknown prices. Add these SKUs to LICENSE_PRICES in graph-api.js:`
      );
      unknownLicenses.forEach((l) => {
        console.warn(
          `  - "${l.skuPartNumber}": 0, // ${l.name} - ${l.purchased} seats`
        );
      });
    }
  },

  /**
   * Update recommendations
   */
  updateRecommendations() {
    const recommendations = [];

    // Check for unused licenses
    const unused = this.licenses.filter((l) => l.purchased - l.assigned > 10);
    if (unused.length > 0) {
      const savings = unused.reduce(
        (sum, l) => sum + (l.purchased - l.assigned) * l.unitCost,
        0
      );
      recommendations.push({
        type: "warning",
        icon: "⚠️",
        title: "Reduce Unused Licenses",
        description: `${unused.length} license types have significant unused capacity`,
        action: `Potential savings: ${this.formatCurrency(savings)}/month`,
        priority: "high",
      });
    }

    // Check for E5 to E3 downgrade opportunities
    const e5 = this.licenses.find((l) => l.name.includes("E5"));
    if (e5 && e5.assigned > 0) {
      recommendations.push({
        type: "info",
        icon: "💡",
        title: "Review E5 License Usage",
        description: "Some E5 users may only need E3 features",
        action: "Analyze feature usage to identify downgrade candidates",
        priority: "medium",
      });
    }

    // License consolidation
    recommendations.push({
      type: "success",
      icon: "🔄",
      title: "License Consolidation",
      description: "Consider bundle options for better pricing",
      action: "Review Microsoft 365 bundle pricing with your account manager",
      priority: "low",
    });

    const grid = document.getElementById("recommendationsGrid");
    if (grid) {
      grid.innerHTML = recommendations
        .map(
          (r) => `
        <div class="recommendation-card ${r.type}">
          <div class="rec-header">
            <span class="rec-icon">${r.icon}</span>
            <span class="rec-priority priority-${r.priority}">${r.priority}</span>
          </div>
          <h4 class="rec-title">${r.title}</h4>
          <p class="rec-description">${r.description}</p>
          <p class="rec-action">${r.action}</p>
        </div>
      `
        )
        .join("");
    }
  },

  /**
   * Render licenses table
   */
  renderTable() {
    const tbody = document.getElementById("licensesTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.licenses
      .map((license) => {
        const available = license.purchased - license.assigned;
        const utilization =
          license.purchased > 0
            ? Math.round((license.assigned / license.purchased) * 100)
            : 0;
        const monthlyCost = license.purchased * license.unitCost;
        const waste = available * license.unitCost;

        // Show price with unknown indicator if price not in database
        const priceDisplay = license.isUnknownPrice
          ? `<span class="unknown-price" title="Price not in database - please add SKU: ${license.skuPartNumber}">⚠️ Unknown</span>`
          : this.formatCurrency(license.unitCost);
        const costDisplay = license.isUnknownPrice
          ? `<span class="unknown-price" title="Cannot calculate - price unknown">--</span>`
          : this.formatCurrency(monthlyCost);
        const wasteDisplay = license.isUnknownPrice
          ? `<span class="unknown-price" title="Cannot calculate - price unknown">--</span>`
          : this.formatCurrency(waste);

        return `
        <tr class="${license.isUnknownPrice ? "unknown-license" : ""}">
          <td>
            <div class="license-name">
              <span class="license-icon">📜</span>
              ${license.name}
              ${
                license.isUnknownPrice
                  ? `<span class="badge badge-warning" title="SKU: ${license.skuPartNumber}">⚠️ Price Missing</span>`
                  : ""
              }
            </div>
          </td>
          <td><code>${license.skuId}</code></td>
          <td>${license.purchased}</td>
          <td>${license.assigned}</td>
          <td class="${available > 0 ? "warning" : ""}">${available}</td>
          <td>
            <div class="utilization-bar">
              <div class="utilization-fill ${this.getUtilizationClass(
                utilization
              )}" style="width: ${utilization}%"></div>
              <span class="utilization-text">${utilization}%</span>
            </div>
          </td>
          <td>${priceDisplay}</td>
          <td>${costDisplay}</td>
          <td class="${
            waste > 0 && !license.isUnknownPrice ? "danger" : "success"
          }">${wasteDisplay}</td>
        </tr>
      `;
      })
      .join("");
  },

  /**
   * Update assignment analysis
   */
  updateAnalysis() {
    const data = App.data || {};
    const licenses = data.licenses || {};

    document.getElementById("unassignedCount").textContent = `${
      licenses.unassigned || 45
    } licenses`;
    document.getElementById("unassignedCost").textContent = this.formatCurrency(
      (licenses.unassigned || 45) * 30
    );

    document.getElementById("inactiveCount").textContent = `${
      licenses.inactive || 67
    } licenses`;
    document.getElementById("inactiveCost").textContent = this.formatCurrency(
      (licenses.inactive || 67) * 35
    );

    document.getElementById("disabledCount").textContent = `${
      licenses.disabled || 23
    } licenses`;
    document.getElementById("disabledCost").textContent = this.formatCurrency(
      (licenses.disabled || 23) * 40
    );

    // Add remediation action buttons for admins
    this.renderRemediationActions();
  },

  /**
   * Render remediation action buttons for license analysis (Admin only)
   */
  renderRemediationActions() {
    // Check permissions
    if (typeof RBAC === "undefined") return;

    const perms = RBAC.getUIPermissions();

    // Inactive users action
    const inactiveAction = document.getElementById("inactiveAction");
    if (inactiveAction && perms.canBulkRemoveLicenses) {
      inactiveAction.innerHTML = `
        <button class="btn btn-warning btn-sm" onclick="LicensesPage.reviewInactiveLicenses()">
          🔍 Review & Remove
        </button>
      `;
    }

    // Disabled users action
    const disabledAction = document.getElementById("disabledAction");
    if (disabledAction && perms.canBulkRemoveLicenses) {
      disabledAction.innerHTML = `
        <button class="btn btn-danger btn-sm" onclick="LicensesPage.reviewDisabledLicenses()">
          ❌ Remove Licenses
        </button>
      `;
    }
  },

  /**
   * Review licenses assigned to inactive users
   */
  async reviewInactiveLicenses() {
    if (typeof Remediation === "undefined") {
      if (typeof Toast !== "undefined") {
        Toast.warning("Remediation module not available");
      } else {
        alert("Remediation module not available");
      }
      return;
    }

    const confirmed = await Remediation.showConfirmDialog({
      title: "Review Inactive User Licenses",
      message:
        "This will show a list of licenses assigned to inactive users for review.",
      details: `
        <strong>What this does:</strong><br>
        • Fetches users who haven't signed in for 90+ days<br>
        • Shows their assigned licenses<br>
        • Allows you to remove licenses individually or in bulk<br><br>
        <em>This is currently a preview feature. Full implementation coming soon.</em>
      `,
      type: "info",
      confirmText: "View Inactive Users",
    });

    if (confirmed) {
      // Navigate to users page filtered by inactive
      window.location.hash = "#users?filter=inactive";
      Remediation.showNotification(
        "Navigate to Users page and filter by 'Inactive' to review",
        "info"
      );
    }
  },

  /**
   * Review licenses assigned to disabled users
   */
  async reviewDisabledLicenses() {
    if (typeof Remediation === "undefined") {
      if (typeof Toast !== "undefined") {
        Toast.warning("Remediation module not available");
      } else {
        alert("Remediation module not available");
      }
      return;
    }

    const confirmed = await Remediation.showConfirmDialog({
      title: "Remove Licenses from Disabled Users",
      message: "This will remove licenses from all disabled user accounts.",
      details: `
        <strong>Warning:</strong> This is a destructive action.<br><br>
        • All licenses will be removed from disabled users<br>
        • This action is logged in the audit trail<br>
        • Licenses can be reassigned later if needed<br><br>
        <em>This is currently a preview feature. Full implementation coming soon.</em>
      `,
      type: "danger",
      confirmText: "Remove All Licenses",
    });

    if (confirmed) {
      Remediation.showNotification(
        "Bulk license removal feature coming soon. Use Users page for individual actions.",
        "warning"
      );
    }
  },

  /**
   * Initialize charts
   */
  initCharts() {
    // Cost breakdown chart
    const ctx = document.getElementById("costBreakdownChart");
    if (ctx) {
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: this.licenses.map((l) => l.name),
          datasets: [
            {
              label: "Used Cost",
              data: this.licenses.map((l) => l.assigned * l.unitCost),
              backgroundColor: "#10b981",
            },
            {
              label: "Wasted Cost",
              data: this.licenses.map(
                (l) => (l.purchased - l.assigned) * l.unitCost
              ),
              backgroundColor: "#ef4444",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true },
            y: {
              stacked: true,
              ticks: {
                callback: (value) => LocaleUtils.formatCurrencyShort(value),
              },
            },
          },
          plugins: {
            legend: { position: "top" },
          },
        },
      });
    }
  },

  /**
   * Update charts with new data
   */
  updateCharts() {
    // Small donut charts for analysis cards
    ["unassigned", "inactive", "disabled"].forEach((type) => {
      const ctx = document.getElementById(`${type}Chart`);
      if (ctx && !ctx.chart) {
        const data = App.data?.licenses || {};
        const value =
          data[type] ||
          (type === "unassigned" ? 45 : type === "inactive" ? 67 : 23);
        const total = 100;

        ctx.chart = new Chart(ctx, {
          type: "doughnut",
          data: {
            datasets: [
              {
                data: [value, total - value],
                backgroundColor: ["#ef4444", "#e2e8f0"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: "70%",
            plugins: { legend: { display: false } },
          },
        });
      }
    });
  },

  /**
   * Filter licenses
   */
  filterLicenses(searchTerm) {
    const rows = document.querySelectorAll("#licensesTableBody tr");
    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchTerm.toLowerCase()) ? "" : "none";
    });
  },

  /**
   * Export report
   */
  exportReport(format = "csv") {
    // Support PDF export
    if (format === "pdf" && typeof PDFExport !== "undefined") {
      PDFExport.exportLicenses(this.licenses, {
        title: "License Usage Report",
        subtitle: `${this.licenses.length} license types`,
      });
      return;
    }

    // Prepare data for export
    const exportData = this.licenses.map((l) => {
      const available = l.purchased - l.assigned;
      const utilization =
        l.purchased > 0 ? Math.round((l.assigned / l.purchased) * 100) : 0;
      return {
        "License Name": l.name,
        "SKU ID": l.skuId || "",
        Purchased: l.purchased,
        Assigned: l.assigned,
        Available: available,
        "Utilization (%)": utilization,
        "Unit Cost ($)": l.unitCost || 0,
        "Monthly Cost ($)": (l.purchased || 0) * (l.unitCost || 0),
        "Waste ($)": available * (l.unitCost || 0),
      };
    });

    if (typeof ExportUtils !== "undefined") {
      ExportUtils.showExportDialog(
        exportData,
        `license-report-${new Date().toISOString().split("T")[0]}`,
        "Export License Report"
      );
      if (typeof Toast !== "undefined") {
        Toast.success("Export dialog opened");
      }
    } else {
      // Fallback to basic CSV
      const headers = Object.keys(exportData[0]);
      const rows = exportData.map((row) => headers.map((h) => row[h]));
      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `license-report-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();

      if (typeof Toast !== "undefined") {
        Toast.success("License report exported to CSV");
      }
    }
  },

  /**
   * Export licenses to PDF
   */
  exportToPDF() {
    if (typeof PDFExport !== "undefined") {
      PDFExport.exportLicenses(this.licenses, {
        title: "License Usage Report",
        subtitle: `${this.licenses.length} license types`,
      });
    } else {
      if (typeof Toast !== "undefined") {
        Toast.error("PDF export not available");
      }
    }
  },

  /**
   * Helper functions
   */
  formatCurrency(amount) {
    // Use LocaleUtils for consistent formatting across the app
    if (typeof LocaleUtils !== "undefined") {
      return LocaleUtils.formatCurrency(amount);
    }
    // Fallback
    const currency = Config?.ui?.currency || "NOK";
    const locale = currency === "NOK" || currency === "SEK" ? "nb-NO" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  getUtilizationClass(percent) {
    if (percent >= 90) return "high";
    if (percent >= 70) return "medium";
    return "low";
  },

  /**
   * License feature definitions for comparison
   * Prices in NOK (Norwegian Kroner) - based on Microsoft Norwegian pricing
   */
  licenseFeatures: {
    M365_BUSINESS_BASIC: {
      name: "Microsoft 365 Business Basic",
      price: 66, // ~66 kr/user/month
      features: {
        // Productivity
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": false,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (50GB)": true,
        // Security
        "Azure AD Basic": true,
        "Azure AD Premium P1": false,
        "Azure AD Premium P2": false,
        Intune: false,
        "Conditional Access": false,
        "Microsoft Defender for Office 365": false,
        "Microsoft Defender for Endpoint": false,
        "Information Protection": false,
        // Compliance
        "Basic Audit": true,
        "Advanced Audit": false,
        eDiscovery: false,
        "Data Loss Prevention": false,
        "Insider Risk Management": false,
        // Advanced
        "Power BI Pro": false,
        "Power Automate": false,
        "Power Apps": false,
        "Phone System": false,
      },
    },
    M365_BUSINESS_STANDARD: {
      name: "Microsoft 365 Business Standard",
      price: 138, // ~138 kr/user/month
      features: {
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": true,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (50GB)": true,
        "Azure AD Basic": true,
        "Azure AD Premium P1": false,
        "Azure AD Premium P2": false,
        Intune: false,
        "Conditional Access": false,
        "Microsoft Defender for Office 365": false,
        "Microsoft Defender for Endpoint": false,
        "Information Protection": false,
        "Basic Audit": true,
        "Advanced Audit": false,
        eDiscovery: false,
        "Data Loss Prevention": false,
        "Insider Risk Management": false,
        "Power BI Pro": false,
        "Power Automate": false,
        "Power Apps": false,
        "Phone System": false,
      },
    },
    M365_BUSINESS_PREMIUM: {
      name: "Microsoft 365 Business Premium",
      price: 242, // ~242 kr/user/month
      features: {
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": true,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (50GB)": true,
        "Azure AD Basic": true,
        "Azure AD Premium P1": true,
        "Azure AD Premium P2": false,
        Intune: true,
        "Conditional Access": true,
        "Microsoft Defender for Office 365": true,
        "Microsoft Defender for Endpoint": true,
        "Information Protection": true,
        "Basic Audit": true,
        "Advanced Audit": false,
        eDiscovery: false,
        "Data Loss Prevention": true,
        "Insider Risk Management": false,
        "Power BI Pro": false,
        "Power Automate": false,
        "Power Apps": false,
        "Phone System": false,
      },
    },
    OFFICE_365_E1: {
      name: "Office 365 E1",
      price: 88, // ~88 kr/user/month
      features: {
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": false,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (50GB)": true,
        "Azure AD Basic": true,
        "Azure AD Premium P1": false,
        "Azure AD Premium P2": false,
        Intune: false,
        "Conditional Access": false,
        "Microsoft Defender for Office 365": false,
        "Microsoft Defender for Endpoint": false,
        "Information Protection": false,
        "Basic Audit": true,
        "Advanced Audit": false,
        eDiscovery: false,
        "Data Loss Prevention": false,
        "Insider Risk Management": false,
        "Power BI Pro": false,
        "Power Automate": false,
        "Power Apps": false,
        "Phone System": false,
      },
    },
    OFFICE_365_E3: {
      name: "Office 365 E3",
      price: 253, // ~253 kr/user/month
      features: {
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": true,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (100GB)": true,
        "Azure AD Basic": true,
        "Azure AD Premium P1": false,
        "Azure AD Premium P2": false,
        Intune: false,
        "Conditional Access": false,
        "Microsoft Defender for Office 365": false,
        "Microsoft Defender for Endpoint": false,
        "Information Protection": true,
        "Basic Audit": true,
        "Advanced Audit": false,
        eDiscovery: true,
        "Data Loss Prevention": true,
        "Insider Risk Management": false,
        "Power BI Pro": false,
        "Power Automate": false,
        "Power Apps": false,
        "Phone System": false,
      },
    },
    OFFICE_365_E5: {
      name: "Office 365 E5",
      price: 418, // ~418 kr/user/month
      features: {
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": true,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (100GB)": true,
        "Azure AD Basic": true,
        "Azure AD Premium P1": false,
        "Azure AD Premium P2": false,
        Intune: false,
        "Conditional Access": false,
        "Microsoft Defender for Office 365": true,
        "Microsoft Defender for Endpoint": false,
        "Information Protection": true,
        "Basic Audit": true,
        "Advanced Audit": true,
        eDiscovery: true,
        "Data Loss Prevention": true,
        "Insider Risk Management": false,
        "Power BI Pro": true,
        "Power Automate": false,
        "Power Apps": false,
        "Phone System": true,
      },
    },
    M365_E3: {
      name: "Microsoft 365 E3",
      price: 395, // ~395 kr/user/month
      features: {
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": true,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (100GB)": true,
        "Azure AD Basic": true,
        "Azure AD Premium P1": true,
        "Azure AD Premium P2": false,
        Intune: true,
        "Conditional Access": true,
        "Microsoft Defender for Office 365": false,
        "Microsoft Defender for Endpoint": false,
        "Information Protection": true,
        "Basic Audit": true,
        "Advanced Audit": false,
        eDiscovery: true,
        "Data Loss Prevention": true,
        "Insider Risk Management": false,
        "Power BI Pro": false,
        "Power Automate": false,
        "Power Apps": false,
        "Phone System": false,
      },
    },
    M365_E5: {
      name: "Microsoft 365 E5",
      price: 630, // ~630 kr/user/month
      features: {
        "Web & Mobile Office Apps": true,
        "Desktop Office Apps": true,
        "1 TB OneDrive Storage": true,
        SharePoint: true,
        "Microsoft Teams": true,
        "Exchange Online (100GB)": true,
        "Azure AD Basic": true,
        "Azure AD Premium P1": true,
        "Azure AD Premium P2": true,
        Intune: true,
        "Conditional Access": true,
        "Microsoft Defender for Office 365": true,
        "Microsoft Defender for Endpoint": true,
        "Information Protection": true,
        "Basic Audit": true,
        "Advanced Audit": true,
        eDiscovery: true,
        "Data Loss Prevention": true,
        "Insider Risk Management": true,
        "Power BI Pro": true,
        "Power Automate": true,
        "Power Apps": true,
        "Phone System": true,
      },
    },
  },

  /**
   * Compare two licenses and show what's gained/lost
   */
  compareLicenses(currentId, targetId) {
    const current = this.licenseFeatures[currentId];
    const target = this.licenseFeatures[targetId];

    if (!current || !target) {
      return null;
    }

    const gained = [];
    const lost = [];
    const kept = [];

    // Get all unique features
    const allFeatures = new Set([
      ...Object.keys(current.features),
      ...Object.keys(target.features),
    ]);

    allFeatures.forEach((feature) => {
      const inCurrent = current.features[feature] === true;
      const inTarget = target.features[feature] === true;

      if (!inCurrent && inTarget) {
        gained.push(feature);
      } else if (inCurrent && !inTarget) {
        lost.push(feature);
      } else if (inCurrent && inTarget) {
        kept.push(feature);
      }
    });

    const priceDiff = target.price - current.price;

    return {
      current: current.name,
      target: target.name,
      currentPrice: current.price,
      targetPrice: target.price,
      priceDiff,
      gained,
      lost,
      kept,
      isUpgrade: priceDiff > 0,
    };
  },

  /**
   * Render comparison results
   */
  renderComparisonResults(results) {
    const container = document.getElementById("comparisonResults");
    if (!container) return;

    const formatPrice = (price) => {
      if (typeof LocaleUtils !== "undefined") {
        return LocaleUtils.formatCurrency(price);
      }
      return `$${price}`;
    };

    const priceDiffClass =
      results.priceDiff > 0
        ? "increase"
        : results.priceDiff < 0
        ? "decrease"
        : "same";
    const priceDiffText =
      results.priceDiff > 0
        ? `+${formatPrice(results.priceDiff)}/user/month`
        : results.priceDiff < 0
        ? `${formatPrice(results.priceDiff)}/user/month (savings!)`
        : "Same price";

    container.innerHTML = `
      <div class="comparison-header">
        <div class="license-box current">
          <div class="license-name">${results.current}</div>
          <div class="license-price">${formatPrice(
            results.currentPrice
          )}/user/month</div>
        </div>
        <div class="comparison-direction ${
          results.isUpgrade ? "upgrade" : "downgrade"
        }">
          ${results.isUpgrade ? "⬆️ Upgrade" : "⬇️ Downgrade"}
        </div>
        <div class="license-box target">
          <div class="license-name">${results.target}</div>
          <div class="license-price">${formatPrice(
            results.targetPrice
          )}/user/month</div>
        </div>
      </div>

      <div class="price-difference ${priceDiffClass}">
        <span class="diff-label">Price Difference:</span>
        <span class="diff-value">${priceDiffText}</span>
      </div>

      <div class="features-comparison">
        ${
          results.gained.length > 0
            ? `
          <div class="feature-section gained">
            <h4>✅ Features You Gain (${results.gained.length})</h4>
            <ul class="feature-list">
              ${results.gained.map((f) => `<li>${f}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }

        ${
          results.lost.length > 0
            ? `
          <div class="feature-section lost">
            <h4>❌ Features You Lose (${results.lost.length})</h4>
            <ul class="feature-list">
              ${results.lost.map((f) => `<li>${f}</li>`).join("")}
            </ul>
            <div class="warning-note">
              ⚠️ <strong>Important:</strong> Losing these features may impact security and compliance. 
              Review carefully before making changes.
            </div>
          </div>
        `
            : ""
        }

        ${
          results.kept.length > 0
            ? `
          <div class="feature-section kept">
            <h4>✓ Features You Keep (${results.kept.length})</h4>
            <ul class="feature-list collapsed" id="keptFeaturesList">
              ${results.kept.map((f) => `<li>${f}</li>`).join("")}
            </ul>
            <button class="btn btn-link" onclick="LicensesPage.toggleKeptFeatures()">
              Show/Hide kept features
            </button>
          </div>
        `
            : ""
        }
      </div>

      ${
        results.lost.length > 0 &&
        results.lost.some(
          (f) =>
            f.includes("Defender") ||
            f.includes("Security") ||
            f.includes("Conditional") ||
            f.includes("Azure AD Premium")
        )
          ? `
        <div class="security-warning">
          <span class="warning-icon">🔒</span>
          <div class="warning-content">
            <strong>Security Impact Warning</strong>
            <p>This change will remove important security features. Consider the impact on your organization's security posture before proceeding.</p>
          </div>
        </div>
      `
          : ""
      }
    `;

    container.classList.remove("hidden");
  },

  /**
   * Toggle kept features visibility
   */
  toggleKeptFeatures() {
    const list = document.getElementById("keptFeaturesList");
    if (list) {
      list.classList.toggle("collapsed");
    }
  },
};
