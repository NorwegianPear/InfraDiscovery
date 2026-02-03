/**
 * Documentation Page Module
 * Displays architecture diagrams and system documentation
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.1
 */

const DocumentationPage = {
  currentDiagram: "infrastructure",
  currentSection: "diagrams", // diagrams, deployment, scripts

  diagrams: {
    infrastructure: {
      title: "Infrastructure Architecture",
      description:
        "Azure IaC components deployed by Bicep - App Service, Key Vault, Storage, Application Insights, and Log Analytics",
      icon: "🏗️",
    },
    dataflow: {
      title: "Data Flow",
      description:
        "How data flows from Microsoft Graph API to the portal dashboard",
      icon: "🔄",
    },
    webapp: {
      title: "Web Application Architecture",
      description:
        "Frontend SPA structure, JavaScript modules, and authentication flow",
      icon: "🌐",
    },
    cicd: {
      title: "CI/CD Pipeline",
      description:
        "GitHub Actions workflow with Azure OIDC federation for secure deployments",
      icon: "🚀",
    },
    rbac: {
      title: "RBAC Architecture",
      description:
        "Role-Based Access Control with tenant restriction - Admin, Operator, and Viewer roles",
      icon: "🔐",
    },
  },

  /**
   * Initialize the page
   */
  async init() {
    console.log("📚 Initializing Documentation page");
    this.setupEventListeners();
    this.setupSectionTabs();
    this.loadDiagram(this.currentDiagram);
  },

  /**
   * Setup section tabs (Diagrams, Deployment, Scripts)
   */
  setupSectionTabs() {
    document.querySelectorAll(".section-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const section = tab.dataset.section;
        this.switchSection(section);
      });
    });
  },

  /**
   * Switch between documentation sections
   */
  switchSection(section) {
    this.currentSection = section;

    // Update tab buttons
    document.querySelectorAll(".section-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.section === section);
    });

    // Update content visibility
    document.querySelectorAll(".section-content").forEach((content) => {
      content.style.display =
        content.id === section + "-section" ? "flex" : "none";
    });
  },

  /**
   * Render the page HTML
   */
  render() {
    return `
      <div class="documentation-page">
        <!-- Section Tabs -->
        <div class="section-tabs">
          <button class="section-tab active" data-section="diagrams">
            <span class="tab-icon">📊</span>
            <span class="tab-text">Architecture Diagrams</span>
          </button>
          <button class="section-tab" data-section="deployment">
            <span class="tab-icon">🚀</span>
            <span class="tab-text">Deployment Guide</span>
          </button>
          <button class="section-tab" data-section="scripts">
            <span class="tab-icon">📜</span>
            <span class="tab-text">Scripts Reference</span>
          </button>
        </div>

        <!-- DIAGRAMS SECTION -->
        <div id="diagrams-section" class="section-content diagrams-section">
          <!-- Diagram Selector -->
          <div class="diagram-selector">
            <button class="diagram-btn active" data-diagram="infrastructure">
              <span class="btn-icon">🏗️</span>
              <span class="btn-text">Infrastructure</span>
            </button>
            <button class="diagram-btn" data-diagram="dataflow">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Data Flow</span>
            </button>
            <button class="diagram-btn" data-diagram="webapp">
              <span class="btn-icon">🌐</span>
              <span class="btn-text">Web App</span>
            </button>
            <button class="diagram-btn" data-diagram="cicd">
              <span class="btn-icon">🚀</span>
              <span class="btn-text">CI/CD</span>
            </button>
            <button class="diagram-btn" data-diagram="rbac">
              <span class="btn-icon">🔐</span>
              <span class="btn-text">RBAC</span>
            </button>
          </div>

          <!-- Diagram Info -->
          <div class="diagram-info" id="diagramInfo">
            <h2 id="diagramTitle">Infrastructure Architecture</h2>
            <p id="diagramDescription">Azure IaC components deployed by Bicep</p>
          </div>

          <!-- Diagram Viewer -->
          <div class="diagram-viewer" id="diagramViewer">
            <div class="diagram-loading">Loading diagram...</div>
          </div>

          <!-- Diagram Controls -->
          <div class="diagram-controls">
            <button class="control-btn" id="zoomIn" title="Zoom In">🔍+</button>
            <button class="control-btn" id="zoomOut" title="Zoom Out">🔍-</button>
            <button class="control-btn" id="resetZoom" title="Reset">↺</button>
            <button class="control-btn" id="fullscreen" title="Fullscreen">⛶</button>
            <button class="control-btn" id="downloadSvg" title="Download SVG">📥</button>
          </div>
        </div>

        <!-- DEPLOYMENT SECTION -->
        <div id="deployment-section" class="section-content deployment-section" style="display: none;">
          ${this.renderDeploymentGuide()}
        </div>

        <!-- SCRIPTS SECTION -->
        <div id="scripts-section" class="section-content scripts-section" style="display: none;">
          ${this.renderScriptsReference()}
        </div>
      </div>

      <style>
        .documentation-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 140px);
          gap: 16px;
        }

        /* Section Tabs */
        .section-tabs {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: var(--white);
          border-radius: 12px;
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
        }

        .section-tab {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          background: var(--gray-50);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          color: var(--gray-600);
          font-size: 15px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .section-tab:hover {
          background: var(--gray-100);
          color: var(--gray-800);
          border-color: var(--gray-300);
        }

        .section-tab.active {
          background: var(--primary);
          color: var(--white);
          border-color: var(--primary);
          box-shadow: var(--shadow-md);
        }

        .section-tab .tab-icon {
          font-size: 20px;
        }

        .section-content {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 16px;
        }

        .diagrams-section {
          height: 100%;
        }

        .deployment-section,
        .scripts-section {
          overflow-y: auto;
          padding: 4px;
        }

        .diagram-selector {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding: 16px;
          background: var(--white);
          border-radius: 12px;
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
        }

        .diagram-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 22px;
          background: var(--gray-50);
          border: 2px solid var(--gray-200);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--gray-700);
          font-size: 14px;
          font-weight: 600;
        }

        .diagram-btn:hover {
          background: var(--white);
          border-color: var(--primary);
          color: var(--primary);
          box-shadow: var(--shadow);
        }

        .diagram-btn.active {
          background: var(--primary);
          color: var(--white);
          border-color: var(--primary);
          box-shadow: var(--shadow-md);
        }

        .diagram-btn .btn-icon {
          font-size: 20px;
        }

        .diagram-info {
          padding: 20px 24px;
          background: var(--primary-gradient);
          border-radius: 12px;
          color: var(--white);
          box-shadow: var(--shadow-md);
        }

        .diagram-info h2 {
          margin: 0 0 8px 0;
          font-size: 22px;
          font-weight: 700;
          color: var(--white);
        }

        .diagram-info p {
          margin: 0;
          opacity: 0.95;
          font-size: 15px;
          line-height: 1.5;
        }

        .diagram-viewer {
          flex: 1;
          background: var(--white);
          border: 1px solid var(--gray-200);
          border-radius: 12px;
          overflow: auto;
          position: relative;
          min-height: 400px;
          box-shadow: var(--shadow-sm);
        }

        .diagram-viewer svg {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 0 auto;
          transition: transform 0.2s ease;
        }

        .diagram-viewer.zoomed svg {
          max-width: none;
        }

        .diagram-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: var(--gray-500);
          font-size: 16px;
          font-weight: 500;
        }

        .diagram-controls {
          display: flex;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          background: var(--white);
          border-radius: 12px;
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
        }

        .control-btn {
          padding: 12px 18px;
          background: var(--gray-50);
          border: 2px solid var(--gray-200);
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
          color: var(--gray-700);
          font-weight: 500;
        }

        .control-btn:hover {
          background: var(--primary);
          color: var(--white);
          border-color: var(--primary);
          box-shadow: var(--shadow);
        }

        .diagram-viewer.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          border-radius: 0;
          margin: 0;
        }

        @media (max-width: 768px) {
          .diagram-selector {
            flex-direction: column;
          }
          
          .diagram-btn {
            justify-content: center;
          }
        }
      </style>
    `;
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Diagram selector buttons
    document.querySelectorAll(".diagram-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const diagram = btn.dataset.diagram;
        this.loadDiagram(diagram);

        // Update active state
        document
          .querySelectorAll(".diagram-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Zoom controls
    document
      .getElementById("zoomIn")
      ?.addEventListener("click", () => this.zoom(1.2));
    document
      .getElementById("zoomOut")
      ?.addEventListener("click", () => this.zoom(0.8));
    document
      .getElementById("resetZoom")
      ?.addEventListener("click", () => this.resetZoom());
    document
      .getElementById("fullscreen")
      ?.addEventListener("click", () => this.toggleFullscreen());
    document
      .getElementById("downloadSvg")
      ?.addEventListener("click", () => this.downloadCurrentDiagram());
  },

  /**
   * Load a diagram
   */
  async loadDiagram(diagramId) {
    this.currentDiagram = diagramId;
    const viewer = document.getElementById("diagramViewer");
    const info = this.diagrams[diagramId];

    if (!viewer || !info) return;

    // Update info
    document.getElementById("diagramTitle").textContent = info.title;
    document.getElementById("diagramDescription").textContent =
      info.description;

    // Show loading
    viewer.innerHTML = '<div class="diagram-loading">Loading diagram...</div>';

    // Map diagram ID to file path
    const fileMap = {
      infrastructure: "infrastructure-architecture.svg",
      dataflow: "data-flow.svg",
      webapp: "webapp-architecture.svg",
      cicd: "github-actions-workflow.svg",
      rbac: "rbac-architecture.svg",
    };

    const fileName = fileMap[diagramId];

    try {
      // Load from assets/diagrams (deployed path)
      const response = await fetch(`assets/diagrams/${fileName}`);

      if (response.ok) {
        const svgContent = await response.text();
        viewer.innerHTML = svgContent;
        this.currentScale = 1;
      } else {
        // Fallback: Show embedded placeholder with link
        viewer.innerHTML = this.getPlaceholderContent(diagramId, info);
      }
    } catch (error) {
      console.error("Error loading diagram:", error);
      viewer.innerHTML = this.getPlaceholderContent(diagramId, info);
    }
  },

  /**
   * Get placeholder content when SVG can't be loaded
   */
  getPlaceholderContent(diagramId, info) {
    const descriptions = {
      infrastructure: `
        <div class="diagram-placeholder">
          <h3>${info.icon} ${info.title}</h3>
          <div class="placeholder-content">
            <div class="arch-box">
              <h4>🌐 Azure App Service</h4>
              <p>Node.js 18 LTS web application hosting the portal</p>
            </div>
            <div class="arch-box">
              <h4>🔐 Azure Key Vault</h4>
              <p>Secure storage for secrets and certificates</p>
            </div>
            <div class="arch-box">
              <h4>💾 Azure Storage</h4>
              <p>Blob and Table storage for cached data</p>
            </div>
            <div class="arch-box">
              <h4>📊 Application Insights</h4>
              <p>Monitoring, logging, and performance tracking</p>
            </div>
            <div class="arch-box">
              <h4>📋 Log Analytics</h4>
              <p>Centralized log collection and analysis</p>
            </div>
          </div>
          <p class="placeholder-note">Full SVG diagram available in: docs/diagrams/infrastructure-architecture.svg</p>
        </div>
      `,
      dataflow: `
        <div class="diagram-placeholder">
          <h3>${info.icon} ${info.title}</h3>
          <div class="flow-diagram">
            <div class="flow-step">👤 User</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">🌐 Browser (MSAL.js)</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">🔐 Entra ID</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">🎫 Access Token</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">📡 Microsoft Graph</div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">📊 Dashboard</div>
          </div>
          <div class="api-list">
            <h4>Graph API Endpoints Used:</h4>
            <ul>
              <li>/users - User management</li>
              <li>/subscribedSkus - License information</li>
              <li>/auditLogs/signIns - Sign-in logs</li>
              <li>/security/alerts - Security alerts</li>
              <li>/directoryRoles - Admin roles</li>
            </ul>
          </div>
          <p class="placeholder-note">Full SVG diagram available in: docs/diagrams/data-flow.svg</p>
        </div>
      `,
      webapp: `
        <div class="diagram-placeholder">
          <h3>${info.icon} ${info.title}</h3>
          <div class="module-grid">
            <div class="module-box core">
              <h4>Core Modules</h4>
              <ul>
                <li>config.js - Configuration</li>
                <li>msal-auth.js - Authentication</li>
                <li>graph-api.js - API calls</li>
                <li>app.js - Main application</li>
              </ul>
            </div>
            <div class="module-box pages">
              <h4>Page Modules</h4>
              <ul>
                <li>dashboard.js</li>
                <li>users.js</li>
                <li>licenses.js</li>
                <li>security.js</li>
                <li>mitigation.js</li>
              </ul>
            </div>
            <div class="module-box viz">
              <h4>Visualization</h4>
              <ul>
                <li>charts.js (Chart.js)</li>
                <li>signin-map.js (Leaflet)</li>
              </ul>
            </div>
          </div>
          <p class="placeholder-note">Full SVG diagram available in: docs/diagrams/webapp-architecture.svg</p>
        </div>
      `,
      cicd: `
        <div class="diagram-placeholder">
          <h3>${info.icon} ${info.title}</h3>
          <div class="pipeline-steps">
            <div class="pipeline-step">
              <span class="step-num">1</span>
              <span class="step-name">Checkout</span>
            </div>
            <div class="pipeline-step">
              <span class="step-num">2</span>
              <span class="step-name">Setup Node.js</span>
            </div>
            <div class="pipeline-step">
              <span class="step-num">3</span>
              <span class="step-name">Install Dependencies</span>
            </div>
            <div class="pipeline-step">
              <span class="step-num">4</span>
              <span class="step-name">Configure App</span>
            </div>
            <div class="pipeline-step">
              <span class="step-num">5</span>
              <span class="step-name">Create Package</span>
            </div>
            <div class="pipeline-step">
              <span class="step-num">6</span>
              <span class="step-name">Deploy to Azure</span>
            </div>
          </div>
          <div class="cicd-info">
            <p>✅ OIDC Federation - No secrets stored in GitHub</p>
            <p>✅ Triggered on push to main branch</p>
            <p>✅ Environment-specific deployments (dev, test, prod)</p>
          </div>
          <p class="placeholder-note">Full SVG diagram available in: docs/diagrams/github-actions-workflow.svg</p>
        </div>
      `,
      rbac: `
        <div class="diagram-placeholder">
          <h3>${info.icon} ${info.title}</h3>
          <div class="rbac-roles">
            <div class="role-box admin">
              <h4>👑 Administrator</h4>
              <p class="role-level">Level 3 - Full Access</p>
              <div class="role-users">
                <strong>Users:</strong>
                <ul>
                  <li>uylephan@ateara.onmicrosoft.com</li>
                  <li>anders.dramstad@ateara.onmicrosoft.com</li>
                </ul>
              </div>
              <div class="role-perms">
                <strong>Permissions:</strong> All permissions + manage:roles, manage:users, view:auditlog
              </div>
            </div>
            <div class="role-box operator">
              <h4>🔧 Operator</h4>
              <p class="role-level">Level 2 - Operational Access</p>
              <div class="role-users">
                <strong>Users:</strong>
                <ul>
                  <li>lene.kadaa@ateara.onmicrosoft.com</li>
                  <li>veronica@ateara.onmicrosoft.com</li>
                </ul>
              </div>
              <div class="role-perms">
                <strong>Permissions:</strong> create/edit/delete:task, accept:recommendation, export:data
              </div>
            </div>
            <div class="role-box viewer">
              <h4>👁️ Viewer</h4>
              <p class="role-level">Level 1 - Read-Only</p>
              <div class="role-users">
                <strong>Users:</strong> All other tenant users (default)
              </div>
              <div class="role-perms">
                <strong>Permissions:</strong> view:dashboard, view:reports, view:documentation
              </div>
            </div>
          </div>
          <div class="tenant-restriction">
            <h4>🔒 Tenant Restriction</h4>
            <p>Only users from <code>ateara.onmicrosoft.com</code> tenant can access this portal.</p>
            <p>External tenant users are blocked at authentication.</p>
          </div>
          <p class="placeholder-note">Full SVG diagram available in: docs/diagrams/rbac-architecture.svg</p>
        </div>
        <style>
          .rbac-roles {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
          }
          .role-box {
            padding: 24px;
            border-radius: 14px;
            text-align: left;
            box-shadow: var(--shadow-md);
          }
          .role-box.admin { background: linear-gradient(135deg, #d4af37, #b8860b); color: white; }
          .role-box.operator { background: linear-gradient(135deg, #0066b3, #004d86); color: white; }
          .role-box.viewer { background: linear-gradient(135deg, #10b981, #059669); color: white; }
          .role-box h4 { margin: 0 0 10px 0; font-size: 20px; font-weight: 700; }
          .role-level { font-size: 13px; opacity: 0.95; margin-bottom: 18px; font-weight: 500; }
          .role-users, .role-perms { font-size: 13px; margin-bottom: 12px; line-height: 1.6; }
          .role-users ul { margin: 8px 0 0 22px; padding: 0; }
          .tenant-restriction {
            background: linear-gradient(135deg, #7c3aed, #5b21b6);
            color: white;
            padding: 24px;
            border-radius: 14px;
            margin-bottom: 32px;
            box-shadow: var(--shadow-md);
          }
          .tenant-restriction h4 { margin: 0 0 12px 0; font-size: 18px; font-weight: 700; }
          .tenant-restriction p { margin: 8px 0; font-size: 14px; line-height: 1.5; }
          .tenant-restriction code { background: rgba(255,255,255,0.25); padding: 3px 8px; border-radius: 6px; font-weight: 600; }
        </style>
      `,
    };

    return `
      ${descriptions[diagramId]}
      <style>
        .diagram-placeholder {
          padding: 40px;
          text-align: center;
          background: var(--white);
        }
        .diagram-placeholder h3 {
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 32px;
          color: var(--gray-800);
        }
        .placeholder-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 18px;
          margin-bottom: 32px;
        }
        .arch-box, .module-box {
          background: var(--gray-50);
          padding: 22px;
          border-radius: 12px;
          border: 2px solid var(--gray-200);
          text-align: left;
          transition: all 0.2s ease;
        }
        .arch-box:hover, .module-box:hover {
          border-color: var(--primary);
          box-shadow: var(--shadow);
        }
        .arch-box h4, .module-box h4 {
          margin: 0 0 12px 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--primary);
        }
        .arch-box p {
          margin: 0;
          font-size: 14px;
          color: var(--gray-600);
          line-height: 1.5;
        }
        .module-box ul {
          margin: 0;
          padding-left: 20px;
          font-size: 14px;
          color: var(--gray-600);
          line-height: 1.6;
        }
        .module-box.core { border-left: 5px solid var(--primary); }
        .module-box.pages { border-left: 5px solid var(--success); }
        .module-box.viz { border-left: 5px solid var(--warning); }
        .module-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 18px;
          margin-bottom: 32px;
        }
        .flow-diagram {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 32px;
        }
        .flow-step {
          background: var(--gray-50);
          padding: 14px 18px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          border: 2px solid var(--gray-200);
          color: var(--gray-700);
        }
        .flow-arrow {
          font-size: 22px;
          color: var(--primary);
          font-weight: bold;
        }
        .api-list {
          background: var(--gray-50);
          padding: 24px;
          border-radius: 12px;
          text-align: left;
          max-width: 420px;
          margin: 0 auto 32px;
          border: 2px solid var(--gray-200);
        }
        .api-list h4 {
          margin: 0 0 14px 0;
          font-weight: 700;
          color: var(--gray-800);
        }
        .api-list ul {
          margin: 0;
          padding-left: 22px;
          font-size: 14px;
          color: var(--gray-600);
          line-height: 1.7;
        }
        .pipeline-steps {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 32px;
        }
        .pipeline-step {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--gray-50);
          padding: 14px 18px;
          border-radius: 10px;
          border: 2px solid var(--gray-200);
        }
        .step-num {
          background: var(--primary);
          color: var(--white);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
        }
        .step-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-700);
        }
        .cicd-info {
          background: var(--success);
          color: var(--white);
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 32px;
          box-shadow: var(--shadow-md);
        }
        .cicd-info p {
          margin: 10px 0;
          font-size: 15px;
          line-height: 1.5;
        }
        .placeholder-note {
          font-size: 13px;
          color: var(--gray-500);
          font-style: italic;
        }
      </style>
    `;
  },

  currentScale: 1,

  /**
   * Zoom the diagram
   */
  zoom(factor) {
    const viewer = document.getElementById("diagramViewer");
    const svg = viewer?.querySelector("svg");
    if (!svg) return;

    this.currentScale *= factor;
    this.currentScale = Math.max(0.5, Math.min(3, this.currentScale));
    svg.style.transform = `scale(${this.currentScale})`;
    svg.style.transformOrigin = "top left";
    viewer.classList.add("zoomed");
  },

  /**
   * Reset zoom
   */
  resetZoom() {
    const viewer = document.getElementById("diagramViewer");
    const svg = viewer?.querySelector("svg");
    if (!svg) return;

    this.currentScale = 1;
    svg.style.transform = "scale(1)";
    viewer.classList.remove("zoomed");
  },

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    const viewer = document.getElementById("diagramViewer");
    if (!viewer) return;

    viewer.classList.toggle("fullscreen");

    if (viewer.classList.contains("fullscreen")) {
      // Add close button
      const closeBtn = document.createElement("button");
      closeBtn.className = "control-btn fullscreen-close";
      closeBtn.innerHTML = "✕ Close";
      closeBtn.style.cssText =
        "position: fixed; top: 20px; right: 20px; z-index: 1001;";
      closeBtn.onclick = () => this.toggleFullscreen();
      viewer.appendChild(closeBtn);
    } else {
      viewer.querySelector(".fullscreen-close")?.remove();
    }
  },

  /**
   * Download current diagram as SVG
   */
  downloadCurrentDiagram() {
    const fileMap = {
      infrastructure: "infrastructure-architecture.svg",
      dataflow: "data-flow.svg",
      webapp: "webapp-architecture.svg",
      cicd: "github-actions-workflow.svg",
      rbac: "rbac-architecture.svg",
    };

    const fileName = fileMap[this.currentDiagram];
    const link = document.createElement("a");
    link.href = `../../docs/diagrams/${fileName}`;
    link.download = fileName;
    link.click();
  },

  /**
   * Render the deployment guide content
   */
  renderDeploymentGuide() {
    return `
      <div class="doc-content">
        <div class="doc-header">
          <h2>🚀 Deployment Guide</h2>
          <p>Complete guide for deploying the Identity & License Management Portal to Azure</p>
        </div>

        <div class="deploy-cards">
          <div class="doc-card info">
            <div class="card-header">
              <span class="card-icon">📋</span>
              <h3>Prerequisites</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>Azure subscription with Owner or Contributor access</li>
                <li>Azure CLI installed and logged in (<code>az login</code>)</li>
                <li>PowerShell 7+ (pwsh)</li>
                <li>Global Administrator rights for Azure AD App Registration (first deployment)</li>
              </ul>
            </div>
          </div>

          <div class="doc-card success">
            <div class="card-header">
              <span class="card-icon">🆕</span>
              <h3>New Environment Deployment</h3>
            </div>
            <div class="card-content">
              <p>For a completely new customer or environment:</p>
              <div class="code-block">
                <code>.\\Deploy-NewEnvironment.ps1 -CustomerName "mycompany"</code>
                <button class="copy-btn" onclick="DocumentationPage.copyCode(this)">📋</button>
              </div>
              <p class="hint">This creates everything: App Registration, Azure resources, and deploys the webapp.</p>
            </div>
          </div>

          <div class="doc-card">
            <div class="card-header">
              <span class="card-icon">⚡</span>
              <h3>Quick Re-deploy</h3>
            </div>
            <div class="card-content">
              <p>After code changes, use quick deploy:</p>
              <div class="code-block">
                <code>.\\Quick-Deploy.ps1 -CustomerName "mycompany" -OpenBrowser</code>
                <button class="copy-btn" onclick="DocumentationPage.copyCode(this)">📋</button>
              </div>
              <p class="hint">Uses saved configuration - no need to re-enter parameters.</p>
            </div>
          </div>

          <div class="doc-card">
            <div class="card-header">
              <span class="card-icon">🔑</span>
              <h3>Authentication Model</h3>
            </div>
            <div class="card-content">
              <p>This portal uses a secure two-layer authentication model:</p>
              <ol>
                <li><strong>User Login:</strong> Users sign in with their organizational account (User.Read scope only)</li>
                <li><strong>Data Access:</strong> Backend API uses Application permissions to access Graph API data</li>
              </ol>
              <p>No per-user consent prompts are required.</p>
            </div>
          </div>

          <div class="doc-card">
            <div class="card-header">
              <span class="card-icon">🔒</span>
              <h3>API Permissions (Backend)</h3>
            </div>
            <div class="card-content">
              <table class="permissions-table">
                <thead>
                  <tr><th>Permission</th><th>Type</th><th>Purpose</th></tr>
                </thead>
                <tbody>
                  <tr><td>User.Read</td><td>Delegated</td><td>User sign in</td></tr>
                  <tr><td>User.Read.All</td><td>Application</td><td>Read all users</td></tr>
                  <tr><td>Directory.Read.All</td><td>Application</td><td>Read directory</td></tr>
                  <tr><td>AuditLog.Read.All</td><td>Application</td><td>Sign-in logs</td></tr>
                  <tr><td>Organization.Read.All</td><td>Application</td><td>License SKUs</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>
        .doc-content {
          padding: 24px;
          background: var(--gray-50);
          border-radius: 12px;
        }

        .doc-header {
          margin-bottom: 28px;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--gray-200);
        }

        .doc-header h2 {
          margin: 0 0 10px 0;
          font-size: 26px;
          font-weight: 700;
          color: var(--gray-800);
        }

        .doc-header p {
          margin: 0;
          color: var(--gray-600);
          font-size: 15px;
          line-height: 1.5;
        }

        .deploy-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }

        .doc-card {
          background: var(--white);
          border-radius: 14px;
          padding: 24px;
          border: 2px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
        }

        .doc-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .doc-card.info {
          border-color: var(--primary);
          background: linear-gradient(135deg, rgba(0, 102, 179, 0.03) 0%, var(--white) 100%);
        }

        .doc-card.warning {
          border-color: var(--warning);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, var(--white) 100%);
        }

        .doc-card.success {
          border-color: var(--success);
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, var(--white) 100%);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .card-icon {
          font-size: 28px;
        }

        .card-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--gray-800);
        }

        .card-content {
          font-size: 15px;
          line-height: 1.7;
          color: var(--gray-700);
        }

        .card-content ul,
        .card-content ol {
          margin: 10px 0;
          padding-left: 22px;
        }

        .card-content li {
          margin-bottom: 6px;
          color: var(--gray-700);
        }

        .code-block {
          display: flex;
          align-items: center;
          background: var(--gray-800);
          border-radius: 10px;
          padding: 14px 18px;
          margin: 14px 0;
          overflow-x: auto;
          border: 1px solid var(--gray-700);
        }

        .code-block code {
          flex: 1;
          color: #7dd3fc;
          font-family: 'Consolas', 'Monaco', 'Fira Code', monospace;
          font-size: 14px;
          white-space: nowrap;
          letter-spacing: 0.3px;
        }

        .copy-btn {
          background: var(--gray-700);
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 6px;
          opacity: 0.8;
          transition: all 0.2s;
          font-size: 14px;
        }

        .copy-btn:hover {
          opacity: 1;
          background: var(--gray-600);
        }

        .hint {
          color: var(--gray-500);
          font-size: 13px;
          margin: 10px 0 0 0;
          font-style: italic;
        }

        .permissions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          margin-top: 12px;
          background: var(--white);
          border-radius: 8px;
          overflow: hidden;
        }

        .permissions-table th,
        .permissions-table td {
          padding: 12px 14px;
          text-align: left;
          border-bottom: 1px solid var(--gray-200);
        }

        .permissions-table th {
          background: var(--gray-100);
          color: var(--gray-700);
          font-weight: 600;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 0.5px;
        }

        .permissions-table td {
          color: var(--gray-700);
        }

        .permissions-table tr:last-child td {
          border-bottom: none;
        }

        .permissions-table tr:hover td {
          background: var(--gray-50);
        }

        @media (max-width: 768px) {
          .deploy-cards {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  },

  /**
   * Render the scripts reference content
   */
  renderScriptsReference() {
    const scripts = [
      {
        name: "Deploy-NewEnvironment.ps1",
        icon: "🚀",
        category: "Primary",
        description:
          "Complete deployment for a new customer/environment. Creates app registration, deploys infrastructure, deploys webapp, saves configuration.",
        params: [
          {
            name: "-CustomerName",
            required: true,
            desc: "Short name (lowercase, alphanumeric)",
          },
          {
            name: "-Environment",
            required: false,
            desc: "dev, test, prod (default: dev)",
          },
          { name: "-TenantId", required: false, desc: "Azure AD Tenant ID" },
          {
            name: "-Location",
            required: false,
            desc: "Azure region (default: norwayeast)",
          },
          {
            name: "-SkipInfrastructure",
            required: false,
            desc: "Skip Bicep deployment",
          },
          { name: "-NonInteractive", required: false, desc: "No prompts" },
        ],
        example: '.Deploy-NewEnvironment.ps1 -CustomerName "mycompany"',
      },
      {
        name: "Quick-Deploy.ps1",
        icon: "⚡",
        category: "Primary",
        description:
          "Quick re-deploy using saved configuration. Use after code changes.",
        params: [
          {
            name: "-CustomerName",
            required: true,
            desc: "Customer name (must match existing config)",
          },
          {
            name: "-Environment",
            required: false,
            desc: "dev, test, prod (default: dev)",
          },
          {
            name: "-OpenBrowser",
            required: false,
            desc: "Open portal after deploy",
          },
        ],
        example: '.Quick-Deploy.ps1 -CustomerName "mycompany" -OpenBrowser',
      },
      {
        name: "Start-LocalDev.ps1",
        icon: "🖥️",
        category: "Development",
        description: "Start a local development server on port 8080.",
        params: [
          {
            name: "-Port",
            required: false,
            desc: "Port number (default: 8080)",
          },
          { name: "-OpenBrowser", required: false, desc: "Auto-open browser" },
        ],
        example: ".Start-LocalDev.ps1",
      },
      {
        name: "Configure-Environment.ps1",
        icon: "⚙️",
        category: "Configuration",
        description: "Configure the webapp with Azure AD settings.",
        params: [
          { name: "-ClientId", required: false, desc: "Azure AD Client ID" },
          { name: "-TenantId", required: false, desc: "Azure AD Tenant ID" },
          { name: "-Environment", required: false, desc: "Target environment" },
          {
            name: "-RestoreTemplate",
            required: false,
            desc: "Restore to template state",
          },
        ],
        example: '.Configure-Environment.ps1 -ClientId "xxx" -TenantId "xxx"',
      },
      {
        name: "Setup-AzureResources.ps1",
        icon: "🏗️",
        category: "Infrastructure",
        description:
          "Create Azure resources only (App Registration, Resource Group, RBAC).",
        params: [
          { name: "-Environment", required: false, desc: "dev, test, prod" },
          { name: "-Location", required: false, desc: "Azure region" },
          { name: "-SkipGitHub", required: false, desc: "Skip GitHub setup" },
        ],
        example: ".Setup-AzureResources.ps1 -Environment dev",
      },
      {
        name: "Deploy-Customer.ps1",
        icon: "🏢",
        category: "Customer",
        description:
          "Deploy for a specific customer with full configuration options.",
        params: [
          {
            name: "-CustomerName",
            required: true,
            desc: "Customer short name",
          },
          { name: "-Environment", required: false, desc: "Target environment" },
          {
            name: "-EnvironmentType",
            required: false,
            desc: "cloud, hybrid, auto",
          },
        ],
        example:
          '.Deploy-Customer.ps1 -CustomerName "contoso" -Environment prod',
      },
    ];

    const categories = [...new Set(scripts.map((s) => s.category))];

    let html =
      '<div class="doc-content"><div class="doc-header"><h2>📜 PowerShell Scripts Reference</h2><p>Complete reference for all deployment and configuration scripts</p></div><div class="scripts-list">';

    categories.forEach((cat) => {
      html +=
        '<div class="script-category"><h3 class="category-title">' +
        cat +
        '</h3><div class="scripts-grid">';

      scripts
        .filter((s) => s.category === cat)
        .forEach((script) => {
          html += '<div class="script-card">';
          html +=
            '<div class="script-header"><span class="script-icon">' +
            script.icon +
            '</span><code class="script-name">' +
            script.name +
            "</code></div>";
          html += '<p class="script-desc">' + script.description + "</p>";
          html +=
            '<div class="script-params"><h4>Parameters:</h4><table><tbody>';

          script.params.forEach((p) => {
            const reqClass = p.required ? "required" : "optional";
            const reqText = p.required ? "Required" : "Optional";
            html +=
              "<tr><td><code>" +
              p.name +
              '</code></td><td><span class="' +
              reqClass +
              '">' +
              reqText +
              "</span></td><td>" +
              p.desc +
              "</td></tr>";
          });

          html += "</tbody></table></div>";
          html +=
            '<div class="script-example"><h4>Example:</h4><div class="code-block"><code>' +
            script.example +
            "</code>";
          html +=
            '<button class="copy-btn" onclick="DocumentationPage.copyCode(this)">📋</button></div></div>';
          html += "</div>";
        });

      html += "</div></div>";
    });

    html += "</div></div>";

    html += this.getScriptsStyles();

    return html;
  },

  /**
   * Get styles for the scripts reference section
   */
  getScriptsStyles() {
    return `
      <style>
        .scripts-list {
          display: flex;
          flex-direction: column;
          gap: 36px;
        }

        .script-category {
          margin-bottom: 20px;
        }

        .category-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
          margin: 0 0 20px 0;
          padding-bottom: 12px;
          border-bottom: 3px solid var(--primary);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .scripts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 24px;
        }

        .script-card {
          background: var(--white);
          border-radius: 14px;
          padding: 24px;
          border: 2px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
          transition: all 0.2s ease;
        }

        .script-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--primary-light);
          transform: translateY(-2px);
        }

        .script-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .script-icon {
          font-size: 28px;
        }

        .script-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary);
          background: rgba(0, 102, 179, 0.1);
          padding: 6px 14px;
          border-radius: 8px;
          font-family: 'Consolas', 'Monaco', monospace;
        }

        .script-desc {
          color: var(--gray-600);
          margin: 0 0 18px 0;
          font-size: 15px;
          line-height: 1.6;
        }

        .script-params h4,
        .script-example h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .script-params table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          margin-bottom: 18px;
          background: var(--gray-50);
          border-radius: 8px;
          overflow: hidden;
        }

        .script-params td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--gray-200);
          color: var(--gray-700);
        }

        .script-params tr:last-child td {
          border-bottom: none;
        }

        .script-params td:first-child code {
          color: #0284c7;
          background: var(--white);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid var(--gray-200);
        }

        .required {
          color: var(--danger);
          font-size: 11px;
          font-weight: 700;
          background: var(--danger-bg);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .optional {
          color: var(--gray-500);
          font-size: 11px;
          font-weight: 600;
          background: var(--gray-100);
          padding: 2px 8px;
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .scripts-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  },

  /**
   * Copy code to clipboard
   */
  copyCode(button) {
    const codeBlock = button.parentElement;
    const code = codeBlock.querySelector("code").textContent;

    navigator.clipboard.writeText(code).then(() => {
      const originalText = button.textContent;
      button.textContent = "✓";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DocumentationPage;
}
