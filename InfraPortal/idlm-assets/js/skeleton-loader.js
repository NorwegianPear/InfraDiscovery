/**
 * Skeleton Loader Utility
 * Provides easy-to-use methods for showing skeleton loading states
 */

const SkeletonLoader = {
  /**
   * Generate a skeleton user list
   * @param {number} count - Number of skeleton items
   * @returns {string} HTML string
   */
  userList(count = 5) {
    let html = '<div class="skeleton-user-list">';
    for (let i = 0; i < count; i++) {
      html += `
                <div class="skeleton-user-item">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="skeleton-user-info">
                        <div class="skeleton skeleton-user-name"></div>
                        <div class="skeleton skeleton-user-email"></div>
                    </div>
                    <div class="skeleton skeleton-user-status"></div>
                    <div class="skeleton skeleton-user-actions"></div>
                </div>
            `;
    }
    html += "</div>";
    return html;
  },

  /**
   * Generate skeleton dashboard stats
   * @param {number} count - Number of stat cards
   * @returns {string} HTML string
   */
  dashboardStats(count = 4) {
    let html = '<div class="skeleton-dashboard-stats">';
    for (let i = 0; i < count; i++) {
      html += `
                <div class="skeleton-dashboard-stat">
                    <div class="skeleton-stat-header">
                        <div class="skeleton skeleton-stat-icon"></div>
                        <div class="skeleton skeleton-stat-trend"></div>
                    </div>
                    <div class="skeleton skeleton-stat-value"></div>
                    <div class="skeleton skeleton-stat-label"></div>
                </div>
            `;
    }
    html += "</div>";
    return html;
  },

  /**
   * Generate skeleton license cards
   * @param {number} count - Number of license cards
   * @returns {string} HTML string
   */
  licenseCards(count = 3) {
    let html =
      '<div class="license-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">';
    for (let i = 0; i < count; i++) {
      html += `
                <div class="skeleton-license-card">
                    <div class="skeleton-license-header">
                        <div class="skeleton skeleton-license-icon"></div>
                        <div class="skeleton-license-title">
                            <div class="skeleton skeleton-text w-75"></div>
                            <div class="skeleton skeleton-text skeleton-text-sm w-50"></div>
                        </div>
                    </div>
                    <div class="skeleton skeleton-license-progress"></div>
                    <div class="skeleton-license-stats">
                        <div class="skeleton-license-stat">
                            <div class="skeleton skeleton-text skeleton-text-sm w-50"></div>
                            <div class="skeleton skeleton-text w-75"></div>
                        </div>
                        <div class="skeleton-license-stat">
                            <div class="skeleton skeleton-text skeleton-text-sm w-50"></div>
                            <div class="skeleton skeleton-text w-75"></div>
                        </div>
                    </div>
                </div>
            `;
    }
    html += "</div>";
    return html;
  },

  /**
   * Generate skeleton security alerts
   * @param {number} count - Number of security items
   * @returns {string} HTML string
   */
  securityAlerts(count = 4) {
    let html = '<div class="skeleton-security-list">';
    for (let i = 0; i < count; i++) {
      html += `
                <div class="skeleton-security-item">
                    <div class="skeleton skeleton-security-icon"></div>
                    <div class="skeleton-security-content">
                        <div class="skeleton skeleton-text w-75"></div>
                        <div class="skeleton skeleton-text skeleton-text-sm w-50"></div>
                    </div>
                    <div class="skeleton skeleton-security-severity"></div>
                </div>
            `;
    }
    html += "</div>";
    return html;
  },

  /**
   * Generate skeleton table rows
   * @param {number} rows - Number of rows
   * @param {number} cols - Number of columns
   * @returns {string} HTML string
   */
  tableRows(rows = 5, cols = 4) {
    let html = '<div class="skeleton-table">';
    for (let i = 0; i < rows; i++) {
      html += '<div class="skeleton-table-row">';
      for (let j = 0; j < cols; j++) {
        const widths = ["w-25", "w-50", "w-75", "w-100"];
        const width = widths[j % widths.length];
        html += `<div class="skeleton-table-cell"><div class="skeleton skeleton-text ${width}"></div></div>`;
      }
      html += "</div>";
    }
    html += "</div>";
    return html;
  },

  /**
   * Generate skeleton chart placeholder
   * @param {boolean} mini - Whether to use mini size
   * @returns {string} HTML string
   */
  chart(mini = false) {
    return `<div class="skeleton skeleton-chart ${
      mini ? "skeleton-chart-mini" : ""
    }"></div>`;
  },

  /**
   * Generate skeleton card with custom content
   * @param {Object} options - Configuration options
   * @returns {string} HTML string
   */
  card(options = {}) {
    const {
      hasIcon = true,
      hasTitle = true,
      hasSubtitle = true,
      hasContent = true,
    } = options;
    let html = '<div class="skeleton-card">';

    if (hasIcon || hasTitle) {
      html +=
        '<div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">';
      if (hasIcon) {
        html += '<div class="skeleton skeleton-avatar"></div>';
      }
      if (hasTitle) {
        html += '<div style="flex: 1;">';
        html +=
          '<div class="skeleton skeleton-text w-50" style="margin-bottom: 0.25rem;"></div>';
        if (hasSubtitle) {
          html +=
            '<div class="skeleton skeleton-text skeleton-text-sm w-75"></div>';
        }
        html += "</div>";
      }
      html += "</div>";
    }

    if (hasContent) {
      html += `
                <div class="skeleton-paragraph">
                    <div class="skeleton skeleton-text w-100"></div>
                    <div class="skeleton skeleton-text w-100"></div>
                    <div class="skeleton skeleton-text w-75"></div>
                </div>
            `;
    }

    html += "</div>";
    return html;
  },

  /**
   * Show skeleton in a container element
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} skeletonHtml - Skeleton HTML to display
   */
  show(container, skeletonHtml) {
    const el =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!el) return;

    // Store original content
    el.setAttribute("data-original-content", el.innerHTML);
    el.innerHTML = skeletonHtml;
    el.classList.add("skeleton-loading");
  },

  /**
   * Hide skeleton and restore original content
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} newContent - Optional new content to display instead of original
   */
  hide(container, newContent = null) {
    const el =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!el) return;

    if (newContent !== null) {
      el.innerHTML = newContent;
    } else {
      const original = el.getAttribute("data-original-content");
      if (original) {
        el.innerHTML = original;
        el.removeAttribute("data-original-content");
      }
    }
    el.classList.remove("skeleton-loading");
  },

  /**
   * Wrap an async operation with skeleton loading
   * @param {HTMLElement|string} container - Container element or selector
   * @param {string} skeletonType - Type of skeleton ('users', 'licenses', 'security', 'stats', 'table', 'chart')
   * @param {Function} asyncFn - Async function that returns new content HTML
   * @param {Object} options - Additional options
   */
  async wrap(container, skeletonType, asyncFn, options = {}) {
    const el =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!el) return;

    // Determine skeleton HTML
    let skeletonHtml;
    switch (skeletonType) {
      case "users":
        skeletonHtml = this.userList(options.count || 5);
        break;
      case "licenses":
        skeletonHtml = this.licenseCards(options.count || 3);
        break;
      case "security":
        skeletonHtml = this.securityAlerts(options.count || 4);
        break;
      case "stats":
        skeletonHtml = this.dashboardStats(options.count || 4);
        break;
      case "table":
        skeletonHtml = this.tableRows(options.rows || 5, options.cols || 4);
        break;
      case "chart":
        skeletonHtml = this.chart(options.mini);
        break;
      default:
        skeletonHtml = this.card(options);
    }

    // Show skeleton
    this.show(el, skeletonHtml);

    try {
      // Execute async function
      const newContent = await asyncFn();

      // Hide skeleton and show new content
      this.hide(el, newContent);

      return true;
    } catch (error) {
      console.error("SkeletonLoader wrap error:", error);

      // Hide skeleton with error message
      this.hide(
        el,
        `
                <div class="error-state" style="text-align: center; padding: 2rem; color: var(--danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Failed to load content. Please try again.</p>
                </div>
            `
      );

      return false;
    }
  },
};

// Make available globally
window.SkeletonLoader = SkeletonLoader;
