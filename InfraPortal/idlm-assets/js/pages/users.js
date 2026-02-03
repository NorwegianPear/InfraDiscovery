/**
 * Users Page - User Management & Analysis
 * Features: Search, filtering, sorting, pagination, bulk actions, user details modal
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const UsersPage = {
  users: [],
  filteredUsers: [],
  currentFilter: "all",
  currentSort: "name",
  sortDirection: 1, // 1 = asc, -1 = desc
  searchTerm: "",
  selectedUsers: new Set(),
  currentPage: 1,
  pageSize: 25,
  isLoading: false,

  /**
   * Render the users page
   */
  render() {
    return `
      <section class="page-section">
        <div class="page-toolbar">
          <div class="toolbar-left">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="userSearch" placeholder="Search users by name or email..." class="search-input">
            </div>
            <div class="filter-group">
              <button class="filter-btn active" data-filter="all">All Users</button>
              <button class="filter-btn" data-filter="members">Members</button>
              <button class="filter-btn" data-filter="guests">Guests</button>
              <button class="filter-btn" data-filter="active">Active</button>
              <button class="filter-btn" data-filter="inactive">Inactive</button>
              <button class="filter-btn" data-filter="disabled">Disabled</button>
              <button class="filter-btn" data-filter="noMfa">No MFA</button>
            </div>
          </div>
          <div class="toolbar-right">
            <select id="pageSizeSelect" class="form-select form-select-sm" style="width: auto;">
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
              <option value="all">Show all</option>
            </select>
            <button class="btn btn-secondary" id="exportUsersBtn">
              <span class="btn-icon">📥</span> Export
            </button>
            <button class="btn btn-primary" id="refreshUsersBtn">
              <span class="btn-icon">🔄</span> Refresh
            </button>
          </div>
        </div>

        <!-- Bulk Actions Bar (hidden by default) -->
        <div class="bulk-actions-bar" id="bulkActionsBar" style="display: none;">
          <div class="bulk-info">
            <span id="selectedCount">0</span> users selected
          </div>
          <div class="bulk-buttons">
            <button class="btn btn-sm btn-secondary" onclick="UsersPage.selectAll()">Select All</button>
            <button class="btn btn-sm btn-secondary" onclick="UsersPage.clearSelection()">Clear Selection</button>
            <button class="btn btn-sm btn-warning" onclick="UsersPage.bulkAction('sendMfaReminder')">📧 Send MFA Reminder</button>
            <button class="btn btn-sm btn-danger" onclick="UsersPage.bulkAction('disable')">🔒 Disable Selected</button>
            <button class="btn btn-sm btn-primary" onclick="UsersPage.exportSelectedUsers()">📥 Export Selected</button>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-card clickable" onclick="UsersPage.setFilter('members')">
            <div class="stat-icon members">👥</div>
            <div class="stat-info">
              <span class="stat-value" id="statMembers">--</span>
              <span class="stat-label">Members</span>
            </div>
          </div>
          <div class="stat-card clickable" onclick="UsersPage.setFilter('guests')">
            <div class="stat-icon guests">🌐</div>
            <div class="stat-info">
              <span class="stat-value" id="statGuests">--</span>
              <span class="stat-label">Guests</span>
            </div>
          </div>
          <div class="stat-card clickable" onclick="UsersPage.setFilter('active')">
            <div class="stat-icon active">✓</div>
            <div class="stat-info">
              <span class="stat-value" id="statActive">--</span>
              <span class="stat-label">Active</span>
            </div>
          </div>
          <div class="stat-card clickable" onclick="UsersPage.setFilter('inactive')">
            <div class="stat-icon inactive">⏸</div>
            <div class="stat-info">
              <span class="stat-value" id="statInactive">--</span>
              <span class="stat-label">Inactive</span>
            </div>
          </div>
          <div class="stat-card clickable" onclick="UsersPage.setFilter('disabled')">
            <div class="stat-icon disabled">🚫</div>
            <div class="stat-info">
              <span class="stat-value" id="statDisabled">--</span>
              <span class="stat-label">Disabled</span>
            </div>
          </div>
          <div class="stat-card clickable" onclick="UsersPage.setFilter('noMfa')">
            <div class="stat-icon warning">⚠️</div>
            <div class="stat-info">
              <span class="stat-value" id="statNoMfa">--</span>
              <span class="stat-label">No MFA</span>
            </div>
          </div>
        </div>

        <div class="table-info-bar">
          <span id="tableResultCount">Showing 0 users</span>
        </div>

        <div class="data-table-container">
          <table class="data-table" id="usersTable">
            <thead>
              <tr>
                <th class="checkbox-col">
                  <input type="checkbox" id="selectAllCheckbox" title="Select all visible users">
                </th>
                <th class="sortable" data-sort="name">
                  <span>Display Name</span>
                  <span class="sort-icon">↕</span>
                </th>
                <th class="sortable" data-sort="email">
                  <span>Email</span>
                  <span class="sort-icon">↕</span>
                </th>
                <th class="sortable" data-sort="type">
                  <span>Type</span>
                  <span class="sort-icon">↕</span>
                </th>
                <th class="sortable" data-sort="status">
                  <span>Status</span>
                  <span class="sort-icon">↕</span>
                </th>
                <th class="sortable" data-sort="lastSignIn">
                  <span>Last Sign-in</span>
                  <span class="sort-icon">↕</span>
                </th>
                <th class="sortable" data-sort="mfa">
                  <span>MFA</span>
                  <span class="sort-icon">↕</span>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="usersTableBody">
              <tr>
                <td colspan="8" class="loading-cell">
                  <div class="loading-spinner"></div>
                  <span>Loading users...</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" id="usersPagination">
          <button class="pagination-btn" id="firstPage" disabled>⟪ First</button>
          <button class="pagination-btn" id="prevPage" disabled>← Previous</button>
          <span class="pagination-info" id="pageInfo">Page 1 of 1</span>
          <button class="pagination-btn" id="nextPage" disabled>Next →</button>
          <button class="pagination-btn" id="lastPage" disabled>Last ⟫</button>
        </div>
      </section>

      <!-- User Details Modal -->
      <div class="modal" id="userDetailsModal" style="display: none;">
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h3 id="userModalTitle">User Details</h3>
            <button class="modal-close" onclick="UsersPage.closeUserModal()">×</button>
          </div>
          <div class="modal-body" id="userModalBody">
            <!-- User details will be rendered here -->
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="UsersPage.closeUserModal()">Close</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Initialize page after render
   */
  async init() {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    await this.loadUsers();
  },

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Only handle if we're on the users page
      if (!document.getElementById("usersTable")) return;

      // Escape - clear selection
      if (e.key === "Escape") {
        this.clearSelection();
        this.closeUserModal();
      }

      // Ctrl+A - select all (when not in input)
      if (
        e.ctrlKey &&
        e.key === "a" &&
        document.activeElement.tagName !== "INPUT"
      ) {
        e.preventDefault();
        this.selectAll();
      }

      // Ctrl+F - focus search
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        document.getElementById("userSearch")?.focus();
      }
    });
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Search with debounce
    const searchInput = document.getElementById("userSearch");
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchTerm = e.target.value.toLowerCase();
          this.currentPage = 1;
          this.applyFilters();
        }, 300);
      });
    }

    // Filters
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document
          .querySelectorAll(".filter-btn")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentFilter = e.target.dataset.filter;
        this.currentPage = 1;
        this.applyFilters();
      });
    });

    // Sorting
    document.querySelectorAll(".sortable").forEach((th) => {
      th.addEventListener("click", (e) => {
        const sort = e.currentTarget.dataset.sort;
        this.sortUsers(sort);
      });
    });

    // Export
    const exportBtn = document.getElementById("exportUsersBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportUsers());
    }

    // Refresh
    const refreshBtn = document.getElementById("refreshUsersBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.loadUsers());
    }

    // Page size selector
    const pageSizeSelect = document.getElementById("pageSizeSelect");
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", (e) => {
        this.pageSize =
          e.target.value === "all" ? Infinity : parseInt(e.target.value);
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
      });
    }

    // Select all checkbox
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.selectAllVisible();
        } else {
          this.clearSelection();
        }
      });
    }

    // Pagination buttons
    document
      .getElementById("firstPage")
      ?.addEventListener("click", () => this.goToPage(1));
    document
      .getElementById("prevPage")
      ?.addEventListener("click", () => this.goToPage(this.currentPage - 1));
    document
      .getElementById("nextPage")
      ?.addEventListener("click", () => this.goToPage(this.currentPage + 1));
    document
      .getElementById("lastPage")
      ?.addEventListener("click", () => this.goToPage(this.getTotalPages()));
  },

  /**
   * Normalize Graph API user data to UI format
   * Converts raw API fields to consistent properties used by the UI
   */
  normalizeUser(user) {
    const now = new Date();
    const inactivityThreshold = new Date();
    inactivityThreshold.setDate(
      now.getDate() - (Config?.ui?.inactivityDays || 90)
    );

    // Determine status based on accountEnabled and lastSignIn
    let status = "active";
    if (!user.accountEnabled) {
      status = "disabled";
    } else if (user.signInActivity?.lastSignInDateTime) {
      const lastSignIn = new Date(user.signInActivity.lastSignInDateTime);
      if (lastSignIn < inactivityThreshold) {
        status = "inactive";
      }
    } else {
      status = "inactive"; // No sign-in recorded
    }

    // Format last sign-in date
    let lastSignIn = "Never";
    if (user.signInActivity?.lastSignInDateTime) {
      const date = new Date(user.signInActivity.lastSignInDateTime);
      lastSignIn = date.toLocaleDateString();
    }

    return {
      id: user.id,
      displayName: user.displayName || "Unknown",
      email: user.mail || user.userPrincipalName || "",
      userPrincipalName: user.userPrincipalName || "",
      userType: user.userType || "Member",
      accountEnabled: user.accountEnabled ?? true,
      status: status,
      lastSignIn: lastSignIn,
      lastSignInDateTime: user.signInActivity?.lastSignInDateTime || null,
      createdDateTime: user.createdDateTime,
      assignedLicenses: user.assignedLicenses || [],
      // Real MFA status from authentication methods API
      mfaEnabled: user.mfaRegistered || false,
      mfaRegistered: user.mfaRegistered || false,
      mfaCapable: user.mfaCapable || false,
      mfaMethods: user.mfaMethods || [],
      defaultMfaMethod: user.defaultMfaMethod || null,
      // Keep original data for reference
      _raw: user,
    };
  },

  /**
   * Load users data with skeleton loading
   */
  async loadUsers() {
    if (this.isLoading) return;
    this.isLoading = true;

    const tbody = document.getElementById("usersTableBody");

    // Show skeleton loading instead of spinner
    if (tbody && typeof SkeletonLoader !== "undefined") {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="padding: 0;">
            ${SkeletonLoader.userList(10)}
          </td>
        </tr>
      `;
    } else if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-cell">
            <div class="loading-spinner"></div>
            <span>Loading users...</span>
          </td>
        </tr>
      `;
    }

    try {
      // Require real API - no mock data fallback
      if (App.useRealApi && (GraphAPI.accessToken || GraphAPI.useBackendApi)) {
        console.log("📡 Fetching users with MFA status from Graph API...");

        // Use the new method that includes real MFA status
        let rawUsers;
        if (typeof GraphAPI.getUsersWithMfaStatus === "function") {
          rawUsers = await GraphAPI.getUsersWithMfaStatus();
        } else {
          rawUsers = await GraphAPI.getUsers();
        }

        // Normalize Graph API data to UI format
        this.users = rawUsers.map((user) => this.normalizeUser(user));
        console.log(`✅ Loaded ${this.users.length} users with MFA status`);

        // Show success toast
        if (typeof Toast !== "undefined") {
          Toast.success(`Loaded ${this.users.length} users`);
        }
      } else {
        // Show message that authentication is required
        console.log("⚠️ Authentication required to load user data");
        console.log("  App.useRealApi:", App.useRealApi);
        console.log(
          "  GraphAPI.accessToken:",
          GraphAPI.accessToken ? "present" : "missing"
        );
        this.users = [];
        document.getElementById("usersTableBody").innerHTML = `
          <tr>
            <td colspan="8" class="loading-cell">
              <span>🔐 Please sign in to view user data</span>
            </td>
          </tr>
        `;
        this.isLoading = false;
        return;
      }

      this.selectedUsers.clear();
      this.updateBulkActionsBar();
      this.updateStats();
      this.applyFilters();
    } catch (error) {
      console.error("Failed to load users:", error);
      this.showError("Failed to load users: " + error.message);

      // Show error toast
      if (typeof Toast !== "undefined") {
        Toast.error("Failed to load users: " + error.message);
      }

      document.getElementById("usersTableBody").innerHTML = `
        <tr>
          <td colspan="8" class="loading-cell">
            <span>❌ Error loading users: ${error.message}</span>
          </td>
        </tr>
      `;
    } finally {
      this.isLoading = false;
    }
  },

  /**
   * Update statistics
   */
  updateStats() {
    const members = this.users.filter((u) => u.userType === "Member").length;
    const guests = this.users.filter((u) => u.userType === "Guest").length;
    const active = this.users.filter((u) => u.status === "active").length;
    const inactive = this.users.filter((u) => u.status === "inactive").length;
    const disabled = this.users.filter((u) => u.status === "disabled").length;
    const noMfa = this.users.filter((u) => !u.mfaEnabled).length;

    document.getElementById("statMembers").textContent = members;
    document.getElementById("statGuests").textContent = guests;
    document.getElementById("statActive").textContent = active;
    document.getElementById("statInactive").textContent = inactive;
    document.getElementById("statDisabled").textContent = disabled;
    document.getElementById("statNoMfa").textContent = noMfa;
  },

  /**
   * Set filter programmatically (from stat card clicks)
   */
  setFilter(filter) {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    const btn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
    if (btn) btn.classList.add("active");
    this.currentFilter = filter;
    this.currentPage = 1;
    this.applyFilters();
  },

  /**
   * Apply filters and search
   */
  applyFilters() {
    this.filteredUsers = this.users.filter((user) => {
      // Apply type/status filter
      let matchesFilter = true;
      switch (this.currentFilter) {
        case "members":
          matchesFilter = user.userType === "Member";
          break;
        case "guests":
          matchesFilter = user.userType === "Guest";
          break;
        case "active":
          matchesFilter = user.status === "active";
          break;
        case "inactive":
          matchesFilter = user.status === "inactive";
          break;
        case "disabled":
          matchesFilter = user.status === "disabled";
          break;
        case "noMfa":
          matchesFilter = !user.mfaEnabled;
          break;
      }

      // Apply search
      const matchesSearch =
        !this.searchTerm ||
        user.displayName.toLowerCase().includes(this.searchTerm) ||
        user.email.toLowerCase().includes(this.searchTerm) ||
        (user.department &&
          user.department.toLowerCase().includes(this.searchTerm)) ||
        (user.jobTitle &&
          user.jobTitle.toLowerCase().includes(this.searchTerm));

      return matchesFilter && matchesSearch;
    });

    // Update result count
    const countEl = document.getElementById("tableResultCount");
    if (countEl) {
      const filterText =
        this.currentFilter !== "all" ? ` (${this.currentFilter})` : "";
      const searchText = this.searchTerm
        ? ` matching "${this.searchTerm}"`
        : "";
      countEl.textContent = `Showing ${this.filteredUsers.length} of ${this.users.length} users${filterText}${searchText}`;
    }

    this.renderTable();
    this.updatePagination();
  },

  /**
   * Sort users
   */
  sortUsers(field) {
    // Toggle direction if same field, otherwise reset to ascending
    if (this.currentSort === field) {
      this.sortDirection *= -1;
    } else {
      this.currentSort = field;
      this.sortDirection = 1;
    }

    // Update sort icons
    document.querySelectorAll(".sortable").forEach((th) => {
      const icon = th.querySelector(".sort-icon");
      if (th.dataset.sort === field) {
        icon.textContent = this.sortDirection === 1 ? "↑" : "↓";
        th.classList.add("sorted");
      } else {
        icon.textContent = "↕";
        th.classList.remove("sorted");
      }
    });

    this.filteredUsers.sort((a, b) => {
      let valA = a[field] || "";
      let valB = b[field] || "";

      if (field === "lastSignIn") {
        valA = new Date(valA || 0);
        valB = new Date(valB || 0);
      }

      if (field === "mfa") {
        valA = a.mfaEnabled ? 1 : 0;
        valB = b.mfaEnabled ? 1 : 0;
      }

      if (valA < valB) return -1 * this.sortDirection;
      if (valA > valB) return 1 * this.sortDirection;
      return 0;
    });

    this.renderTable();
  },

  /**
   * Get paginated users
   */
  getPaginatedUsers() {
    if (this.pageSize === Infinity) {
      return this.filteredUsers;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  },

  /**
   * Get total pages
   */
  getTotalPages() {
    if (this.pageSize === Infinity) return 1;
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  },

  /**
   * Go to specific page
   */
  goToPage(page) {
    const totalPages = this.getTotalPages();
    this.currentPage = Math.max(1, Math.min(page, totalPages));
    this.renderTable();
    this.updatePagination();
  },

  /**
   * Update pagination controls
   */
  updatePagination() {
    const totalPages = this.getTotalPages();
    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) {
      const start =
        this.pageSize === Infinity
          ? 1
          : (this.currentPage - 1) * this.pageSize + 1;
      const end =
        this.pageSize === Infinity
          ? this.filteredUsers.length
          : Math.min(
              this.currentPage * this.pageSize,
              this.filteredUsers.length
            );
      pageInfo.textContent = `${start}-${end} of ${this.filteredUsers.length} (Page ${this.currentPage} of ${totalPages})`;
    }

    const firstBtn = document.getElementById("firstPage");
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    const lastBtn = document.getElementById("lastPage");

    if (firstBtn) firstBtn.disabled = this.currentPage <= 1;
    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    if (lastBtn) lastBtn.disabled = this.currentPage >= totalPages;
  },

  /**
   * Render table
   */
  renderTable() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    const paginatedUsers = this.getPaginatedUsers();

    if (paginatedUsers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-cell">
            <div class="empty-state">
              <span class="empty-icon">👥</span>
              <p>No users found</p>
              ${
                this.searchTerm || this.currentFilter !== "all"
                  ? '<button class="btn btn-secondary btn-sm" onclick="UsersPage.clearFilters()">Clear Filters</button>'
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = paginatedUsers
      .map(
        (user) => `
      <tr class="user-row ${
        this.selectedUsers.has(user.id) ? "selected" : ""
      }" data-user-id="${user.id}">
        <td class="checkbox-col">
          <input type="checkbox" class="user-checkbox" data-user-id="${
            user.id
          }" 
                 ${this.selectedUsers.has(user.id) ? "checked" : ""}
                 onchange="UsersPage.toggleUserSelection('${user.id}')">
        </td>
        <td>
          <div class="user-cell">
            <div class="user-avatar" style="background-color: ${this.getAvatarColor(
              user.displayName
            )}">
              ${this.getInitials(user.displayName)}
            </div>
            <div class="user-info">
              <span class="user-name">${user.displayName}</span>
              ${
                user.jobTitle
                  ? `<span class="user-title">${user.jobTitle}</span>`
                  : ""
              }
            </div>
          </div>
        </td>
        <td>
          <div class="email-cell">
            <span class="user-email">${user.email}</span>
            ${
              user.department
                ? `<span class="user-dept">${user.department}</span>`
                : ""
            }
          </div>
        </td>
        <td>
          <span class="badge badge-${user.userType.toLowerCase()}">${
          user.userType
        }</span>
        </td>
        <td>
          <span class="status-indicator status-${user.status}">
            ${this.getStatusIcon(user.status)} ${user.status}
          </span>
        </td>
        <td>
          <span class="signin-date ${
            this.isInactive(user.lastSignIn) ? "inactive-warning" : ""
          }">
            ${user.lastSignIn ? this.formatDate(user.lastSignIn) : "Never"}
          </span>
        </td>
        <td>
          <span class="mfa-badge mfa-${
            user.mfaEnabled ? "enabled" : "disabled"
          }">
            ${user.mfaEnabled ? "✓ Enabled" : "✗ Disabled"}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn" title="View Details" onclick="UsersPage.viewUser('${
              user.id
            }')">👁</button>
            <button class="action-btn" title="Copy Email" onclick="UsersPage.copyEmail('${
              user.email
            }')">📋</button>
            ${this.renderRemediationActions(user)}
          </div>
        </td>
      </tr>
    `
      )
      .join("");

    // Update select all checkbox state
    this.updateSelectAllCheckbox();
  },

  /**
   * Check if a date is inactive (more than 30 days ago)
   */
  isInactive(dateStr) {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date < thirtyDaysAgo;
  },

  /**
   * Clear all filters
   */
  clearFilters() {
    this.searchTerm = "";
    this.currentFilter = "all";
    this.currentPage = 1;
    document.getElementById("userSearch").value = "";
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector('.filter-btn[data-filter="all"]')
      ?.classList.add("active");
    this.applyFilters();
  },

  /**
   * Copy email to clipboard
   */
  copyEmail(email) {
    navigator.clipboard.writeText(email).then(() => {
      // Show brief notification
      const notification = document.createElement("div");
      notification.className = "copy-notification";
      notification.textContent = "Email copied!";
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    });
  },

  // Selection methods
  toggleUserSelection(userId) {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
    this.updateBulkActionsBar();
    this.updateSelectAllCheckbox();

    // Update row highlight
    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
    if (row) {
      row.classList.toggle("selected", this.selectedUsers.has(userId));
    }
  },

  selectAllVisible() {
    const paginatedUsers = this.getPaginatedUsers();
    paginatedUsers.forEach((user) => this.selectedUsers.add(user.id));
    this.updateBulkActionsBar();
    this.renderTable();
  },

  selectAll() {
    this.filteredUsers.forEach((user) => this.selectedUsers.add(user.id));
    this.updateBulkActionsBar();
    this.renderTable();
  },

  clearSelection() {
    this.selectedUsers.clear();
    this.updateBulkActionsBar();
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    document
      .querySelectorAll(".user-row")
      .forEach((row) => row.classList.remove("selected"));
    document
      .querySelectorAll(".user-checkbox")
      .forEach((cb) => (cb.checked = false));
  },

  updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    if (!selectAllCheckbox) return;

    const paginatedUsers = this.getPaginatedUsers();
    const allSelected =
      paginatedUsers.length > 0 &&
      paginatedUsers.every((u) => this.selectedUsers.has(u.id));
    const someSelected = paginatedUsers.some((u) =>
      this.selectedUsers.has(u.id)
    );

    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = someSelected && !allSelected;
  },

  updateBulkActionsBar() {
    const bar = document.getElementById("bulkActionsBar");
    const countEl = document.getElementById("selectedCount");
    if (bar && countEl) {
      const count = this.selectedUsers.size;
      bar.style.display = count > 0 ? "flex" : "none";
      countEl.textContent = count;
    }
  },

  /**
   * Perform bulk action on selected users
   */
  bulkAction(action) {
    const selectedUserObjects = this.users.filter((u) =>
      this.selectedUsers.has(u.id)
    );
    if (selectedUserObjects.length === 0) {
      alert("No users selected");
      return;
    }

    switch (action) {
      case "sendMfaReminder":
        const noMfaUsers = selectedUserObjects.filter((u) => !u.mfaEnabled);
        if (noMfaUsers.length === 0) {
          alert("All selected users already have MFA enabled");
          return;
        }
        if (
          confirm(
            `Send MFA registration reminder to ${noMfaUsers.length} users without MFA?`
          )
        ) {
          alert(
            `MFA reminders would be sent to:\n${noMfaUsers
              .map((u) => u.email)
              .join("\n")}`
          );
        }
        break;
      case "disable":
        const enabledUsers = selectedUserObjects.filter(
          (u) => u.status !== "disabled"
        );
        if (enabledUsers.length === 0) {
          alert("All selected users are already disabled");
          return;
        }
        if (
          confirm(
            `Disable ${enabledUsers.length} user account(s)? This requires admin permissions.`
          )
        ) {
          alert(
            "This would require Graph API write permissions to disable accounts."
          );
        }
        break;
    }
  },

  /**
   * Export only selected users
   */
  exportSelectedUsers() {
    const selectedUserObjects = this.users.filter((u) =>
      this.selectedUsers.has(u.id)
    );
    if (selectedUserObjects.length === 0) {
      alert("No users selected");
      return;
    }

    if (typeof ExportUtils !== "undefined") {
      ExportUtils.exportUsers(selectedUserObjects);
    } else {
      this.exportUsersData(selectedUserObjects);
    }
  },

  /**
   * Export users to CSV/Excel or PDF
   */
  exportUsers(format = "csv") {
    // If PDF export is requested or available
    if (format === "pdf" && typeof PDFExport !== "undefined") {
      PDFExport.exportUsers(this.filteredUsers, {
        title: "User Directory Report",
        subtitle: `${this.filteredUsers.length} users exported`,
      });
      return;
    }

    if (typeof ExportUtils !== "undefined") {
      ExportUtils.exportUsers(this.filteredUsers);
      if (typeof Toast !== "undefined") {
        Toast.success(`Exported ${this.filteredUsers.length} users to CSV`);
      }
    } else {
      // Fallback to basic CSV export
      const headers = [
        "Display Name",
        "Email",
        "Type",
        "Status",
        "Last Sign-in",
        "MFA",
      ];
      const rows = this.filteredUsers.map((u) => [
        u.displayName,
        u.email,
        u.userType,
        u.status,
        u.lastSignIn || "Never",
        u.mfaEnabled ? "Enabled" : "Disabled",
      ]);

      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();

      if (typeof Toast !== "undefined") {
        Toast.success(`Exported ${this.filteredUsers.length} users to CSV`);
      }
    }
  },

  /**
   * Export users to PDF
   */
  exportToPDF() {
    if (typeof PDFExport !== "undefined") {
      PDFExport.exportUsers(this.filteredUsers, {
        title: "User Directory Report",
        subtitle: `${this.filteredUsers.length} users`,
      });
    } else {
      if (typeof Toast !== "undefined") {
        Toast.error("PDF export not available");
      } else {
        alert("PDF export not available");
      }
    }
  },

  /**
   * View user details in modal
   */
  viewUser(userId) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return;

    const modal = document.getElementById("userDetailsModal");
    const title = document.getElementById("userModalTitle");
    const body = document.getElementById("userModalBody");

    if (!modal || !title || !body) return;

    title.textContent = user.displayName;
    body.innerHTML = `
      <div class="user-modal-content">
        <div class="user-modal-header">
          <div class="user-avatar-lg" style="background-color: ${this.getAvatarColor(
            user.displayName
          )}">
            ${this.getInitials(user.displayName)}
          </div>
          <div class="user-modal-info">
            <h2>${user.displayName}</h2>
            <p class="user-email-lg">${user.email}</p>
            <div class="user-badges">
              <span class="badge badge-${user.userType.toLowerCase()}">${
      user.userType
    }</span>
              <span class="status-indicator status-${
                user.status
              }">${this.getStatusIcon(user.status)} ${user.status}</span>
              <span class="mfa-badge mfa-${
                user.mfaEnabled ? "enabled" : "disabled"
              }">${user.mfaEnabled ? "✓ MFA Enabled" : "✗ MFA Disabled"}</span>
            </div>
          </div>
        </div>
        
        <div class="user-details-grid">
          <div class="detail-section">
            <h4>📋 Basic Information</h4>
            <div class="detail-row"><span class="detail-label">Display Name:</span> <span>${
              user.displayName
            }</span></div>
            <div class="detail-row"><span class="detail-label">Email:</span> <span>${
              user.email
            }</span></div>
            <div class="detail-row"><span class="detail-label">User Principal Name:</span> <span>${
              user.userPrincipalName || user.email
            }</span></div>
            <div class="detail-row"><span class="detail-label">User Type:</span> <span>${
              user.userType
            }</span></div>
            <div class="detail-row"><span class="detail-label">Account Status:</span> <span class="status-${
              user.status
            }">${user.status}</span></div>
          </div>
          
          <div class="detail-section">
            <h4>🏢 Organization</h4>
            <div class="detail-row"><span class="detail-label">Job Title:</span> <span>${
              user.jobTitle || "Not set"
            }</span></div>
            <div class="detail-row"><span class="detail-label">Department:</span> <span>${
              user.department || "Not set"
            }</span></div>
            <div class="detail-row"><span class="detail-label">Company:</span> <span>${
              user.companyName || "Not set"
            }</span></div>
            <div class="detail-row"><span class="detail-label">Office Location:</span> <span>${
              user.officeLocation || "Not set"
            }</span></div>
            <div class="detail-row"><span class="detail-label">Manager:</span> <span>${
              user.manager || "Not set"
            }</span></div>
          </div>
          
          <div class="detail-section">
            <h4>📞 Contact</h4>
            <div class="detail-row"><span class="detail-label">Mobile Phone:</span> <span>${
              user.mobilePhone || "Not set"
            }</span></div>
            <div class="detail-row"><span class="detail-label">Business Phone:</span> <span>${
              user.businessPhones?.join(", ") || "Not set"
            }</span></div>
          </div>
          
          <div class="detail-section">
            <h4>🔐 Security</h4>
            <div class="detail-row"><span class="detail-label">MFA Status:</span> <span class="mfa-${
              user.mfaEnabled ? "enabled" : "disabled"
            }">${user.mfaEnabled ? "Enabled" : "Not Configured"}</span></div>
            <div class="detail-row"><span class="detail-label">Last Sign-in:</span> <span class="${
              this.isInactive(user.lastSignIn) ? "inactive-warning" : ""
            }">${
      user.lastSignIn
        ? this.formatDate(user.lastSignIn) +
          " (" +
          new Date(user.lastSignIn).toLocaleDateString() +
          ")"
        : "Never"
    }</span></div>
            <div class="detail-row"><span class="detail-label">Created:</span> <span>${
              user.createdDateTime
                ? new Date(user.createdDateTime).toLocaleDateString()
                : "Unknown"
            }</span></div>
          </div>
          
          ${
            user.assignedLicenses && user.assignedLicenses.length > 0
              ? `
          <div class="detail-section full-width">
            <h4>📜 Assigned Licenses</h4>
            <div class="license-tags">
              ${user.assignedLicenses
                .map(
                  (l) => `<span class="license-tag">${l.name || l.skuId}</span>`
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="user-modal-actions">
          <button class="btn btn-secondary" onclick="UsersPage.copyEmail('${
            user.email
          }')">📋 Copy Email</button>
          ${
            !user.mfaEnabled
              ? `<button class="btn btn-warning" onclick="UsersPage.sendMfaReminder('${user.email}')">📧 Send MFA Reminder</button>`
              : ""
          }
          ${this.renderRemediationActions(user)}
        </div>
      </div>
    `;

    modal.style.display = "flex";

    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) this.closeUserModal();
    };
  },

  /**
   * Close user details modal
   */
  closeUserModal() {
    const modal = document.getElementById("userDetailsModal");
    if (modal) modal.style.display = "none";
  },

  /**
   * Send MFA reminder to user
   */
  sendMfaReminder(email) {
    alert(`MFA registration reminder would be sent to: ${email}`);
  },

  /**
   * Edit user
   */
  editUser(userId) {
    alert(
      "Edit functionality requires admin permissions and Graph API write access."
    );
  },

  /**
   * Helper functions
   */
  getInitials(name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  },

  getAvatarColor(name) {
    const colors = [
      "#0066b3",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  },

  getStatusIcon(status) {
    const icons = { active: "✓", inactive: "⏸", disabled: "🚫" };
    return icons[status] || "?";
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  },

  showError(message) {
    console.error(message);
  },

  /**
   * Render remediation action buttons for a user (Admin only)
   * @param {Object} user - User object
   * @returns {string} HTML for action buttons
   */
  renderRemediationActions(user) {
    // Check if Remediation module and RBAC are available
    if (typeof Remediation === "undefined" || typeof RBAC === "undefined") {
      return "";
    }

    const perms = RBAC.getUIPermissions();
    const buttons = [];

    // Prepare user data for onclick handlers
    const userData = {
      id: user.id,
      displayName: user.displayName,
      userPrincipalName: user.email,
      accountEnabled: user.status !== "disabled",
    };
    const userDataStr = JSON.stringify(userData).replace(/"/g, "&quot;");

    // Disable/Enable user button
    if (perms.canDisableUser && user.status !== "disabled") {
      buttons.push(`
        <button class="action-btn action-disable" title="Disable User" 
                onclick='Remediation.disableUser(${JSON.stringify(userData)})'>
          🔒
        </button>
      `);
    }

    if (perms.canEnableUser && user.status === "disabled") {
      buttons.push(`
        <button class="action-btn action-enable" title="Enable User" 
                onclick='Remediation.enableUser(${JSON.stringify(userData)})'>
          🔓
        </button>
      `);
    }

    // Revoke sessions button
    if (perms.canRevokeSessions) {
      buttons.push(`
        <button class="action-btn action-revoke" title="Revoke Sessions" 
                onclick='Remediation.revokeUserSessions(${JSON.stringify(
                  userData
                )})'>
          🚫
        </button>
      `);
    }

    return buttons.join("");
  },
};
