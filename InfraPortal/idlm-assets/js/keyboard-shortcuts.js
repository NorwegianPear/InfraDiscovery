/**
 * Keyboard Shortcuts Manager
 * Provides keyboard navigation and shortcuts throughout the app
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const KeyboardShortcuts = {
  enabled: true,
  searchOpen: false,

  shortcuts: {
    // Navigation
    1: {
      action: "navigate",
      page: "dashboard",
      description: "Go to Dashboard",
    },
    2: { action: "navigate", page: "users", description: "Go to Users" },
    3: { action: "navigate", page: "licenses", description: "Go to Licenses" },
    4: { action: "navigate", page: "security", description: "Go to Security" },
    5: { action: "navigate", page: "reports", description: "Go to Reports" },
    6: {
      action: "navigate",
      page: "mitigation",
      description: "Go to Mitigation",
    },
    7: {
      action: "navigate",
      page: "documentation",
      description: "Go to Documentation",
    },
    8: { action: "navigate", page: "settings", description: "Go to Settings" },

    // Actions
    r: { action: "refresh", description: "Refresh data", requiresCtrl: true },
    k: { action: "search", description: "Open search", requiresCtrl: true },
    "/": { action: "search", description: "Open search" },
    Escape: { action: "close", description: "Close modal/search" },
    "?": { action: "help", description: "Show shortcuts", requiresShift: true },
  },

  /**
   * Initialize keyboard shortcuts
   */
  init() {
    document.addEventListener("keydown", (e) => this.handleKeydown(e));
    console.log("⌨️ Keyboard shortcuts initialized");
  },

  /**
   * Handle keydown events
   */
  handleKeydown(e) {
    // Don't trigger if typing in an input
    if (this.isTyping(e)) return;
    if (!this.enabled) return;

    const key = e.key;
    const shortcut = this.shortcuts[key];

    if (!shortcut) return;

    // Check modifier requirements
    if (shortcut.requiresCtrl && !e.ctrlKey && !e.metaKey) return;
    if (shortcut.requiresShift && !e.shiftKey) return;
    if (
      !shortcut.requiresCtrl &&
      !shortcut.requiresShift &&
      (e.ctrlKey || e.metaKey || e.altKey)
    )
      return;

    e.preventDefault();
    this.executeAction(shortcut);
  },

  /**
   * Check if user is typing in an input
   */
  isTyping(e) {
    const target = e.target;
    const tagName = target.tagName.toLowerCase();
    return (
      tagName === "input" || tagName === "textarea" || target.isContentEditable
    );
  },

  /**
   * Execute shortcut action
   */
  executeAction(shortcut) {
    switch (shortcut.action) {
      case "navigate":
        if (typeof App !== "undefined" && App.navigateTo) {
          App.navigateTo(shortcut.page);
          Toast?.info(`Navigated to ${shortcut.page}`);
        }
        break;

      case "refresh":
        if (typeof App !== "undefined" && App.loadData) {
          App.loadData();
          Toast?.info("Refreshing data...");
        }
        break;

      case "search":
        this.openSearch();
        break;

      case "close":
        this.closeModals();
        break;

      case "help":
        this.showHelp();
        break;
    }
  },

  /**
   * Open global search
   */
  openSearch() {
    if (this.searchOpen) return;

    this.searchOpen = true;
    const overlay = document.createElement("div");
    overlay.id = "global-search-overlay";
    overlay.className = "search-overlay";
    overlay.innerHTML = `
      <div class="search-modal">
        <div class="search-header">
          <span class="search-icon">🔍</span>
          <input type="text" id="globalSearchInput" placeholder="Search users, licenses, documentation..." autofocus>
          <span class="search-hint">ESC to close</span>
        </div>
        <div class="search-results" id="searchResults">
          <div class="search-section">
            <div class="search-section-title">Quick Navigation</div>
            <div class="search-items">
              <div class="search-item" data-page="dashboard"><span>📊</span> Dashboard <kbd>1</kbd></div>
              <div class="search-item" data-page="users"><span>👥</span> Users <kbd>2</kbd></div>
              <div class="search-item" data-page="licenses"><span>📜</span> Licenses <kbd>3</kbd></div>
              <div class="search-item" data-page="security"><span>🔒</span> Security <kbd>4</kbd></div>
              <div class="search-item" data-page="reports"><span>📈</span> Reports <kbd>5</kbd></div>
              <div class="search-item" data-page="mitigation"><span>🛡️</span> Mitigation <kbd>6</kbd></div>
              <div class="search-item" data-page="settings"><span>⚙️</span> Settings <kbd>8</kbd></div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeSearch();
    });

    const input = document.getElementById("globalSearchInput");
    input.addEventListener("input", (e) => this.handleSearch(e.target.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeSearch();
      if (e.key === "Enter") this.selectFirstResult();
    });

    // Click handlers for search items
    overlay.querySelectorAll(".search-item").forEach((item) => {
      item.addEventListener("click", () => {
        const page = item.dataset.page;
        if (page && typeof App !== "undefined") {
          App.navigateTo(page);
          this.closeSearch();
        }
      });
    });

    this.injectSearchStyles();
  },

  /**
   * Close global search
   */
  closeSearch() {
    const overlay = document.getElementById("global-search-overlay");
    if (overlay) {
      overlay.remove();
      this.searchOpen = false;
    }
  },

  /**
   * Handle search input
   */
  async handleSearch(query) {
    const resultsContainer = document.getElementById("searchResults");
    if (!query.trim()) {
      // Show default navigation
      resultsContainer.innerHTML = `
        <div class="search-section">
          <div class="search-section-title">Quick Navigation</div>
          <div class="search-items">
            <div class="search-item" data-page="dashboard"><span>📊</span> Dashboard <kbd>1</kbd></div>
            <div class="search-item" data-page="users"><span>👥</span> Users <kbd>2</kbd></div>
            <div class="search-item" data-page="licenses"><span>📜</span> Licenses <kbd>3</kbd></div>
            <div class="search-item" data-page="security"><span>🔒</span> Security <kbd>4</kbd></div>
            <div class="search-item" data-page="reports"><span>📈</span> Reports <kbd>5</kbd></div>
          </div>
        </div>
      `;
      return;
    }

    // Search across cached data
    const results = this.searchData(query.toLowerCase());
    this.renderSearchResults(results, query);
  },

  /**
   * Search across cached data
   */
  searchData(query) {
    const results = { users: [], pages: [] };

    // Search pages
    const pages = [
      {
        name: "Dashboard",
        page: "dashboard",
        icon: "📊",
        keywords: ["overview", "home", "stats"],
      },
      {
        name: "Users",
        page: "users",
        icon: "👥",
        keywords: ["members", "guests", "accounts"],
      },
      {
        name: "Licenses",
        page: "licenses",
        icon: "📜",
        keywords: ["subscriptions", "cost", "savings"],
      },
      {
        name: "Security",
        page: "security",
        icon: "🔒",
        keywords: ["mfa", "admin", "risk"],
      },
      {
        name: "Reports",
        page: "reports",
        icon: "📈",
        keywords: ["export", "analytics"],
      },
      {
        name: "Mitigation",
        page: "mitigation",
        icon: "🛡️",
        keywords: ["tasks", "remediation"],
      },
      {
        name: "Settings",
        page: "settings",
        icon: "⚙️",
        keywords: ["config", "options"],
      },
    ];

    pages.forEach((p) => {
      if (
        p.name.toLowerCase().includes(query) ||
        p.keywords.some((k) => k.includes(query))
      ) {
        results.pages.push(p);
      }
    });

    // Search users from cache
    if (typeof DataCache !== "undefined") {
      const cachedUsers = DataCache.get("users");
      if (cachedUsers) {
        results.users = cachedUsers
          .filter(
            (u) =>
              (u.displayName && u.displayName.toLowerCase().includes(query)) ||
              (u.email && u.email.toLowerCase().includes(query))
          )
          .slice(0, 5);
      }
    }

    return results;
  },

  /**
   * Render search results
   */
  renderSearchResults(results, query) {
    const container = document.getElementById("searchResults");
    let html = "";

    if (results.pages.length > 0) {
      html += `
        <div class="search-section">
          <div class="search-section-title">Pages</div>
          <div class="search-items">
            ${results.pages
              .map(
                (p) => `
              <div class="search-item" data-page="${p.page}">
                <span>${p.icon}</span> ${this.highlight(p.name, query)}
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    if (results.users.length > 0) {
      html += `
        <div class="search-section">
          <div class="search-section-title">Users</div>
          <div class="search-items">
            ${results.users
              .map(
                (u) => `
              <div class="search-item search-item-user" data-user-id="${u.id}">
                <span>👤</span> 
                <div>
                  <div>${this.highlight(
                    u.displayName || "Unknown",
                    query
                  )}</div>
                  <div class="search-item-sub">${this.highlight(
                    u.email || "",
                    query
                  )}</div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    if (!html) {
      html =
        '<div class="search-empty">No results found for "' + query + '"</div>';
    }

    container.innerHTML = html;

    // Re-attach click handlers
    container.querySelectorAll(".search-item[data-page]").forEach((item) => {
      item.addEventListener("click", () => {
        if (typeof App !== "undefined") {
          App.navigateTo(item.dataset.page);
          this.closeSearch();
        }
      });
    });

    container.querySelectorAll(".search-item-user").forEach((item) => {
      item.addEventListener("click", () => {
        if (typeof App !== "undefined") {
          App.navigateTo("users");
          this.closeSearch();
          // Could trigger user detail modal here
        }
      });
    });
  },

  /**
   * Highlight matching text
   */
  highlight(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  },

  /**
   * Select first search result
   */
  selectFirstResult() {
    const firstItem = document.querySelector("#searchResults .search-item");
    if (firstItem) {
      firstItem.click();
    }
  },

  /**
   * Close all modals
   */
  closeModals() {
    this.closeSearch();
    // Close other modals
    document
      .querySelectorAll(".modal-overlay, .modal-backdrop")
      .forEach((m) => m.remove());
  },

  /**
   * Show keyboard shortcuts help
   */
  showHelp() {
    const overlay = document.createElement("div");
    overlay.className = "shortcuts-overlay";
    overlay.innerHTML = `
      <div class="shortcuts-modal">
        <div class="shortcuts-header">
          <h3>⌨️ Keyboard Shortcuts</h3>
          <button class="shortcuts-close" onclick="this.closest('.shortcuts-overlay').remove()">×</button>
        </div>
        <div class="shortcuts-body">
          <div class="shortcuts-section">
            <h4>Navigation</h4>
            <div class="shortcut-row"><kbd>1</kbd> Dashboard</div>
            <div class="shortcut-row"><kbd>2</kbd> Users</div>
            <div class="shortcut-row"><kbd>3</kbd> Licenses</div>
            <div class="shortcut-row"><kbd>4</kbd> Security</div>
            <div class="shortcut-row"><kbd>5</kbd> Reports</div>
            <div class="shortcut-row"><kbd>6</kbd> Mitigation</div>
            <div class="shortcut-row"><kbd>7</kbd> Documentation</div>
            <div class="shortcut-row"><kbd>8</kbd> Settings</div>
          </div>
          <div class="shortcuts-section">
            <h4>Actions</h4>
            <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>K</kbd> Open Search</div>
            <div class="shortcut-row"><kbd>/</kbd> Open Search</div>
            <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>R</kbd> Refresh Data</div>
            <div class="shortcut-row"><kbd>Esc</kbd> Close Modal</div>
            <div class="shortcut-row"><kbd>?</kbd> Show This Help</div>
          </div>
        </div>
      </div>
    `;

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
    this.injectHelpStyles();
  },

  /**
   * Inject search styles
   */
  injectSearchStyles() {
    if (document.getElementById("search-styles")) return;

    const styles = document.createElement("style");
    styles.id = "search-styles";
    styles.textContent = `
      .search-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10001;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
      }

      .search-modal {
        background: var(--bg-card, white);
        border-radius: 16px;
        width: 100%;
        max-width: 600px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        overflow: hidden;
      }

      .search-header {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color, #e2e8f0);
        gap: 12px;
      }

      .search-icon {
        font-size: 20px;
      }

      .search-header input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 18px;
        background: transparent;
        color: var(--text-primary, #1e293b);
      }

      .search-hint {
        font-size: 12px;
        color: var(--text-muted, #94a3b8);
        padding: 4px 8px;
        background: var(--bg-secondary, #f1f5f9);
        border-radius: 4px;
      }

      .search-results {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }

      .search-section {
        margin-bottom: 16px;
      }

      .search-section-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-muted, #94a3b8);
        text-transform: uppercase;
        padding: 8px 12px;
      }

      .search-items {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .search-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .search-item:hover {
        background: var(--bg-secondary, #f1f5f9);
      }

      .search-item span {
        font-size: 18px;
      }

      .search-item kbd {
        margin-left: auto;
        padding: 2px 8px;
        background: var(--bg-secondary, #f1f5f9);
        border-radius: 4px;
        font-size: 12px;
        color: var(--text-muted, #94a3b8);
      }

      .search-item-sub {
        font-size: 13px;
        color: var(--text-muted, #94a3b8);
      }

      .search-empty {
        padding: 32px;
        text-align: center;
        color: var(--text-muted, #94a3b8);
      }

      .search-item mark {
        background: var(--warning-bg, #fef3c7);
        color: inherit;
        border-radius: 2px;
        padding: 0 2px;
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Inject help modal styles
   */
  injectHelpStyles() {
    if (document.getElementById("shortcuts-help-styles")) return;

    const styles = document.createElement("style");
    styles.id = "shortcuts-help-styles";
    styles.textContent = `
      .shortcuts-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .shortcuts-modal {
        background: var(--bg-card, white);
        border-radius: 16px;
        width: 100%;
        max-width: 500px;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      }

      .shortcuts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid var(--border-color, #e2e8f0);
      }

      .shortcuts-header h3 {
        margin: 0;
        font-size: 18px;
      }

      .shortcuts-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--text-muted, #94a3b8);
        padding: 4px;
      }

      .shortcuts-body {
        padding: 24px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      .shortcuts-section h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: var(--text-muted, #94a3b8);
        text-transform: uppercase;
      }

      .shortcut-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 0;
        font-size: 14px;
      }

      .shortcut-row kbd {
        padding: 4px 8px;
        background: var(--bg-secondary, #f1f5f9);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 6px;
        font-family: monospace;
        font-size: 12px;
        min-width: 24px;
        text-align: center;
      }
    `;
    document.head.appendChild(styles);
  },
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => KeyboardShortcuts.init());
