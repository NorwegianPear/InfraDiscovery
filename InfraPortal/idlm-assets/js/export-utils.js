/**
 * Export Utilities Module
 * Provides CSV, XLSX, and PDF export functionality
 */

const ExportUtils = {
  /**
   * Export data to CSV format
   * @param {Array<Object>} data - Array of objects to export
   * @param {string} filename - Filename without extension
   * @param {Array<string>} headers - Optional custom headers
   */
  toCSV(data, filename, headers = null) {
    if (!data || data.length === 0) {
      this.showNotification("No data to export", "warning");
      return;
    }

    // Get headers from first object if not provided
    const keys = headers || Object.keys(data[0]);

    // Create CSV content
    const csvRows = [];

    // Header row
    csvRows.push(keys.join(","));

    // Data rows
    data.forEach((row) => {
      const values = keys.map((key) => {
        const value = row[key];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");
    this.downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
  },

  /**
   * Export data to XLSX format (Excel)
   * Uses SheetJS library if available, falls back to CSV
   * @param {Array<Object>} data - Array of objects to export
   * @param {string} filename - Filename without extension
   * @param {string} sheetName - Name of the worksheet
   */
  toXLSX(data, filename, sheetName = "Sheet1") {
    if (!data || data.length === 0) {
      this.showNotification("No data to export", "warning");
      return;
    }

    // Check if SheetJS (xlsx) is available
    if (typeof XLSX !== "undefined") {
      try {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, `${filename}.xlsx`);
        this.showNotification(
          `Exported ${data.length} rows to Excel`,
          "success"
        );
        return;
      } catch (error) {
        console.error("XLSX export error:", error);
      }
    }

    // Fallback: Create a simple Excel-compatible XML format
    console.log("SheetJS not available, using XML spreadsheet format");

    const keys = Object.keys(data[0]);
    let xml = '<?xml version="1.0"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xml += '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += `  <Worksheet ss:Name="${sheetName}">\n`;
    xml += "    <Table>\n";

    // Header row
    xml += "      <Row>\n";
    keys.forEach((key) => {
      xml += `        <Cell><Data ss:Type="String">${this.escapeXml(
        key
      )}</Data></Cell>\n`;
    });
    xml += "      </Row>\n";

    // Data rows
    data.forEach((row) => {
      xml += "      <Row>\n";
      keys.forEach((key) => {
        const value = row[key];
        const type = typeof value === "number" ? "Number" : "String";
        xml += `        <Cell><Data ss:Type="${type}">${this.escapeXml(
          String(value ?? "")
        )}</Data></Cell>\n`;
      });
      xml += "      </Row>\n";
    });

    xml += "    </Table>\n";
    xml += "  </Worksheet>\n";
    xml += "</Workbook>";

    this.downloadFile(xml, `${filename}.xls`, "application/vnd.ms-excel");
    this.showNotification(`Exported ${data.length} rows to Excel`, "success");
  },

  /**
   * Export data to JSON format
   * @param {any} data - Data to export
   * @param {string} filename - Filename without extension
   */
  toJSON(data, filename) {
    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, `${filename}.json`, "application/json");
    this.showNotification("Exported to JSON", "success");
  },

  /**
   * Show export format selection dialog
   * @param {Array<Object>} data - Data to export
   * @param {string} filename - Base filename
   * @param {string} title - Dialog title
   */
  showExportDialog(data, filename, title = "Export Data") {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "export-dialog-overlay";
      overlay.innerHTML = `
        <div class="export-dialog">
          <div class="export-dialog-header">
            <h3>📥 ${title}</h3>
          </div>
          <div class="export-dialog-body">
            <p>Select export format:</p>
            <div class="export-format-options">
              <button class="export-format-btn" data-format="csv">
                <span class="format-icon">📄</span>
                <span class="format-name">CSV</span>
                <span class="format-desc">Comma-separated values</span>
              </button>
              <button class="export-format-btn" data-format="xlsx">
                <span class="format-icon">📊</span>
                <span class="format-name">Excel</span>
                <span class="format-desc">Microsoft Excel format</span>
              </button>
              <button class="export-format-btn" data-format="json">
                <span class="format-icon">📋</span>
                <span class="format-name">JSON</span>
                <span class="format-desc">JavaScript Object Notation</span>
              </button>
            </div>
            <p class="export-count">${data.length} records will be exported</p>
          </div>
          <div class="export-dialog-footer">
            <button class="btn btn-secondary cancel-btn">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.injectExportStyles();

      // Handle format selection
      overlay.querySelectorAll(".export-format-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const format = btn.dataset.format;
          overlay.remove();

          switch (format) {
            case "csv":
              this.toCSV(data, filename);
              break;
            case "xlsx":
              this.toXLSX(data, filename);
              break;
            case "json":
              this.toJSON(data, filename);
              break;
          }
          resolve(format);
        });
      });

      // Handle cancel
      overlay.querySelector(".cancel-btn").addEventListener("click", () => {
        overlay.remove();
        resolve(null);
      });

      // Close on overlay click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });
    });
  },

  /**
   * Helper: Download file
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Helper: Escape XML special characters
   */
  escapeXml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  },

  /**
   * Helper: Show notification
   */
  showNotification(message, type = "info") {
    if (typeof Remediation !== "undefined" && Remediation.showNotification) {
      Remediation.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  },

  /**
   * Inject export dialog styles
   */
  injectExportStyles() {
    if (document.getElementById("export-utils-styles")) return;

    const styles = document.createElement("style");
    styles.id = "export-utils-styles";
    styles.textContent = `
      .export-dialog-overlay {
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

      .export-dialog {
        background: var(--bg-primary, #ffffff);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 420px;
        width: 90%;
        animation: slideUp 0.3s ease;
      }

      .export-dialog-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color, #e0e0e0);
      }

      .export-dialog-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .export-dialog-body {
        padding: 20px;
      }

      .export-dialog-body p {
        margin: 0 0 16px 0;
        color: var(--text-secondary, #666);
      }

      .export-format-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .export-format-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border: 2px solid var(--border-color, #e0e0e0);
        border-radius: 8px;
        background: var(--bg-secondary, #f5f5f5);
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      }

      .export-format-btn:hover {
        border-color: var(--primary-color, #0078d4);
        background: var(--bg-primary, #fff);
        transform: translateX(4px);
      }

      .format-icon {
        font-size: 24px;
      }

      .format-name {
        font-weight: 600;
        font-size: 15px;
        color: var(--text-primary, #333);
      }

      .format-desc {
        font-size: 12px;
        color: var(--text-tertiary, #999);
        margin-left: auto;
      }

      .export-count {
        margin-top: 16px !important;
        font-size: 13px;
        text-align: center;
      }

      .export-dialog-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--border-color, #e0e0e0);
        display: flex;
        justify-content: flex-end;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  },

  // ============================================================================
  // Pre-built Export Functions for Common Data Types
  // ============================================================================

  /**
   * Export users data
   */
  exportUsers(users, showDialog = true) {
    const data = users.map((u) => ({
      "Display Name": u.displayName || u.name || "",
      Email: u.userPrincipalName || u.email || u.mail || "",
      "User Type": u.userType || "Member",
      "Account Status":
        u.accountEnabled === false ? "Disabled" : u.status || "Active",
      "Last Sign-in":
        u.signInActivity?.lastSignInDateTime || u.lastSignIn || "Never",
      "MFA Status": u.mfaEnabled ? "Enabled" : "Not Configured",
      "Created Date": u.createdDateTime || "",
    }));

    const filename = `users-export-${new Date().toISOString().split("T")[0]}`;

    if (showDialog) {
      return this.showExportDialog(data, filename, "Export Users");
    } else {
      this.toCSV(data, filename);
    }
  },

  /**
   * Export licenses data
   */
  exportLicenses(licenses, showDialog = true) {
    const data = licenses.map((l) => ({
      "License Name": l.skuPartNumber || l.name || "",
      "SKU ID": l.skuId || "",
      "Total Purchased": l.prepaidUnits?.enabled || l.count || 0,
      Consumed: l.consumedUnits || l.utilized || 0,
      Available: (l.prepaidUnits?.enabled || 0) - (l.consumedUnits || 0),
      "Monthly Cost": l.cost ? LocaleUtils.formatCurrency(l.cost) : "",
    }));

    const filename = `licenses-export-${
      new Date().toISOString().split("T")[0]
    }`;

    if (showDialog) {
      return this.showExportDialog(data, filename, "Export Licenses");
    } else {
      this.toCSV(data, filename);
    }
  },

  /**
   * Export tasks data
   */
  exportTasks(tasks, showDialog = true) {
    const data = tasks.map((t) => ({
      Title: t.title || "",
      Description: t.description || "",
      Category: t.category || "",
      Priority: t.priority || "",
      Status: t.status || "",
      "Assigned To": t.assignedTo || "",
      "Due Date": t.dueDate || "",
      Created: t.created || "",
      Completed: t.completed || "",
    }));

    const filename = `tasks-export-${new Date().toISOString().split("T")[0]}`;

    if (showDialog) {
      return this.showExportDialog(data, filename, "Export Tasks");
    } else {
      this.toJSON(tasks, filename);
    }
  },

  /**
   * Export security report
   */
  exportSecurityReport(securityData, showDialog = true) {
    const data = [];

    // MFA Status
    if (securityData.mfa) {
      data.push({
        Category: "MFA",
        Metric: "Users with MFA",
        Value: securityData.mfa.registered || 0,
        Details: "",
      });
      data.push({
        Category: "MFA",
        Metric: "Users without MFA",
        Value: securityData.mfa.missing || 0,
        Details: "Action required",
      });
    }

    // Admin Roles
    if (securityData.admins) {
      data.push({
        Category: "Privileged Access",
        Metric: "Global Administrators",
        Value: securityData.admins.globalAdmins || 0,
        Details: "",
      });
      data.push({
        Category: "Privileged Access",
        Metric: "Total Admin Assignments",
        Value: securityData.admins.total || 0,
        Details: "",
      });
    }

    const filename = `security-report-${
      new Date().toISOString().split("T")[0]
    }`;

    if (showDialog) {
      return this.showExportDialog(data, filename, "Export Security Report");
    } else {
      this.toCSV(data, filename);
    }
  },
};

// Make available globally
window.ExportUtils = ExportUtils;
