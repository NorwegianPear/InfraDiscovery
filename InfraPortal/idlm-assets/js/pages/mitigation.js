/**
 * Mitigation Page Module
 * Task planning, remediation tracking, and security recommendations
 */

const MitigationPage = {
  tasks: [],
  recommendations: [],
  filters: {
    status: "all",
    priority: "all",
    category: "all",
    search: "",
  },
  sortBy: "priority", // priority, dueDate, created, title
  sortOrder: "asc",
  selectedTasks: new Set(),

  /**
   * Check if user has permission for an action
   */
  checkPermission(permission, showAlert = true) {
    if (typeof RBAC !== "undefined") {
      return RBAC.requirePermission(permission, showAlert);
    }
    return true; // Allow if RBAC not loaded
  },

  /**
   * Get current user's UI permissions
   */
  getUIPermissions() {
    if (typeof RBAC !== "undefined") {
      return RBAC.getUIPermissions();
    }
    return {
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canCompleteTask: true,
      canAcceptRecommendation: true,
      canDismissRecommendation: true,
      canExportData: true,
      canApproveActions: false,
      canRejectActions: false,
      canViewPendingApprovals: false,
    };
  },

  /**
   * Initialize the page
   */
  async init() {
    console.log("🛡️ Initializing Mitigation page");

    // Load tasks from storage
    this.loadTasks();

    // Generate recommendations based on current data
    await this.generateRecommendations();

    // Setup event listeners
    this.setupEventListeners();

    // Render tasks and recommendations
    this.renderTasks();
    this.renderRecommendations();
    this.updateStats();

    // Update UI based on permissions
    this.updateUIForPermissions();

    // Show pending approvals section for admins
    this.renderPendingApprovals();

    // Inject playbook styles
    this.injectPlaybookStyles();

    // Handle quick start guide visibility
    if (!this.shouldShowQuickStart()) {
      const guide = document.getElementById("quickStartGuide");
      if (guide) guide.style.display = "none";
    }
  },

  /**
   * Render pending approvals section (Admin only)
   */
  renderPendingApprovals() {
    const section = document.getElementById("pendingApprovalsSection");
    const content = document.getElementById("pendingApprovalsContent");
    const badge = document.getElementById("pendingApprovalsBadge");

    if (!section || !content) return;

    // Check if user can view pending approvals
    const perms = this.getUIPermissions();
    if (!perms.canViewPendingApprovals && !perms.canApproveActions) {
      section.style.display = "none";
      return;
    }

    // Get pending approvals from Remediation module
    if (typeof Remediation !== "undefined") {
      const pending = Remediation.getPendingApprovals();

      // Show section
      section.style.display = "block";

      // Update badge
      if (badge) {
        badge.textContent = pending.length;
        badge.style.display = pending.length > 0 ? "inline-block" : "none";
      }

      // Render content
      content.innerHTML = Remediation.renderPendingApprovalsUI();

      // Add styles for pending approvals
      this.injectPendingApprovalStyles();
    }
  },

  /**
   * Inject CSS for pending approvals
   */
  injectPendingApprovalStyles() {
    if (document.getElementById("pending-approval-styles")) return;

    const styles = document.createElement("style");
    styles.id = "pending-approval-styles";
    styles.textContent = `
      .pending-approvals-section {
        background: var(--bg-primary, #fff);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        border: 2px solid #ffc107;
      }

      .pending-approvals-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .pending-approval-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: var(--bg-secondary, #f5f5f5);
        border-radius: 8px;
        border-left: 4px solid #ffc107;
      }

      .pending-info {
        flex: 1;
      }

      .pending-action {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 4px;
      }

      .pending-description {
        color: var(--text-secondary, #666);
        font-size: 14px;
        margin-bottom: 8px;
      }

      .pending-meta {
        font-size: 12px;
        color: var(--text-tertiary, #999);
        display: flex;
        gap: 8px;
      }

      .pending-actions {
        display: flex;
        gap: 8px;
      }

      .pending-actions .btn-sm {
        padding: 8px 16px;
        font-size: 13px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-weight: 500;
      }

      .pending-actions .btn-success {
        background: #28a745;
        color: white;
      }

      .pending-actions .btn-danger {
        background: #dc3545;
        color: white;
      }

      .pending-actions .btn-sm:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }

      .pending-status {
        font-size: 13px;
        color: #ffc107;
        font-weight: 500;
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Update UI elements based on user permissions
   */
  updateUIForPermissions() {
    const perms = this.getUIPermissions();

    // Hide/disable Add Task button if no permission
    const addTaskBtn = document.getElementById("addTaskBtn");
    if (addTaskBtn) {
      if (!perms.canCreateTask) {
        addTaskBtn.style.display = "none";
      }
    }

    // Hide/disable Export button if no permission
    const exportBtn = document.getElementById("exportTasksBtn");
    if (exportBtn) {
      if (!perms.canExportData) {
        exportBtn.style.display = "none";
      }
    }

    // Show role badge
    this.showRoleBadge();
  },

  /**
   * Show user's role badge in the header
   */
  showRoleBadge() {
    if (typeof RBAC === "undefined") return;

    const sectionHeader = document.querySelector(
      ".tasks-section .section-header h2"
    );
    if (sectionHeader) {
      const roleInfo = RBAC.getRoleInfo();
      const badge = document.createElement("span");
      badge.className = `role-indicator role-${roleInfo.role}`;
      badge.innerHTML = `${roleInfo.icon} ${roleInfo.name}`;
      badge.style.cssText =
        "font-size: 12px; margin-left: 12px; padding: 4px 8px; background: var(--bg-secondary); border-radius: 4px; font-weight: normal;";
      sectionHeader.appendChild(badge);
    }
  },

  /**
   * Render the page HTML
   */
  render() {
    return `
      <div class="mitigation-page">
        <!-- Page Header with Stats and Progress -->
        <div class="mitigation-header">
          <!-- Progress Bar -->
          <div class="progress-section">
            <div class="progress-info">
              <span class="progress-label">Overall Progress</span>
              <span class="progress-value" id="progressPercent">0%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar" id="progressBar" style="width: 0%"></div>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-icon">📋</div>
              <div class="stat-info">
                <span class="stat-value" id="totalTasks">0</span>
                <span class="stat-label">Total Tasks</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⏳</div>
              <div class="stat-info">
                <span class="stat-value" id="pendingTasks">0</span>
                <span class="stat-label">Pending</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🔄</div>
              <div class="stat-info">
                <span class="stat-value" id="inProgressTasks">0</span>
                <span class="stat-label">In Progress</span>
              </div>
            </div>
            <div class="stat-card success">
              <div class="stat-icon">✅</div>
              <div class="stat-info">
                <span class="stat-value" id="completedTasks">0</span>
                <span class="stat-label">Completed</span>
              </div>
            </div>
            <div class="stat-card warning">
              <div class="stat-icon">⚠️</div>
              <div class="stat-info">
                <span class="stat-value" id="overdueTasks">0</span>
                <span class="stat-label">Overdue</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Start Guide -->
        <div class="quick-start-guide" id="quickStartGuide">
          <div class="guide-header" onclick="MitigationPage.toggleQuickStart()">
            <h3>📖 Getting Started with Remediation</h3>
            <span class="toggle-icon" id="quickStartToggle">▼</span>
          </div>
          <div class="guide-content" id="quickStartContent">
            <div class="guide-steps">
              <div class="guide-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h4>Review AI Recommendations</h4>
                  <p>Our AI analyzes your environment and suggests improvements based on security best practices, license optimization, and compliance requirements.</p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h4>Create Tasks from Recommendations</h4>
                  <p>Click "Create Task" on any recommendation to add it to your task list. Each task includes detailed instructions on how to complete it.</p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h4>Follow Step-by-Step Instructions</h4>
                  <p>Each task includes Azure portal links, PowerShell commands, and detailed guidance. Click "View Instructions" on any task to get started.</p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">4</div>
                <div class="step-content">
                  <h4>Track Progress & Complete</h4>
                  <p>Update task status as you work. Mark tasks complete when done. Schedule recurring reviews for ongoing compliance.</p>
                </div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="MitigationPage.hideQuickStartPermanently()">Don't show again</button>
          </div>
        </div>

        <!-- Remediation Guides Section -->
        <div class="remediation-guides-section">
          <div class="section-header">
            <h2>📚 Remediation Playbooks</h2>
            <span class="badge" id="playbookCount">8 guides</span>
          </div>
          <div class="playbooks-grid" id="playbooksGrid">
            ${this.renderPlaybooksGrid()}
          </div>
        </div>

        <!-- Main Content Grid -->
        <div class="mitigation-content">
          <!-- Pending Approvals Section (Admin Only) -->
          <section class="pending-approvals-section" id="pendingApprovalsSection" style="display: none;">
            <div class="section-header">
              <h2>⏳ Pending Approvals</h2>
              <span class="badge warning" id="pendingApprovalsBadge">0</span>
            </div>
            <div class="pending-approvals-content" id="pendingApprovalsContent">
              <div class="empty-state">
                <span class="empty-icon">✅</span>
                <p>No pending approvals</p>
              </div>
            </div>
          </section>

          <!-- Recommendations Section -->
          <section class="recommendations-section">
            <div class="section-header">
              <h2>🎯 AI Recommendations</h2>
              <div class="header-actions">
                <span class="badge" id="recommendationCount">0 items</span>
                <button class="btn btn-sm" onclick="MitigationPage.refreshRecommendations()" title="Refresh recommendations">🔄 Refresh</button>
              </div>
            </div>
            <p class="section-description">Based on your environment analysis, we recommend the following actions to improve security, optimize costs, and maintain compliance.</p>
            <div class="recommendations-list" id="recommendationsList">
              <div class="loading-placeholder">Analyzing your environment...</div>
            </div>
          </section>

          <!-- Tasks Section -->
          <section class="tasks-section">
            <div class="section-header">
              <h2>📋 Mitigation Tasks</h2>
              <div class="section-actions">
                <button class="btn btn-primary" id="addTaskBtn">
                  <span>➕</span> Add Task
                </button>
                <button class="btn btn-secondary" id="exportTasksBtn">
                  <span>📥</span> Export
                </button>
              </div>
            </div>

            <!-- Filters -->
            <!-- Search and Sort Bar -->
            <div class="task-toolbar">
              <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" id="taskSearch" placeholder="Search tasks..." />
              </div>
              <div class="sort-group">
                <label>Sort by:</label>
                <select id="sortBy">
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due Date</option>
                  <option value="created">Created Date</option>
                  <option value="title">Title</option>
                  <option value="status">Status</option>
                </select>
                <button class="sort-order-btn" id="sortOrderBtn" title="Toggle sort order">↑</button>
              </div>
            </div>

            <!-- Filters -->
            <div class="task-filters">
              <div class="filter-group">
                <label>Status:</label>
                <select id="filterStatus">
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Priority:</label>
                <select id="filterPriority">
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div class="filter-group">
                <label>Category:</label>
                <select id="filterCategory">
                  <option value="all">All</option>
                  <option value="security">Security</option>
                  <option value="compliance">Compliance</option>
                  <option value="licenses">Licenses</option>
                  <option value="users">Users</option>
                  <option value="access">Access Review</option>
                </select>
              </div>
            </div>

            <!-- Bulk Actions Bar (appears when tasks selected) -->
            <div class="bulk-actions-bar" id="bulkActionsBar" style="display: none;">
              <span class="selection-count" id="selectionCount">0 selected</span>
              <div class="bulk-buttons">
                <button class="btn btn-sm" id="selectAllBtn">Select All</button>
                <button class="btn btn-sm btn-success" id="bulkCompleteBtn">✓ Complete</button>
                <button class="btn btn-sm btn-warning" id="bulkInProgressBtn">🔄 In Progress</button>
                <button class="btn btn-sm btn-danger" id="bulkDeleteBtn">🗑️ Delete</button>
                <button class="btn btn-sm" id="clearSelectionBtn">✕ Clear</button>
              </div>
            </div>

            <!-- Tasks List -->
            <div class="tasks-list" id="tasksList">
              <div class="empty-state">No tasks yet. Add your first task or accept a recommendation.</div>
            </div>
          </section>
        </div>

        <!-- Add/Edit Task Modal -->
        <div class="modal" id="taskModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3 id="modalTitle">Add Task</h3>
              <button class="modal-close" id="closeModal">&times;</button>
            </div>
            <form id="taskForm">
              <input type="hidden" id="taskId" />
              
              <div class="form-group">
                <label for="taskTitle">Title *</label>
                <input type="text" id="taskTitle" required placeholder="Enter task title" />
              </div>
              
              <div class="form-group">
                <label for="taskDescription">Description</label>
                <textarea id="taskDescription" rows="3" placeholder="Describe the task..."></textarea>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="taskCategory">Category</label>
                  <select id="taskCategory">
                    <option value="security">🔒 Security</option>
                    <option value="compliance">📋 Compliance</option>
                    <option value="licenses">📜 Licenses</option>
                    <option value="users">👥 Users</option>
                    <option value="access">🔑 Access Review</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="taskPriority">Priority</label>
                  <select id="taskPriority">
                    <option value="critical">🔴 Critical</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="taskDueDate">Due Date</label>
                  <input type="date" id="taskDueDate" />
                </div>
                <div class="form-group">
                  <label for="taskAssignee">Assignee</label>
                  <input type="text" id="taskAssignee" placeholder="Who is responsible?" />
                </div>
              </div>

              <div class="form-group">
                <label for="taskSchedule">Schedule (Optional)</label>
                <select id="taskSchedule">
                  <option value="none">No schedule</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="taskNotes">Notes</label>
                <textarea id="taskNotes" rows="2" placeholder="Additional notes..."></textarea>
              </div>
              
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" id="cancelTask">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <style>
        .mitigation-page {
          padding: 0;
        }
        
        .mitigation-header {
          margin-bottom: 24px;
        }

        /* Progress Bar */
        .progress-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 16px;
        }

        .progress-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .progress-label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .progress-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-color);
        }

        .progress-bar-container {
          height: 8px;
          background: var(--bg-secondary);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-color), #10b981);
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .stats-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 150px;
        }
        
        .stat-card.success {
          border-color: var(--success-color);
          background: rgba(16, 185, 129, 0.1);
        }
        
        .stat-card.warning {
          border-color: var(--warning-color);
          background: rgba(245, 158, 11, 0.1);
        }
        
        .stat-icon {
          font-size: 24px;
        }
        
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .mitigation-content {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 24px;
        }
        
        @media (max-width: 1200px) {
          .mitigation-content {
            grid-template-columns: 1fr;
          }
        }
        
        .recommendations-section,
        .tasks-section {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .section-header h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        
        .section-actions {
          display: flex;
          gap: 8px;
        }
        
        .badge {
          background: var(--bg-secondary);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        /* Recommendations */
        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 600px;
          overflow-y: auto;
        }
        
        .recommendation-card {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 16px;
          border-left: 4px solid var(--primary-color);
          transition: all 0.2s ease;
        }
        
        .recommendation-card:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .recommendation-card.critical {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        
        .recommendation-card.high {
          border-left-color: #f97316;
          background: rgba(249, 115, 22, 0.1);
        }
        
        .recommendation-card.medium {
          border-left-color: #eab308;
        }
        
        .recommendation-card.low {
          border-left-color: #22c55e;
        }
        
        .recommendation-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .recommendation-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }
        
        .recommendation-priority {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .recommendation-priority.critical {
          background: #ef4444;
          color: white;
        }
        
        .recommendation-priority.high {
          background: #f97316;
          color: white;
        }
        
        .recommendation-priority.medium {
          background: #eab308;
          color: black;
        }
        
        .recommendation-priority.low {
          background: #22c55e;
          color: white;
        }
        
        .recommendation-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          line-height: 1.5;
        }
        
        .recommendation-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .recommendation-category {
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .recommendation-action {
          padding: 4px 12px;
          font-size: 12px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .recommendation-action:hover {
          opacity: 0.9;
        }

        /* Task Toolbar (Search & Sort) */
        .task-toolbar {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 200px;
          position: relative;
        }

        .search-box .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
        }

        .search-box input {
          width: 100%;
          padding: 10px 12px 10px 36px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
        }

        .search-box input:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .sort-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sort-group label {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .sort-group select {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
        }

        .sort-order-btn {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 14px;
        }

        .sort-order-btn:hover {
          background: var(--bg-secondary);
        }

        /* Bulk Actions Bar */
        .bulk-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: var(--primary-color);
          border-radius: 8px;
          margin-bottom: 12px;
          color: white;
        }

        .selection-count {
          font-size: 14px;
          font-weight: 500;
        }

        .bulk-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          background: rgba(255,255,255,0.2);
          color: white;
        }

        .btn-sm:hover {
          background: rgba(255,255,255,0.3);
        }

        .btn-sm.btn-success {
          background: #10b981;
        }

        .btn-sm.btn-warning {
          background: #f59e0b;
        }

        .btn-sm.btn-danger {
          background: #ef4444;
        }
        
        /* Task Filters */
        .task-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .filter-group label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        
        .filter-group select {
          padding: 6px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
        }
        
        /* Tasks List */
        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: calc(100vh - 500px);
          overflow-y: auto;
        }
        
        .task-card {
          background: var(--bg-secondary);
          border-radius: 8px;
          padding: 16px;
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }

        .task-card.selected {
          border-color: var(--primary-color);
          background: rgba(102, 126, 234, 0.1);
        }
        
        .task-card:hover {
          border-color: var(--primary-color);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .task-card.overdue {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }
        
        .task-card.completed {
          opacity: 0.7;
          background: rgba(16, 185, 129, 0.05);
        }
        
        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        
        .task-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .task-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        
        .task-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }
        
        .task-card.completed .task-title {
          text-decoration: line-through;
          color: var(--text-secondary);
        }

        .status-badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .status-badge.in-progress {
          background: #3b82f6;
          color: white;
        }

        .status-badge.completed {
          background: #10b981;
          color: white;
        }
        
        .task-actions {
          display: flex;
          gap: 4px;
        }
        
        .task-action-btn {
          padding: 4px 8px;
          font-size: 12px;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        
        .task-action-btn:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        
        .task-action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        }
        
        .task-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          margin-left: 28px;
        }
        
        .task-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-left: 28px;
        }
        
        .task-meta-item {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .task-meta-item.overdue {
          color: #ef4444;
          font-weight: 500;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary);
        }
        
        .loading-placeholder {
          text-align: center;
          padding: 20px;
          color: var(--text-secondary);
          font-style: italic;
        }
        
        /* Modal */
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        
        .modal.active {
          display: flex;
        }
        
        .modal-content {
          background: var(--bg-card);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        
        .modal-close:hover {
          color: var(--text-primary);
        }
        
        #taskForm {
          padding: 20px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }
      </style>
    `;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Add task button
    document.getElementById("addTaskBtn")?.addEventListener("click", () => {
      if (this.checkPermission("create:task")) {
        this.openTaskModal();
      }
    });

    // Export tasks button
    document.getElementById("exportTasksBtn")?.addEventListener("click", () => {
      if (this.checkPermission("export:data")) {
        this.exportTasks();
      }
    });

    // Search input with debounce
    let searchTimeout;
    document.getElementById("taskSearch")?.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.filters.search = e.target.value.toLowerCase();
        this.renderTasks();
      }, 300);
    });

    // Sort controls
    document.getElementById("sortBy")?.addEventListener("change", (e) => {
      this.sortBy = e.target.value;
      this.renderTasks();
    });

    document.getElementById("sortOrderBtn")?.addEventListener("click", () => {
      this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
      const btn = document.getElementById("sortOrderBtn");
      if (btn) btn.textContent = this.sortOrder === "asc" ? "↑" : "↓";
      this.renderTasks();
    });

    // Bulk action buttons
    document.getElementById("selectAllBtn")?.addEventListener("click", () => {
      this.selectAllTasks();
    });

    document
      .getElementById("bulkCompleteBtn")
      ?.addEventListener("click", () => {
        if (this.checkPermission("complete:task")) {
          this.bulkCompleteSelected();
        }
      });

    document
      .getElementById("bulkInProgressBtn")
      ?.addEventListener("click", () => {
        if (this.checkPermission("edit:task")) {
          this.bulkSetInProgress();
        }
      });

    document.getElementById("bulkDeleteBtn")?.addEventListener("click", () => {
      if (this.checkPermission("delete:task")) {
        this.bulkDeleteSelected();
      }
    });

    document
      .getElementById("clearSelectionBtn")
      ?.addEventListener("click", () => {
        this.clearSelection();
      });

    // Filter changes
    document.getElementById("filterStatus")?.addEventListener("change", (e) => {
      this.filters.status = e.target.value;
      this.renderTasks();
    });

    document
      .getElementById("filterPriority")
      ?.addEventListener("change", (e) => {
        this.filters.priority = e.target.value;
        this.renderTasks();
      });

    document
      .getElementById("filterCategory")
      ?.addEventListener("change", (e) => {
        this.filters.category = e.target.value;
        this.renderTasks();
      });

    // Modal controls
    document.getElementById("closeModal")?.addEventListener("click", () => {
      this.closeTaskModal();
    });

    document.getElementById("cancelTask")?.addEventListener("click", () => {
      this.closeTaskModal();
    });

    // Task form submit
    document.getElementById("taskForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveTask();
    });

    // Close modal on backdrop click
    document.getElementById("taskModal")?.addEventListener("click", (e) => {
      if (e.target.id === "taskModal") {
        this.closeTaskModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Escape to close modal
      if (e.key === "Escape") {
        this.closeTaskModal();
        this.clearSelection();
      }
      // Ctrl+N for new task
      if (e.ctrlKey && e.key === "n" && !e.target.matches("input, textarea")) {
        e.preventDefault();
        if (this.checkPermission("create:task", false)) {
          this.openTaskModal();
        }
      }
    });
  },

  /**
   * Load tasks from localStorage
   */
  loadTasks() {
    const saved = localStorage.getItem("atea-idlm-mitigation-tasks");
    if (saved) {
      try {
        this.tasks = JSON.parse(saved);
      } catch (e) {
        console.error("Error loading tasks:", e);
        this.tasks = [];
      }
    }
  },

  /**
   * Save tasks to localStorage
   */
  saveTasks() {
    localStorage.setItem(
      "atea-idlm-mitigation-tasks",
      JSON.stringify(this.tasks)
    );
  },

  /**
   * Generate recommendations based on current data
   */
  async generateRecommendations() {
    this.recommendations = [];

    // Get current dashboard data
    const data = App.data || {};
    const hasData = data.users || data.security || data.licenses;

    // If no data yet, use default recommendations immediately
    if (!hasData) {
      this.recommendations = this.getDefaultRecommendations();
      return;
    }

    // Analyze users - data.users is a stats object with properties: total, members, guests, active, inactive, disabled
    if (data.users && typeof data.users === "object") {
      const disabledUsers = data.users.disabled || 0;
      const guestUsers = data.users.guests || 0;
      const totalUsers = data.users.total || 0;
      const inactiveUsers = data.users.inactive || 0;

      if (disabledUsers > 0) {
        this.recommendations.push({
          id: "inactive-users",
          title: `Review ${disabledUsers} Disabled Users`,
          description: `You have ${disabledUsers} disabled user accounts. Consider reviewing these for potential deletion to maintain a clean directory.`,
          priority: disabledUsers > 10 ? "high" : "medium",
          category: "users",
          action: "Create review task",
        });
      }

      if (inactiveUsers > 0) {
        this.recommendations.push({
          id: "inactive-signins",
          title: `${inactiveUsers} Users with No Recent Sign-ins`,
          description: `${inactiveUsers} users haven't signed in recently. Review these accounts for potential deactivation or license reassignment.`,
          priority: inactiveUsers > 20 ? "high" : "medium",
          category: "users",
          action: "Review inactive users",
        });
      }

      if (totalUsers > 0 && guestUsers > totalUsers * 0.3) {
        this.recommendations.push({
          id: "guest-review",
          title: "High Guest User Ratio",
          description: `Guest users make up ${Math.round(
            (guestUsers / totalUsers) * 100
          )}% of your directory. Schedule a quarterly access review for external users.`,
          priority: "medium",
          category: "access",
          action: "Schedule review",
        });
      }
    }

    // Analyze security
    if (data.security) {
      const mfaCoverage = data.security.mfaEnabled || 0;
      const riskyUsers = data.security.riskyUsersCount || 0;

      if (mfaCoverage < 100) {
        const priority =
          mfaCoverage < 50 ? "critical" : mfaCoverage < 80 ? "high" : "medium";
        this.recommendations.push({
          id: "mfa-enrollment",
          title: "Increase MFA Coverage",
          description: `Only ${mfaCoverage}% of users have MFA enabled. Enable MFA for all users to prevent unauthorized access.`,
          priority: priority,
          category: "security",
          action: "Create MFA task",
        });
      }

      if (riskyUsers > 0) {
        this.recommendations.push({
          id: "risky-users",
          title: `${riskyUsers} Risky Users Detected`,
          description: `Microsoft has flagged ${riskyUsers} users with risky sign-ins. Investigate and remediate immediately.`,
          priority: "critical",
          category: "security",
          action: "Investigate now",
        });
      }
    }

    // Analyze licenses - data.licenses is a stats object with properties: totalCost, potentialSavings, unassigned, inactive, disabled, breakdown
    if (data.licenses && typeof data.licenses === "object") {
      const unusedLicenses = data.licenses.unassigned || 0;
      const inactiveLicenses = data.licenses.inactive || 0;
      const disabledLicenses = data.licenses.disabled || 0;
      const potentialSavings = data.licenses.potentialSavings || 0;

      if (unusedLicenses > 5) {
        this.recommendations.push({
          id: "unused-licenses",
          title: `${unusedLicenses} Unused Licenses`,
          description: `You have ${unusedLicenses} unassigned licenses. Consider reassigning or reducing subscription to save costs.`,
          priority: "medium",
          category: "licenses",
          action: "Review licenses",
        });
      }

      if (inactiveLicenses > 0) {
        this.recommendations.push({
          id: "inactive-licenses",
          title: `${inactiveLicenses} Licenses on Inactive Users`,
          description: `${inactiveLicenses} licenses are assigned to inactive users. Reassign these licenses to save costs.`,
          priority: inactiveLicenses > 10 ? "high" : "medium",
          category: "licenses",
          action: "Review inactive licenses",
        });
      }

      if (disabledLicenses > 0) {
        this.recommendations.push({
          id: "disabled-licenses",
          title: `${disabledLicenses} Licenses on Disabled Users`,
          description: `${disabledLicenses} licenses are assigned to disabled accounts. Remove these licenses immediately.`,
          priority: "high",
          category: "licenses",
          action: "Remove licenses",
        });
      }
    }

    // Add standard recommendations if no data-driven ones
    if (this.recommendations.length === 0) {
      this.recommendations = this.getDefaultRecommendations();
    }
  },

  /**
   * Get default recommendations when no data is available
   */
  getDefaultRecommendations() {
    return [
      {
        id: "access-review",
        title: "Schedule Quarterly Access Review",
        description:
          "Regular access reviews help ensure users have appropriate permissions and guest access is still needed.",
        priority: "medium",
        category: "compliance",
        action: "Create task",
      },
      {
        id: "conditional-access",
        title: "Review Conditional Access Policies",
        description:
          "Ensure your Conditional Access policies are up-to-date and aligned with security best practices.",
        priority: "high",
        category: "security",
        action: "Create task",
      },
      {
        id: "license-optimization",
        title: "Monthly License Audit",
        description:
          "Set up a monthly review of license assignments to optimize costs and ensure compliance.",
        priority: "low",
        category: "licenses",
        action: "Schedule review",
      },
      {
        id: "mfa-review",
        title: "Verify MFA Enrollment",
        description:
          "Ensure all users have MFA enabled. Check for any users who may have bypassed MFA requirements.",
        priority: "high",
        category: "security",
        action: "Create task",
      },
      {
        id: "guest-audit",
        title: "Audit Guest User Access",
        description:
          "Review external guest users and their access rights. Remove any guests who no longer need access.",
        priority: "medium",
        category: "access",
        action: "Schedule review",
      },
    ];
  },

  /**
   * Remediation Playbooks - Comprehensive step-by-step guides
   */
  remediationPlaybooks: {
    "mfa-enrollment": {
      title: "Enable MFA for All Users",
      category: "security",
      priority: "critical",
      estimatedTime: "30-60 minutes",
      difficulty: "Medium",
      impact: "High - Prevents 99.9% of account compromises",
      description:
        "Multi-Factor Authentication (MFA) is the single most effective security control. This guide walks you through enabling MFA for all users.",
      prerequisites: [
        "Global Administrator or Authentication Administrator role",
        "Azure AD Premium P1 or P2 license (for Conditional Access)",
        "User communication plan prepared",
      ],
      steps: [
        {
          title: "Review Current MFA Status",
          description:
            "Check which users currently have MFA enabled and identify gaps.",
          actions: [
            "Go to Azure Portal → Microsoft Entra ID → Users → Per-user MFA",
            "Or use the Users page in this portal to see MFA status",
            "Export the list of users without MFA for reference",
          ],
          powershell:
            "Get-MgUser -All | Select-Object DisplayName, UserPrincipalName, @{N='MFAStatus';E={(Get-MgUserAuthenticationMethod -UserId $_.Id).Count -gt 1}}",
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_IAM/AuthenticationMethodsMenuBlade/~/PerUserMFA",
        },
        {
          title: "Create Conditional Access Policy",
          description:
            "Set up a Conditional Access policy to require MFA for all users.",
          actions: [
            "Go to Azure Portal → Microsoft Entra ID → Security → Conditional Access",
            "Click 'New policy'",
            "Name: 'Require MFA for all users'",
            "Users: All users (exclude break-glass accounts)",
            "Cloud apps: All cloud apps",
            "Grant: Require multi-factor authentication",
            "Enable policy: Report-only first, then On",
          ],
          warning:
            "Always start in Report-only mode to avoid locking users out!",
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies",
        },
        {
          title: "Communicate to Users",
          description:
            "Notify users about the upcoming MFA requirement and provide registration instructions.",
          actions: [
            "Send email announcement with timeline",
            "Provide registration instructions: https://aka.ms/mfasetup",
            "Set up help desk support for registration issues",
            "Consider phased rollout by department",
          ],
          template:
            "Subject: Action Required - Multi-Factor Authentication\\n\\nDear [User],\\n\\nTo improve security, we are enabling Multi-Factor Authentication (MFA) for all users.\\n\\nPlease register at https://aka.ms/mfasetup by [DATE].\\n\\nQuestions? Contact IT Help Desk.",
        },
        {
          title: "Enable the Policy",
          description: "After testing in Report-only mode, enable the policy.",
          actions: [
            "Review Report-only logs for potential issues",
            "Enable the policy",
            "Monitor for authentication failures",
            "Be prepared to disable if issues arise",
          ],
          warning: "Keep break-glass accounts excluded and documented!",
        },
      ],
      verification: [
        "Check MFA registration report shows increased coverage",
        "Verify Conditional Access policy shows successful grants",
        "Test sign-in requires MFA prompt",
        "Confirm help desk has not received excessive complaints",
      ],
      relatedLinks: [
        {
          title: "Microsoft MFA Documentation",
          url: "https://learn.microsoft.com/en-us/entra/identity/authentication/concept-mfa-howitworks",
        },
        {
          title: "Conditional Access Best Practices",
          url: "https://learn.microsoft.com/en-us/entra/identity/conditional-access/best-practices",
        },
      ],
    },

    "license-optimization": {
      title: "Optimize License Assignments",
      category: "licenses",
      priority: "medium",
      estimatedTime: "1-2 hours",
      difficulty: "Easy",
      impact: "Cost savings - Recover wasted license spend",
      description:
        "Review and optimize license assignments to reduce costs by removing licenses from inactive or disabled users.",
      prerequisites: [
        "License Administrator or User Administrator role",
        "Export of current license assignments",
        "Understanding of license dependencies",
      ],
      steps: [
        {
          title: "Identify Wasted Licenses",
          description: "Find licenses assigned to users who don't need them.",
          actions: [
            "Go to Licenses page in this portal",
            "Review 'Licenses on Inactive Users' count",
            "Review 'Licenses on Disabled Users' count",
            "Export the detailed breakdown for analysis",
          ],
          tip: "Focus on expensive licenses first (E5, E3, Power BI Pro)",
        },
        {
          title: "Review Disabled User Licenses",
          description: "Remove licenses from disabled accounts immediately.",
          actions: [
            "Go to Azure Portal → Users → Filter by 'Account enabled: No'",
            "Select users with licenses",
            "Click 'Licenses' → Remove all licenses",
            "Or use PowerShell for bulk removal",
          ],
          powershell:
            "Get-MgUser -Filter 'accountEnabled eq false' -All | ForEach-Object { Set-MgUserLicense -UserId $_.Id -RemoveLicenses @((Get-MgUserLicenseDetail -UserId $_.Id).SkuId) -AddLicenses @() }",
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserManagementMenuBlade/~/AllUsers",
        },
        {
          title: "Review Inactive User Licenses",
          description:
            "Consider removing licenses from users who haven't signed in recently.",
          actions: [
            "Review users with no sign-in in 90+ days",
            "Contact managers to confirm if users still need access",
            "Remove licenses from confirmed inactive users",
            "Consider downgrading to F1/F3 for limited users",
          ],
          warning:
            "Always verify with manager before removing licenses from inactive users - they may be on leave.",
        },
        {
          title: "Implement License Groups",
          description: "Use group-based licensing for easier management.",
          actions: [
            "Create security groups for each license type",
            "Assign licenses to groups instead of users",
            "Add/remove users from groups to manage licenses",
            "Set up dynamic groups for automatic assignment",
          ],
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_IAM/LicensesMenuBlade/~/Overview",
        },
      ],
      verification: [
        "Unassigned license count decreased",
        "No licenses on disabled users",
        "Cost savings reflected in billing",
        "Users can still access required services",
      ],
      relatedLinks: [
        {
          title: "Group-based Licensing",
          url: "https://learn.microsoft.com/en-us/entra/identity/users/licensing-groups-assign",
        },
        {
          title: "License Management Best Practices",
          url: "https://learn.microsoft.com/en-us/microsoft-365/enterprise/assign-licenses-to-user-accounts",
        },
      ],
    },

    "guest-access-review": {
      title: "Review Guest User Access",
      category: "access",
      priority: "medium",
      estimatedTime: "1-3 hours",
      difficulty: "Easy",
      impact: "Security - Remove stale external access",
      description:
        "Audit guest users in your directory to ensure only authorized external users have access.",
      prerequisites: [
        "User Administrator or Guest Inviter role",
        "List of approved external partners/domains",
        "Access review feature (Azure AD P2 recommended)",
      ],
      steps: [
        {
          title: "Get Guest User Report",
          description: "Export all guest users and their details.",
          actions: [
            "Go to Users page in this portal",
            "Filter by 'Guest' user type",
            "Export the list with last sign-in dates",
            "Identify guests who haven't signed in recently",
          ],
          powershell:
            "Get-MgUser -Filter \"userType eq 'Guest'\" -All -Property DisplayName,Mail,CreatedDateTime,SignInActivity | Select-Object DisplayName, Mail, CreatedDateTime, @{N='LastSignIn';E={$_.SignInActivity.LastSignInDateTime}}",
        },
        {
          title: "Identify Stale Guests",
          description: "Find guests who haven't been active.",
          actions: [
            "Look for guests with no sign-in in 90+ days",
            "Check guests from non-approved domains",
            "Review guests with broad permissions",
            "Note any guests who should not have access",
          ],
          tip: "Create a policy: Remove guests after 90 days of inactivity",
        },
        {
          title: "Remove Unauthorized Guests",
          description: "Delete guest accounts that are no longer needed.",
          actions: [
            "Verify with resource owners before deletion",
            "Go to Azure Portal → Users → Select guest",
            "Click 'Delete user'",
            "Document the removal for audit purposes",
          ],
          powershell: "Remove-MgUser -UserId 'guest@external.com'",
          warning:
            "Deleting a guest is permanent. They will need to be re-invited if access is needed later.",
        },
        {
          title: "Set Up Access Reviews",
          description: "Create recurring access reviews for guests.",
          actions: [
            "Go to Azure Portal → Identity Governance → Access Reviews",
            "Create new review for 'Guest users only'",
            "Set reviewers (resource owners or managers)",
            "Configure quarterly recurrence",
            "Enable auto-apply for denied reviews",
          ],
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_ERM/DashboardBlade/~/Controls",
        },
      ],
      verification: [
        "Stale guest accounts removed",
        "Access review configured and running",
        "Guest count within acceptable limits",
        "No unauthorized domain guests remain",
      ],
      relatedLinks: [
        {
          title: "Access Reviews Documentation",
          url: "https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview",
        },
        {
          title: "Guest Access Best Practices",
          url: "https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview",
        },
      ],
    },

    "conditional-access": {
      title: "Configure Conditional Access Policies",
      category: "security",
      priority: "high",
      estimatedTime: "2-4 hours",
      difficulty: "Advanced",
      impact: "High - Comprehensive access control",
      description:
        "Set up Conditional Access policies to enforce security controls based on user, device, location, and risk.",
      prerequisites: [
        "Global Administrator or Conditional Access Administrator",
        "Azure AD Premium P1 or P2 license",
        "Break-glass account configured",
      ],
      steps: [
        {
          title: "Plan Your Policies",
          description:
            "Define what policies you need based on Microsoft's recommendations.",
          actions: [
            "Review Microsoft's baseline policies",
            "Identify your critical apps and users",
            "Document your policy requirements",
            "Create a testing plan",
          ],
          tip: "Start with Microsoft's security defaults if you don't have P1/P2",
        },
        {
          title: "Create Break-Glass Accounts",
          description:
            "Emergency access accounts that bypass Conditional Access.",
          actions: [
            "Create 2 cloud-only Global Admin accounts",
            "Use long, complex passwords",
            "Exclude from ALL Conditional Access policies",
            "Store credentials securely (safe, vault)",
            "Set up monitoring alerts for their use",
          ],
          warning: "Never use break-glass accounts for normal operations!",
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_UsersAndTenants/UserManagementMenuBlade/~/AllUsers",
        },
        {
          title: "Implement Baseline Policies",
          description: "Create essential security policies.",
          actions: [
            "Require MFA for all users",
            "Block legacy authentication",
            "Require compliant devices for sensitive apps",
            "Block access from risky locations",
          ],
          powershell:
            "# Use Azure Portal for policy creation - GUI recommended for complex policies",
        },
        {
          title: "Test in Report-Only Mode",
          description: "Validate policies before enforcement.",
          actions: [
            "Set all new policies to 'Report-only'",
            "Wait 24-48 hours for data collection",
            "Review the 'What If' tool results",
            "Check for unexpected blocks",
            "Adjust policies as needed",
          ],
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies",
        },
      ],
      verification: [
        "All policies showing expected results in Report-only",
        "Break-glass accounts can still sign in",
        "No legitimate users being blocked",
        "Policies enforcing after enabling",
      ],
      relatedLinks: [
        {
          title: "Conditional Access Overview",
          url: "https://learn.microsoft.com/en-us/entra/identity/conditional-access/overview",
        },
        {
          title: "Common Policies",
          url: "https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policy-common",
        },
      ],
    },

    "inactive-users": {
      title: "Review Inactive User Accounts",
      category: "users",
      priority: "medium",
      estimatedTime: "1-2 hours",
      difficulty: "Easy",
      impact: "Security & Cost - Reduce attack surface and license waste",
      description:
        "Identify and handle user accounts that haven't been active, reducing security risks and license costs.",
      prerequisites: [
        "User Administrator role",
        "Sign-in logs access (Azure AD P1+)",
        "HR coordination for employee verification",
      ],
      steps: [
        {
          title: "Generate Inactive Users Report",
          description: "Identify users who haven't signed in recently.",
          actions: [
            "Go to Users page in this portal",
            "Sort by 'Last Sign-in' column",
            "Filter for users inactive 90+ days",
            "Export the list for review",
          ],
          powershell:
            "$threshold = (Get-Date).AddDays(-90)\\nGet-MgUser -All -Property DisplayName,UserPrincipalName,SignInActivity | Where-Object { $_.SignInActivity.LastSignInDateTime -lt $threshold } | Select-Object DisplayName, UserPrincipalName, @{N='LastSignIn';E={$_.SignInActivity.LastSignInDateTime}}",
        },
        {
          title: "Categorize Inactive Users",
          description: "Understand why users are inactive.",
          actions: [
            "Cross-reference with HR for leaves/terminations",
            "Identify service accounts (expected inactive)",
            "Note seasonal workers or contractors",
            "Flag truly abandoned accounts",
          ],
          tip: "Create categories: Leave, Terminated, Seasonal, Service Account, Unknown",
        },
        {
          title: "Take Appropriate Action",
          description: "Handle each category appropriately.",
          actions: [
            "Terminated: Disable immediately, delete after retention period",
            "On Leave: Document, monitor, keep licensed if returning",
            "Service Accounts: Document purpose, consider managed identity",
            "Unknown: Contact manager, disable if no response in 14 days",
          ],
          warning: "Always disable before deleting - deletion is permanent!",
        },
        {
          title: "Set Up Automation",
          description: "Automate inactive user handling.",
          actions: [
            "Create Logic App or Power Automate flow",
            "Notify managers of inactive users weekly",
            "Auto-disable after manager approval",
            "Set retention and deletion schedule",
          ],
        },
      ],
      verification: [
        "Inactive user count reduced",
        "Licenses reclaimed from inactive users",
        "Process documented for future reviews",
        "Automation in place for ongoing management",
      ],
      relatedLinks: [
        {
          title: "Inactive User Reports",
          url: "https://learn.microsoft.com/en-us/entra/identity/monitoring-health/howto-manage-inactive-user-accounts",
        },
        {
          title: "User Lifecycle Management",
          url: "https://learn.microsoft.com/en-us/entra/id-governance/identity-governance-overview",
        },
      ],
    },

    "security-defaults": {
      title: "Enable Security Defaults",
      category: "security",
      priority: "high",
      estimatedTime: "15 minutes",
      difficulty: "Easy",
      impact: "High - Basic security protection for all users",
      description:
        "Security defaults provide basic identity security (MFA, block legacy auth) at no additional cost.",
      prerequisites: [
        "Global Administrator role",
        "No existing Conditional Access policies",
        "User communication prepared",
      ],
      steps: [
        {
          title: "Check Current Status",
          description: "See if security defaults are already enabled.",
          actions: [
            "Go to Azure Portal → Microsoft Entra ID → Properties",
            "Scroll to 'Security defaults'",
            "Check current status",
          ],
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/Properties",
        },
        {
          title: "Understand What's Included",
          description: "Know what security defaults enforce.",
          actions: [
            "Require all users to register for MFA",
            "Require MFA for admins always",
            "Require MFA for users when needed",
            "Block legacy authentication",
            "Protect privileged activities",
          ],
          tip: "Security defaults are free and recommended for organizations without Azure AD P1/P2",
        },
        {
          title: "Enable Security Defaults",
          description: "Turn on security defaults.",
          actions: [
            "Go to Azure Portal → Microsoft Entra ID → Properties",
            "Click 'Manage security defaults'",
            "Set to 'Enabled'",
            "Click 'Save'",
          ],
          warning:
            "Cannot use with Conditional Access policies - choose one or the other",
        },
        {
          title: "Monitor and Support Users",
          description: "Help users through the MFA registration process.",
          actions: [
            "Send communication about MFA registration",
            "Provide registration link: https://aka.ms/mfasetup",
            "Prepare help desk for questions",
            "Monitor for issues in sign-in logs",
          ],
        },
      ],
      verification: [
        "Security defaults shows 'Enabled'",
        "Users prompted for MFA registration",
        "Legacy auth sign-ins blocked",
        "Admin accounts require MFA",
      ],
      relatedLinks: [
        {
          title: "Security Defaults Documentation",
          url: "https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults",
        },
      ],
    },

    "privileged-access": {
      title: "Secure Privileged Accounts",
      category: "security",
      priority: "critical",
      estimatedTime: "2-3 hours",
      difficulty: "Advanced",
      impact: "Critical - Protect admin accounts from compromise",
      description:
        "Implement best practices for protecting administrator and privileged accounts.",
      prerequisites: [
        "Global Administrator role",
        "Azure AD Premium P2 (for PIM)",
        "Understanding of admin roles in your org",
      ],
      steps: [
        {
          title: "Audit Privileged Roles",
          description: "Identify all users with admin roles.",
          actions: [
            "Go to Azure Portal → Microsoft Entra ID → Roles and administrators",
            "Review Global Administrator role",
            "Check other sensitive roles (User Admin, Exchange Admin, etc.)",
            "Document who has what and why",
          ],
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_AAD_IAM/RolesManagementMenuBlade/~/AllRoles",
        },
        {
          title: "Reduce Permanent Assignments",
          description: "Convert permanent admins to eligible (just-in-time).",
          actions: [
            "Enable Privileged Identity Management (PIM)",
            "Convert permanent assignments to eligible",
            "Require justification for activation",
            "Set maximum activation duration (8 hours)",
            "Require approval for sensitive roles",
          ],
          azurePortalLink:
            "https://portal.azure.com/#view/Microsoft_Azure_PIMCommon/CommonMenuBlade/~/quickStart",
        },
        {
          title: "Enforce Strong Authentication",
          description: "Require phishing-resistant MFA for admins.",
          actions: [
            "Create Conditional Access policy for admins",
            "Require authentication strength: Phishing-resistant",
            "Block legacy authentication completely",
            "Consider requiring managed devices",
          ],
          tip: "Use FIDO2 security keys or Windows Hello for Business for admin accounts",
        },
        {
          title: "Set Up Monitoring",
          description: "Alert on privileged account activities.",
          actions: [
            "Enable Azure AD sign-in logs",
            "Create alerts for admin sign-ins from new locations",
            "Alert on role assignment changes",
            "Review PIM audit logs regularly",
          ],
        },
      ],
      verification: [
        "No unnecessary Global Administrators",
        "PIM enabled for privileged roles",
        "Admin sign-ins require strong MFA",
        "Alerts configured for admin activities",
      ],
      relatedLinks: [
        {
          title: "PIM Documentation",
          url: "https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure",
        },
        {
          title: "Securing Privileged Access",
          url: "https://learn.microsoft.com/en-us/security/privileged-access-workstations/overview",
        },
      ],
    },

    "compliance-review": {
      title: "Quarterly Compliance Review",
      category: "compliance",
      priority: "medium",
      estimatedTime: "2-4 hours",
      difficulty: "Medium",
      impact: "Compliance - Meet regulatory requirements",
      description:
        "Conduct a quarterly review of identity and access controls for compliance purposes.",
      prerequisites: [
        "Access to all reports in this portal",
        "Compliance requirements document",
        "Previous review results for comparison",
      ],
      steps: [
        {
          title: "Generate All Reports",
          description: "Export current state reports.",
          actions: [
            "Export Users report (all users with details)",
            "Export Licenses report",
            "Export Security report (MFA, risk users)",
            "Export Guest users report",
            "Save reports with date stamp",
          ],
          tip: "Use this portal's export features for consistent formatting",
        },
        {
          title: "Review Against Policies",
          description: "Check current state against your policies.",
          actions: [
            "Verify MFA coverage meets policy (e.g., 100%)",
            "Check license assignments are appropriate",
            "Verify no unauthorized guest access",
            "Review admin accounts and justifications",
            "Check disabled accounts are cleaned up",
          ],
        },
        {
          title: "Document Exceptions",
          description: "Record any policy exceptions.",
          actions: [
            "Document each exception with justification",
            "Get manager/owner approval for exceptions",
            "Set expiration dates for exceptions",
            "Create tasks to remediate exceptions",
          ],
        },
        {
          title: "Create Remediation Plan",
          description: "Address any gaps found.",
          actions: [
            "Create tasks for each gap identified",
            "Assign owners and due dates",
            "Prioritize by risk level",
            "Schedule follow-up review",
          ],
        },
      ],
      verification: [
        "All reports generated and stored",
        "Gaps documented with remediation tasks",
        "Exceptions approved and documented",
        "Next review scheduled",
      ],
      relatedLinks: [
        {
          title: "Azure AD Compliance Reports",
          url: "https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-audit-logs",
        },
        {
          title: "Identity Governance",
          url: "https://learn.microsoft.com/en-us/entra/id-governance/identity-governance-overview",
        },
      ],
    },
  },

  /**
   * Render the playbooks grid
   */
  renderPlaybooksGrid() {
    const playbooks = Object.entries(this.remediationPlaybooks);
    return playbooks
      .map(
        ([id, playbook]) => `
      <div class="playbook-card" onclick="MitigationPage.openPlaybook('${id}')">
        <div class="playbook-icon">${this.getCategoryIcon(
          playbook.category
        )}</div>
        <div class="playbook-content">
          <h4>${playbook.title}</h4>
          <p>${playbook.description.substring(0, 80)}...</p>
          <div class="playbook-meta">
            <span class="playbook-time">⏱️ ${playbook.estimatedTime}</span>
            <span class="playbook-difficulty difficulty-${playbook.difficulty.toLowerCase()}">${
          playbook.difficulty
        }</span>
          </div>
        </div>
        <span class="playbook-priority ${
          playbook.priority
        }">${playbook.priority.toUpperCase()}</span>
      </div>
    `
      )
      .join("");
  },

  /**
   * Open a playbook in a modal
   */
  openPlaybook(id) {
    const playbook = this.remediationPlaybooks[id];
    if (!playbook) return;

    // Create modal for playbook
    const modal = document.createElement("div");
    modal.className = "playbook-modal";
    modal.id = "playbookModal";
    modal.innerHTML = `
      <div class="playbook-modal-content">
        <div class="playbook-modal-header">
          <div class="playbook-title-section">
            <span class="playbook-category-icon">${this.getCategoryIcon(
              playbook.category
            )}</span>
            <div>
              <h2>${playbook.title}</h2>
              <div class="playbook-header-meta">
                <span class="priority-badge ${
                  playbook.priority
                }">${playbook.priority.toUpperCase()}</span>
                <span>⏱️ ${playbook.estimatedTime}</span>
                <span class="difficulty-badge difficulty-${playbook.difficulty.toLowerCase()}">${
      playbook.difficulty
    }</span>
              </div>
            </div>
          </div>
          <button class="playbook-close" onclick="MitigationPage.closePlaybook()">&times;</button>
        </div>
        
        <div class="playbook-modal-body">
          <div class="playbook-overview">
            <p class="playbook-description">${playbook.description}</p>
            <div class="playbook-impact">
              <strong>💡 Impact:</strong> ${playbook.impact}
            </div>
          </div>

          <div class="playbook-prerequisites">
            <h3>📋 Prerequisites</h3>
            <ul>
              ${playbook.prerequisites.map((p) => `<li>${p}</li>`).join("")}
            </ul>
          </div>

          <div class="playbook-steps">
            <h3>📝 Step-by-Step Instructions</h3>
            ${playbook.steps
              .map(
                (step, i) => `
              <div class="playbook-step">
                <div class="step-header">
                  <span class="step-number">${i + 1}</span>
                  <h4>${step.title}</h4>
                </div>
                <p class="step-description">${step.description}</p>
                <ul class="step-actions">
                  ${step.actions.map((a) => `<li>${a}</li>`).join("")}
                </ul>
                ${
                  step.powershell
                    ? `
                  <div class="step-powershell">
                    <div class="powershell-header">
                      <span>PowerShell</span>
                      <button onclick="MitigationPage.copyToClipboard(this, \`${step.powershell.replace(
                        /`/g,
                        "\\`"
                      )}\`)">📋 Copy</button>
                    </div>
                    <pre><code>${step.powershell}</code></pre>
                  </div>
                `
                    : ""
                }
                ${
                  step.azurePortalLink
                    ? `
                  <a href="${step.azurePortalLink}" target="_blank" class="azure-portal-link">
                    🔗 Open in Azure Portal
                  </a>
                `
                    : ""
                }
                ${
                  step.warning
                    ? `
                  <div class="step-warning">⚠️ ${step.warning}</div>
                `
                    : ""
                }
                ${
                  step.tip
                    ? `
                  <div class="step-tip">💡 ${step.tip}</div>
                `
                    : ""
                }
              </div>
            `
              )
              .join("")}
          </div>

          <div class="playbook-verification">
            <h3>✅ Verification Checklist</h3>
            <ul class="verification-checklist">
              ${playbook.verification
                .map(
                  (v, i) => `
                <li>
                  <label>
                    <input type="checkbox" id="verify-${id}-${i}">
                    <span>${v}</span>
                  </label>
                </li>
              `
                )
                .join("")}
            </ul>
          </div>

          <div class="playbook-links">
            <h3>📚 Related Resources</h3>
            <div class="related-links">
              ${playbook.relatedLinks
                .map(
                  (link) => `
                <a href="${link.url}" target="_blank" class="related-link">
                  ${link.title} →
                </a>
              `
                )
                .join("")}
            </div>
          </div>
        </div>

        <div class="playbook-modal-footer">
          <button class="btn btn-secondary" onclick="MitigationPage.closePlaybook()">Close</button>
          <button class="btn btn-primary" onclick="MitigationPage.createTaskFromPlaybook('${id}')">
            ➕ Create Task from Playbook
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Inject playbook modal styles
    this.injectPlaybookStyles();
  },

  /**
   * Close the playbook modal
   */
  closePlaybook() {
    const modal = document.getElementById("playbookModal");
    if (modal) {
      modal.remove();
    }
  },

  /**
   * Create a task from a playbook
   */
  createTaskFromPlaybook(id) {
    const playbook = this.remediationPlaybooks[id];
    if (!playbook) return;

    // Close the playbook modal
    this.closePlaybook();

    // Create task
    const task = {
      id: this.generateId(),
      title: playbook.title,
      description:
        playbook.description +
        "\\n\\nSteps:\\n" +
        playbook.steps.map((s, i) => `${i + 1}. ${s.title}`).join("\\n"),
      category: playbook.category,
      priority: playbook.priority,
      status: "pending",
      dueDate: this.getDefaultDueDate(playbook.priority),
      assignee: "",
      schedule: "none",
      notes: `Estimated time: ${playbook.estimatedTime}\\nDifficulty: ${playbook.difficulty}\\nCreated from remediation playbook.`,
      createdAt: new Date().toISOString(),
      createdBy:
        typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown",
      source: "playbook",
      playbookId: id,
    };

    this.tasks.push(task);
    this.saveTasks();
    this.renderTasks();
    this.updateStats();

    // Show success message
    this.showNotification("Task created from playbook!", "success");
  },

  /**
   * Toggle quick start guide visibility
   */
  toggleQuickStart() {
    const content = document.getElementById("quickStartContent");
    const toggle = document.getElementById("quickStartToggle");
    if (content && toggle) {
      const isHidden = content.style.display === "none";
      content.style.display = isHidden ? "block" : "none";
      toggle.textContent = isHidden ? "▲" : "▼";
    }
  },

  /**
   * Hide quick start guide permanently
   */
  hideQuickStartPermanently() {
    localStorage.setItem("mitigation_hideQuickStart", "true");
    const guide = document.getElementById("quickStartGuide");
    if (guide) {
      guide.style.display = "none";
    }
  },

  /**
   * Check if quick start should be shown
   */
  shouldShowQuickStart() {
    return localStorage.getItem("mitigation_hideQuickStart") !== "true";
  },

  /**
   * Refresh recommendations
   */
  async refreshRecommendations() {
    await this.generateRecommendations();
    this.renderRecommendations();
    this.showNotification("Recommendations refreshed!", "info");
  },

  /**
   * Copy text to clipboard
   */
  copyToClipboard(button, text) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = "✓ Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  },

  /**
   * Show a notification toast
   */
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      background: ${
        type === "success"
          ? "#10b981"
          : type === "error"
          ? "#ef4444"
          : "#3b82f6"
      };
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  },

  /**
   * Inject playbook modal styles
   */
  injectPlaybookStyles() {
    if (document.getElementById("playbook-styles")) return;

    const styles = document.createElement("style");
    styles.id = "playbook-styles";
    styles.textContent = `
      /* Quick Start Guide */
      .quick-start-guide {
        background: linear-gradient(135deg, var(--primary-color), #0ea5e9);
        border-radius: 12px;
        margin-bottom: 24px;
        overflow: hidden;
        color: white;
      }

      .guide-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        cursor: pointer;
      }

      .guide-header h3 {
        margin: 0;
        font-size: 16px;
      }

      .toggle-icon {
        font-size: 12px;
      }

      .guide-content {
        padding: 0 20px 20px;
      }

      .guide-steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }

      .guide-step {
        display: flex;
        gap: 12px;
        background: rgba(255,255,255,0.1);
        padding: 16px;
        border-radius: 8px;
      }

      .guide-step .step-number {
        width: 32px;
        height: 32px;
        background: white;
        color: var(--primary-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
      }

      .guide-step .step-content h4 {
        margin: 0 0 4px;
        font-size: 14px;
      }

      .guide-step .step-content p {
        margin: 0;
        font-size: 12px;
        opacity: 0.9;
      }

      /* Remediation Guides Section */
      .remediation-guides-section {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
      }

      .playbooks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 16px;
      }

      .playbook-card {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 16px;
        background: var(--bg-secondary);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
      }

      .playbook-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-color: var(--primary-color);
      }

      .playbook-icon {
        font-size: 28px;
        width: 48px;
        height: 48px;
        background: var(--bg-primary);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .playbook-content {
        flex: 1;
      }

      .playbook-content h4 {
        margin: 0 0 8px;
        font-size: 15px;
        color: var(--text-primary);
      }

      .playbook-content p {
        margin: 0 0 12px;
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.4;
      }

      .playbook-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: var(--text-tertiary);
      }

      .playbook-priority {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
      }

      .difficulty-easy { color: #22c55e; }
      .difficulty-medium { color: #eab308; }
      .difficulty-advanced { color: #f97316; }

      /* Playbook Modal */
      .playbook-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
      }

      .playbook-modal-content {
        background: var(--bg-primary);
        border-radius: 16px;
        width: 100%;
        max-width: 900px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .playbook-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 24px;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-secondary);
      }

      .playbook-title-section {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }

      .playbook-category-icon {
        font-size: 36px;
        width: 60px;
        height: 60px;
        background: var(--bg-primary);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .playbook-modal-header h2 {
        margin: 0 0 8px;
        font-size: 22px;
      }

      .playbook-header-meta {
        display: flex;
        gap: 12px;
        font-size: 13px;
        color: var(--text-secondary);
      }

      .priority-badge, .difficulty-badge {
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: 500;
      }

      .priority-badge.critical { background: #ef4444; color: white; }
      .priority-badge.high { background: #f97316; color: white; }
      .priority-badge.medium { background: #eab308; color: black; }
      .priority-badge.low { background: #22c55e; color: white; }

      .playbook-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: var(--text-secondary);
        padding: 0;
        line-height: 1;
      }

      .playbook-modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
      }

      .playbook-overview {
        margin-bottom: 24px;
      }

      .playbook-description {
        font-size: 15px;
        line-height: 1.6;
        color: var(--text-primary);
        margin-bottom: 16px;
      }

      .playbook-impact {
        background: rgba(16, 185, 129, 0.1);
        border-left: 4px solid #10b981;
        padding: 12px 16px;
        border-radius: 0 8px 8px 0;
        font-size: 14px;
      }

      .playbook-prerequisites,
      .playbook-steps,
      .playbook-verification,
      .playbook-links {
        margin-bottom: 24px;
      }

      .playbook-prerequisites h3,
      .playbook-steps h3,
      .playbook-verification h3,
      .playbook-links h3 {
        font-size: 16px;
        margin: 0 0 16px;
        color: var(--text-primary);
      }

      .playbook-prerequisites ul {
        margin: 0;
        padding-left: 20px;
      }

      .playbook-prerequisites li {
        margin-bottom: 8px;
        color: var(--text-secondary);
      }

      /* Playbook Steps */
      .playbook-step {
        background: var(--bg-secondary);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
      }

      .step-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .playbook-step .step-number {
        width: 32px;
        height: 32px;
        background: var(--primary-color);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
      }

      .step-header h4 {
        margin: 0;
        font-size: 16px;
      }

      .step-description {
        color: var(--text-secondary);
        margin-bottom: 12px;
        font-size: 14px;
      }

      .step-actions {
        margin: 0 0 16px;
        padding-left: 20px;
      }

      .step-actions li {
        margin-bottom: 6px;
        color: var(--text-primary);
        font-size: 14px;
      }

      .step-powershell {
        background: #1e1e1e;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 12px;
      }

      .powershell-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #2d2d2d;
        color: #ccc;
        font-size: 12px;
      }

      .powershell-header button {
        background: #3c3c3c;
        border: none;
        color: #ccc;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .powershell-header button:hover {
        background: #4c4c4c;
      }

      .step-powershell pre {
        margin: 0;
        padding: 12px;
        overflow-x: auto;
      }

      .step-powershell code {
        color: #9cdcfe;
        font-family: 'Cascadia Code', 'Fira Code', monospace;
        font-size: 13px;
      }

      .azure-portal-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #0078d4;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-size: 13px;
        margin-bottom: 12px;
      }

      .azure-portal-link:hover {
        background: #106ebe;
      }

      .step-warning {
        background: rgba(239, 68, 68, 0.1);
        border-left: 4px solid #ef4444;
        padding: 12px 16px;
        border-radius: 0 8px 8px 0;
        color: #dc2626;
        font-size: 13px;
        margin-top: 12px;
      }

      .step-tip {
        background: rgba(59, 130, 246, 0.1);
        border-left: 4px solid #3b82f6;
        padding: 12px 16px;
        border-radius: 0 8px 8px 0;
        color: #2563eb;
        font-size: 13px;
        margin-top: 12px;
      }

      /* Verification Checklist */
      .verification-checklist {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .verification-checklist li {
        margin-bottom: 12px;
      }

      .verification-checklist label {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-radius: 8px;
        transition: background 0.2s;
      }

      .verification-checklist label:hover {
        background: var(--bg-tertiary);
      }

      .verification-checklist input[type="checkbox"] {
        width: 20px;
        height: 20px;
        cursor: pointer;
      }

      .verification-checklist input:checked + span {
        text-decoration: line-through;
        color: var(--text-tertiary);
      }

      /* Related Links */
      .related-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .related-link {
        padding: 10px 16px;
        background: var(--bg-secondary);
        border-radius: 8px;
        color: var(--primary-color);
        text-decoration: none;
        font-size: 14px;
        transition: all 0.2s;
      }

      .related-link:hover {
        background: var(--primary-color);
        color: white;
      }

      /* Modal Footer */
      .playbook-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid var(--border-color);
        background: var(--bg-secondary);
      }

      /* Section Description */
      .section-description {
        font-size: 13px;
        color: var(--text-secondary);
        margin: -8px 0 16px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Render recommendations list
   */
  renderRecommendations() {
    const container = document.getElementById("recommendationsList");
    const countBadge = document.getElementById("recommendationCount");

    if (!container) return;

    if (this.recommendations.length === 0) {
      container.innerHTML =
        '<div class="empty-state">✅ No recommendations - your environment looks good!</div>';
      if (countBadge) countBadge.textContent = "0 items";
      return;
    }

    if (countBadge)
      countBadge.textContent = `${this.recommendations.length} items`;

    // Get permissions
    const perms = this.getUIPermissions();

    // Map recommendation IDs to playbook IDs for linking
    const recToPlaybook = {
      "mfa-enrollment": "mfa-enrollment",
      "inactive-users": "inactive-users",
      "inactive-signins": "inactive-users",
      "guest-review": "guest-access-review",
      "guest-audit": "guest-access-review",
      "unused-licenses": "license-optimization",
      "inactive-licenses": "license-optimization",
      "disabled-licenses": "license-optimization",
      "conditional-access": "conditional-access",
      "access-review": "guest-access-review",
      "license-optimization": "license-optimization",
      "mfa-review": "mfa-enrollment",
      "risky-users": "privileged-access",
    };

    container.innerHTML = this.recommendations
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .map((rec) => {
        const playbookId = recToPlaybook[rec.id];
        const playbook = playbookId
          ? this.remediationPlaybooks[playbookId]
          : null;

        return `
        <div class="recommendation-card ${rec.priority}" data-rec-id="${
          rec.id
        }">
          <div class="recommendation-header">
            <span class="recommendation-title">${rec.title}</span>
            <span class="recommendation-priority ${
              rec.priority
            }">${rec.priority.toUpperCase()}</span>
          </div>
          <p class="recommendation-description">${rec.description}</p>
          ${
            playbook
              ? `
            <div class="recommendation-playbook-hint">
              <span class="playbook-link" onclick="event.stopPropagation(); MitigationPage.openPlaybook('${playbookId}')">
                📖 View step-by-step guide (${playbook.estimatedTime})
              </span>
            </div>
          `
              : ""
          }
          <div class="recommendation-meta">
            <span class="recommendation-category">${this.getCategoryIcon(
              rec.category
            )} ${rec.category}</span>
            <div class="recommendation-buttons">
              ${
                playbook
                  ? `
                <button class="recommendation-guide-btn" onclick="event.stopPropagation(); MitigationPage.openPlaybook('${playbookId}')" title="View detailed instructions">
                  📚 Guide
                </button>
              `
                  : ""
              }
              ${
                perms.canAcceptRecommendation
                  ? `
                <button class="recommendation-action" onclick="event.stopPropagation(); MitigationPage.acceptRecommendation('${rec.id}')">
                  ➕ ${rec.action}
                </button>
              `
                  : `
                <span class="recommendation-readonly" title="You don't have permission to create tasks">View Only</span>
              `
              }
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Inject recommendation styles
    this.injectRecommendationStyles();
  },

  /**
   * Inject styles for enhanced recommendations
   */
  injectRecommendationStyles() {
    if (document.getElementById("recommendation-enhanced-styles")) return;

    const styles = document.createElement("style");
    styles.id = "recommendation-enhanced-styles";
    styles.textContent = `
      .recommendation-playbook-hint {
        margin-bottom: 12px;
      }

      .playbook-link {
        color: var(--primary-color);
        font-size: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .playbook-link:hover {
        text-decoration: underline;
      }

      .recommendation-buttons {
        display: flex;
        gap: 8px;
      }

      .recommendation-guide-btn {
        padding: 4px 10px;
        font-size: 12px;
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
      }

      .recommendation-guide-btn:hover {
        background: var(--primary-color);
        color: white;
        border-color: var(--primary-color);
      }

      .recommendation-readonly {
        font-size: 12px;
        color: var(--text-tertiary);
        font-style: italic;
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Accept a recommendation and create a task
   */
  acceptRecommendation(id) {
    // Check permission
    if (!this.checkPermission("accept:recommendation")) {
      return;
    }

    const rec = this.recommendations.find((r) => r.id === id);
    if (!rec) return;

    // Create task from recommendation
    const task = {
      id: this.generateId(),
      title: rec.title,
      description: rec.description,
      category: rec.category,
      priority: rec.priority,
      status: "pending",
      dueDate: this.getDefaultDueDate(rec.priority),
      assignee: "",
      schedule: "none",
      notes: `Created from AI recommendation`,
      createdAt: new Date().toISOString(),
      createdBy:
        typeof RBAC !== "undefined" ? RBAC.getCurrentUserEmail() : "unknown",
      source: "recommendation",
    };

    this.tasks.push(task);
    this.saveTasks();

    // Remove from recommendations
    this.recommendations = this.recommendations.filter((r) => r.id !== id);

    // Re-render
    this.renderRecommendations();
    this.renderTasks();
    this.updateStats();

    // Log audit
    if (typeof RBAC !== "undefined") {
      RBAC.logAudit("accept_recommendation", {
        taskId: task.id,
        title: task.title,
      });
    }

    // Show confirmation
    this.showToast(`Task created: ${task.title}`);
  },

  /**
   * Render tasks list
   */
  renderTasks() {
    const container = document.getElementById("tasksList");
    if (!container) return;

    // Apply filters
    let filtered = [...this.tasks];

    // Search filter
    if (this.filters.search) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(this.filters.search) ||
          (t.description &&
            t.description.toLowerCase().includes(this.filters.search)) ||
          (t.assignee && t.assignee.toLowerCase().includes(this.filters.search))
      );
    }

    if (this.filters.status !== "all") {
      if (this.filters.status === "overdue") {
        filtered = filtered.filter(
          (t) => t.status !== "completed" && this.isOverdue(t.dueDate)
        );
      } else {
        filtered = filtered.filter((t) => t.status === this.filters.status);
      }
    }

    if (this.filters.priority !== "all") {
      filtered = filtered.filter((t) => t.priority === this.filters.priority);
    }

    if (this.filters.category !== "all") {
      filtered = filtered.filter((t) => t.category === this.filters.category);
    }

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No tasks match the current filters.</div>';
      this.updateBulkActionsBar();
      return;
    }

    // Apply sorting based on sortBy and sortOrder
    filtered.sort((a, b) => {
      let result = 0;

      switch (this.sortBy) {
        case "priority":
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          result = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "dueDate":
          if (!a.dueDate && !b.dueDate) result = 0;
          else if (!a.dueDate) result = 1;
          else if (!b.dueDate) result = -1;
          else result = new Date(a.dueDate) - new Date(b.dueDate);
          break;
        case "created":
          result = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          break;
        case "title":
          result = a.title.localeCompare(b.title);
          break;
        case "status":
          const statusOrder = { pending: 0, "in-progress": 1, completed: 2 };
          result = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        default:
          result = 0;
      }

      // Apply sort order
      return this.sortOrder === "desc" ? -result : result;
    });

    // Always put overdue tasks at top regardless of sort
    filtered.sort((a, b) => {
      const aOverdue = this.isOverdue(a.dueDate) && a.status !== "completed";
      const bOverdue = this.isOverdue(b.dueDate) && b.status !== "completed";
      if (aOverdue && !bOverdue) return -1;
      if (bOverdue && !aOverdue) return 1;
      return 0;
    });

    // Get permissions for rendering
    const perms = this.getUIPermissions();

    container.innerHTML = filtered
      .map((task) => {
        const isOverdue =
          this.isOverdue(task.dueDate) && task.status !== "completed";
        const isSelected = this.selectedTasks.has(task.id);
        let cardClass = isSelected ? "selected " : "";
        cardClass +=
          task.status === "completed"
            ? "completed"
            : isOverdue
            ? "overdue"
            : "";

        // Build action buttons based on permissions
        const actionButtons = [];

        // Status progression buttons
        if (perms.canEditTask && task.status !== "completed") {
          if (task.status === "pending") {
            actionButtons.push(
              `<button class="task-action-btn status-btn" onclick="MitigationPage.setTaskStatus('${task.id}', 'in-progress')" title="Start">▶️</button>`
            );
          } else if (task.status === "in-progress") {
            actionButtons.push(
              `<button class="task-action-btn status-btn" onclick="MitigationPage.setTaskStatus('${task.id}', 'pending')" title="Pause">⏸️</button>`
            );
          }
        }
        if (perms.canEditTask) {
          actionButtons.push(
            `<button class="task-action-btn" onclick="MitigationPage.editTask('${task.id}')" title="Edit">✏️</button>`
          );
        }
        if (perms.canDeleteTask) {
          actionButtons.push(
            `<button class="task-action-btn delete" onclick="MitigationPage.deleteTask('${task.id}')" title="Delete">🗑️</button>`
          );
        }

        // Status badge
        const statusBadge =
          task.status === "in-progress"
            ? '<span class="status-badge in-progress">In Progress</span>'
            : task.status === "completed"
            ? '<span class="status-badge completed">Completed</span>'
            : "";

        return `
        <div class="task-card ${cardClass}" data-id="${
          task.id
        }" onclick="MitigationPage.toggleTaskSelection('${task.id}', event)">
          <div class="task-header">
            <div class="task-title-row">
              <input type="checkbox" class="task-checkbox" 
                ${task.status === "completed" ? "checked" : ""} 
                ${perms.canCompleteTask ? "" : "disabled"}
                onclick="event.stopPropagation()"
                onchange="MitigationPage.toggleTask('${task.id}')" />
              <span class="task-title">${task.title}</span>
              ${statusBadge}
            </div>
            <div class="task-actions" onclick="event.stopPropagation()">
              ${actionButtons.join("")}
            </div>
          </div>
          ${
            task.description
              ? `<p class="task-description">${task.description}</p>`
              : ""
          }
          <div class="task-meta">
            <span class="task-meta-item">${this.getCategoryIcon(
              task.category
            )} ${task.category}</span>
            <span class="task-meta-item">${this.getPriorityIcon(
              task.priority
            )} ${task.priority}</span>
            ${
              task.dueDate
                ? `
              <span class="task-meta-item ${isOverdue ? "overdue" : ""}">
                📅 ${isOverdue ? "OVERDUE: " : ""}${
                    typeof LocaleUtils !== "undefined"
                      ? LocaleUtils.formatDate(task.dueDate)
                      : new Date(task.dueDate).toLocaleDateString("nb-NO")
                  }
              </span>
            `
                : ""
            }
            ${
              task.assignee
                ? `<span class="task-meta-item">👤 ${task.assignee}</span>`
                : ""
            }
            ${
              task.schedule !== "none"
                ? `<span class="task-meta-item">🔄 ${task.schedule}</span>`
                : ""
            }
            ${
              task.createdBy
                ? `<span class="task-meta-item" title="Created by">👤 ${task.createdBy}</span>`
                : ""
            }
          </div>
        </div>
      `;
      })
      .join("");
  },

  /**
   * Update statistics
   */
  updateStats() {
    const total = this.tasks.length;
    const pending = this.tasks.filter((t) => t.status === "pending").length;
    const inProgress = this.tasks.filter(
      (t) => t.status === "in-progress"
    ).length;
    const completed = this.tasks.filter((t) => t.status === "completed").length;
    const overdue = this.tasks.filter(
      (t) => t.status !== "completed" && this.isOverdue(t.dueDate)
    ).length;

    // Update stat cards
    document.getElementById("totalTasks").textContent = total;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("inProgressTasks").textContent = inProgress;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("overdueTasks").textContent = overdue;

    // Update progress bar
    const progressPercent =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    const progressBar = document.getElementById("progressBar");
    const progressValue = document.getElementById("progressPercent");

    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`;
    }
    if (progressValue) {
      progressValue.textContent = `${progressPercent}%`;
    }
  },

  /**
   * Open task modal for adding/editing
   */
  openTaskModal(task = null) {
    const modal = document.getElementById("taskModal");
    const title = document.getElementById("modalTitle");
    const form = document.getElementById("taskForm");

    if (!modal || !form) return;

    // Reset form
    form.reset();

    if (task) {
      // Edit mode
      title.textContent = "Edit Task";
      document.getElementById("taskId").value = task.id;
      document.getElementById("taskTitle").value = task.title;
      document.getElementById("taskDescription").value = task.description || "";
      document.getElementById("taskCategory").value = task.category;
      document.getElementById("taskPriority").value = task.priority;
      document.getElementById("taskDueDate").value = task.dueDate || "";
      document.getElementById("taskAssignee").value = task.assignee || "";
      document.getElementById("taskSchedule").value = task.schedule || "none";
      document.getElementById("taskNotes").value = task.notes || "";
    } else {
      // Add mode
      title.textContent = "Add Task";
      document.getElementById("taskId").value = "";
      // Set default due date to 1 week from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      document.getElementById("taskDueDate").value = defaultDate
        .toISOString()
        .split("T")[0];
    }

    modal.classList.add("active");
  },

  /**
   * Close task modal
   */
  closeTaskModal() {
    const modal = document.getElementById("taskModal");
    if (modal) {
      modal.classList.remove("active");
    }
  },

  /**
   * Save task from form
   */
  saveTask() {
    const id = document.getElementById("taskId").value;
    const taskData = {
      title: document.getElementById("taskTitle").value,
      description: document.getElementById("taskDescription").value,
      category: document.getElementById("taskCategory").value,
      priority: document.getElementById("taskPriority").value,
      dueDate: document.getElementById("taskDueDate").value,
      assignee: document.getElementById("taskAssignee").value,
      schedule: document.getElementById("taskSchedule").value,
      notes: document.getElementById("taskNotes").value,
    };

    if (id) {
      // Edit existing task
      const index = this.tasks.findIndex((t) => t.id === id);
      if (index !== -1) {
        this.tasks[index] = {
          ...this.tasks[index],
          ...taskData,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      // Create new task
      const newTask = {
        id: this.generateId(),
        ...taskData,
        status: "pending",
        createdAt: new Date().toISOString(),
        source: "manual",
      };
      this.tasks.push(newTask);
    }

    this.saveTasks();
    this.closeTaskModal();
    this.renderTasks();
    this.updateStats();

    this.showToast(id ? "Task updated" : "Task created");
  },

  /**
   * Edit a task
   */
  editTask(id) {
    // Check permission
    if (!this.checkPermission("edit:task")) {
      return;
    }

    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      this.openTaskModal(task);
    }
  },

  /**
   * Toggle task completion
   */
  toggleTask(id) {
    // Check permission
    if (!this.checkPermission("complete:task")) {
      return;
    }

    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = task.status === "completed" ? "pending" : "completed";
      task.completedAt =
        task.status === "completed" ? new Date().toISOString() : null;
      task.completedBy =
        task.status === "completed"
          ? typeof RBAC !== "undefined"
            ? RBAC.getCurrentUserEmail()
            : "unknown"
          : null;

      // Handle scheduled tasks - create next occurrence
      if (task.status === "completed" && task.schedule !== "none") {
        this.createNextScheduledTask(task);
      }

      this.saveTasks();
      this.renderTasks();
      this.updateStats();

      // Log audit
      if (typeof RBAC !== "undefined") {
        RBAC.logAudit("toggle_task", { taskId: task.id, status: task.status });
      }
    }
  },

  /**
   * Delete a task
   */
  deleteTask(id) {
    // Check permission
    if (!this.checkPermission("delete:task")) {
      return;
    }

    if (!confirm("Are you sure you want to delete this task?")) return;

    const task = this.tasks.find((t) => t.id === id);
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.saveTasks();
    this.renderTasks();
    this.updateStats();

    // Log audit
    if (typeof RBAC !== "undefined" && task) {
      RBAC.logAudit("delete_task", { taskId: id, title: task.title });
    }

    this.showToast("Task deleted");
  },

  /**
   * Create next scheduled task occurrence
   */
  createNextScheduledTask(completedTask) {
    const intervals = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      quarterly: 90,
    };

    const daysToAdd = intervals[completedTask.schedule];
    if (!daysToAdd) return;

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + daysToAdd);

    const newTask = {
      id: this.generateId(),
      title: completedTask.title,
      description: completedTask.description,
      category: completedTask.category,
      priority: completedTask.priority,
      dueDate: nextDueDate.toISOString().split("T")[0],
      assignee: completedTask.assignee,
      schedule: completedTask.schedule,
      notes: completedTask.notes,
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "scheduled",
      parentTaskId: completedTask.id,
    };

    this.tasks.push(newTask);
    this.showToast(`Next ${completedTask.schedule} task scheduled`);
  },

  /**
   * Export tasks to JSON/CSV
   */
  exportTasks() {
    if (typeof ExportUtils !== "undefined") {
      ExportUtils.exportTasks(this.tasks);
    } else {
      // Fallback to JSON export
      const data = JSON.stringify(this.tasks, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mitigation-tasks-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    this.showToast("Tasks exported");
  },

  /**
   * Helper: Generate unique ID
   */
  generateId() {
    return "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Helper: Check if date is overdue
   */
  isOverdue(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  },

  /**
   * Helper: Get default due date based on priority
   */
  getDefaultDueDate(priority) {
    const days = { critical: 1, high: 3, medium: 7, low: 14 };
    const date = new Date();
    date.setDate(date.getDate() + (days[priority] || 7));
    return date.toISOString().split("T")[0];
  },

  /**
   * Helper: Get category icon
   */
  getCategoryIcon(category) {
    const icons = {
      security: "🔒",
      compliance: "📋",
      licenses: "📜",
      users: "👥",
      access: "🔑",
    };
    return icons[category] || "📌";
  },

  /**
   * Helper: Get priority icon
   */
  getPriorityIcon(priority) {
    const icons = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🟢",
    };
    return icons[priority] || "⚪";
  },

  /**
   * Set task status (for status progression)
   */
  setTaskStatus(id, status) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.status = status;
      task.updatedAt = new Date().toISOString();
      this.saveTasks();
      this.renderTasks();
      this.updateStats();
      this.showToast(`Task ${status === "in-progress" ? "started" : "paused"}`);
    }
  },

  /**
   * Toggle task selection for bulk actions
   */
  toggleTaskSelection(id, event) {
    // Only select if clicking on the card background, not on buttons/checkboxes
    if (
      event &&
      (event.target.tagName === "BUTTON" || event.target.tagName === "INPUT")
    ) {
      return;
    }

    if (this.selectedTasks.has(id)) {
      this.selectedTasks.delete(id);
    } else {
      this.selectedTasks.add(id);
    }

    this.renderTasks();
    this.updateBulkActionsBar();
  },

  /**
   * Select all visible tasks
   */
  selectAllTasks() {
    // Get currently filtered tasks
    let filtered = [...this.tasks];
    if (this.filters.status !== "all") {
      filtered = filtered.filter((t) => t.status === this.filters.status);
    }
    if (this.filters.priority !== "all") {
      filtered = filtered.filter((t) => t.priority === this.filters.priority);
    }
    if (this.filters.category !== "all") {
      filtered = filtered.filter((t) => t.category === this.filters.category);
    }

    filtered.forEach((t) => this.selectedTasks.add(t.id));
    this.renderTasks();
    this.updateBulkActionsBar();
  },

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedTasks.clear();
    this.renderTasks();
    this.updateBulkActionsBar();
  },

  /**
   * Update bulk actions bar visibility
   */
  updateBulkActionsBar() {
    const bar = document.getElementById("bulkActionsBar");
    const countSpan = document.getElementById("selectionCount");

    if (bar) {
      if (this.selectedTasks.size > 0) {
        bar.style.display = "flex";
        if (countSpan) {
          countSpan.textContent = `${this.selectedTasks.size} selected`;
        }
      } else {
        bar.style.display = "none";
      }
    }
  },

  /**
   * Bulk complete selected tasks
   */
  bulkCompleteSelected() {
    if (this.selectedTasks.size === 0) return;

    const count = this.selectedTasks.size;
    this.selectedTasks.forEach((id) => {
      const task = this.tasks.find((t) => t.id === id);
      if (task && task.status !== "completed") {
        task.status = "completed";
        task.completedAt = new Date().toISOString();
      }
    });

    this.saveTasks();
    this.clearSelection();
    this.updateStats();
    this.showToast(`${count} tasks completed`);
  },

  /**
   * Bulk set selected tasks to in-progress
   */
  bulkSetInProgress() {
    if (this.selectedTasks.size === 0) return;

    const count = this.selectedTasks.size;
    this.selectedTasks.forEach((id) => {
      const task = this.tasks.find((t) => t.id === id);
      if (task && task.status !== "completed") {
        task.status = "in-progress";
        task.updatedAt = new Date().toISOString();
      }
    });

    this.saveTasks();
    this.clearSelection();
    this.updateStats();
    this.showToast(`${count} tasks set to in-progress`);
  },

  /**
   * Bulk delete selected tasks
   */
  bulkDeleteSelected() {
    if (this.selectedTasks.size === 0) return;

    const count = this.selectedTasks.size;
    if (!confirm(`Are you sure you want to delete ${count} tasks?`)) return;

    this.tasks = this.tasks.filter((t) => !this.selectedTasks.has(t.id));
    this.saveTasks();
    this.clearSelection();
    this.updateStats();
    this.showToast(`${count} tasks deleted`);
  },

  /**
   * Helper: Show toast notification
   */
  showToast(message) {
    // Create toast if not exists
    let toast = document.getElementById("mitigationToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "mitigationToast";
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--text-primary);
        color: var(--bg-primary);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";

    setTimeout(() => {
      toast.style.opacity = "0";
    }, 3000);
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = MitigationPage;
}
