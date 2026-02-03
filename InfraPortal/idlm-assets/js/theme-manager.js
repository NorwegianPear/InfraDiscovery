/**
 * Theme Manager - Handles theme switching across the entire application
 * Supports multiple color themes that apply to all pages and components
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const ThemeManager = {
  // Available themes
  themes: {
    default: {
      name: "Atea Blue (Default)",
      icon: "🔵",
      colors: {
        primary: "#0066b3",
        "primary-dark": "#004d86",
        "primary-light": "#0080df",
        "primary-gradient": "linear-gradient(135deg, #0066b3 0%, #00a0e3 100%)",
        secondary: "#64748b",
        accent: "#00a0e3",
        // Backgrounds
        "bg-body": "#f1f5f9",
        "bg-card": "#ffffff",
        "bg-sidebar":
          "linear-gradient(180deg, #0f172a 0%, #1a2744 50%, #1e293b 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#94a3b8",
        // Text
        "text-primary": "#1e293b",
        "text-secondary": "#64748b",
        "text-muted": "#94a3b8",
        // Borders
        "border-color": "#e2e8f0",
        "border-light": "#f1f5f9",
      },
    },
    light: {
      name: "Light",
      icon: "☀️",
      colors: {
        primary: "#2563eb",
        "primary-dark": "#1d4ed8",
        "primary-light": "#3b82f6",
        "primary-gradient": "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)",
        secondary: "#6b7280",
        accent: "#0ea5e9",
        "bg-body": "#ffffff",
        "bg-card": "#f9fafb",
        "bg-sidebar":
          "linear-gradient(180deg, #1f2937 0%, #374151 50%, #4b5563 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#d1d5db",
        "text-primary": "#111827",
        "text-secondary": "#4b5563",
        "text-muted": "#9ca3af",
        "border-color": "#e5e7eb",
        "border-light": "#f3f4f6",
      },
    },
    dark: {
      name: "Dark",
      icon: "🌙",
      colors: {
        primary: "#3b82f6",
        "primary-dark": "#2563eb",
        "primary-light": "#60a5fa",
        "primary-gradient": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
        secondary: "#9ca3af",
        accent: "#06b6d4",
        "bg-body": "#0f172a",
        "bg-card": "#1e293b",
        "bg-sidebar":
          "linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)",
        "sidebar-text": "#f1f5f9",
        "sidebar-text-muted": "#94a3b8",
        "text-primary": "#f1f5f9",
        "text-secondary": "#cbd5e1",
        "text-muted": "#94a3b8",
        "border-color": "#334155",
        "border-light": "#1e293b",
      },
    },
    pink: {
      name: "Pink Pastel",
      icon: "🌸",
      colors: {
        primary: "#ec4899",
        "primary-dark": "#db2777",
        "primary-light": "#f472b6",
        "primary-gradient": "linear-gradient(135deg, #ec4899 0%, #f9a8d4 100%)",
        secondary: "#a78bfa",
        accent: "#f472b6",
        "bg-body": "#fdf2f8",
        "bg-card": "#ffffff",
        "bg-sidebar":
          "linear-gradient(180deg, #831843 0%, #9d174d 50%, #be185d 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#fbcfe8",
        "text-primary": "#831843",
        "text-secondary": "#9d174d",
        "text-muted": "#f9a8d4",
        "border-color": "#fbcfe8",
        "border-light": "#fce7f3",
      },
    },
    green: {
      name: "Atea Green",
      icon: "🌿",
      colors: {
        primary: "#059669",
        "primary-dark": "#047857",
        "primary-light": "#10b981",
        "primary-gradient": "linear-gradient(135deg, #059669 0%, #34d399 100%)",
        secondary: "#6b7280",
        accent: "#14b8a6",
        "bg-body": "#f0fdf4",
        "bg-card": "#ffffff",
        "bg-sidebar":
          "linear-gradient(180deg, #064e3b 0%, #065f46 50%, #047857 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#a7f3d0",
        "text-primary": "#064e3b",
        "text-secondary": "#065f46",
        "text-muted": "#6ee7b7",
        "border-color": "#a7f3d0",
        "border-light": "#d1fae5",
      },
    },
    windows: {
      name: "Windows 11",
      icon: "🪟",
      colors: {
        primary: "#0078d4",
        "primary-dark": "#106ebe",
        "primary-light": "#1a86d9",
        "primary-gradient": "linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)",
        secondary: "#605e5c",
        accent: "#00bcf2",
        "bg-body": "#f3f3f3",
        "bg-card": "#ffffff",
        "bg-sidebar":
          "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 50%, #3d3d3d 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#b3b3b3",
        "text-primary": "#1a1a1a",
        "text-secondary": "#605e5c",
        "text-muted": "#a19f9d",
        "border-color": "#d2d0ce",
        "border-light": "#edebe9",
      },
    },
    purple: {
      name: "Purple Elegance",
      icon: "💜",
      colors: {
        primary: "#7c3aed",
        "primary-dark": "#6d28d9",
        "primary-light": "#8b5cf6",
        "primary-gradient": "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
        secondary: "#6b7280",
        accent: "#a855f7",
        "bg-body": "#faf5ff",
        "bg-card": "#ffffff",
        "bg-sidebar":
          "linear-gradient(180deg, #3b0764 0%, #581c87 50%, #6b21a8 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#d8b4fe",
        "text-primary": "#3b0764",
        "text-secondary": "#6b21a8",
        "text-muted": "#c4b5fd",
        "border-color": "#e9d5ff",
        "border-light": "#f3e8ff",
      },
    },
    ocean: {
      name: "Ocean Blue",
      icon: "🌊",
      colors: {
        primary: "#0891b2",
        "primary-dark": "#0e7490",
        "primary-light": "#06b6d4",
        "primary-gradient": "linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)",
        secondary: "#64748b",
        accent: "#22d3ee",
        "bg-body": "#ecfeff",
        "bg-card": "#ffffff",
        "bg-sidebar":
          "linear-gradient(180deg, #083344 0%, #0e4a5c 50%, #155e75 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#a5f3fc",
        "text-primary": "#083344",
        "text-secondary": "#155e75",
        "text-muted": "#67e8f9",
        "border-color": "#a5f3fc",
        "border-light": "#cffafe",
      },
    },
    sunset: {
      name: "Sunset Orange",
      icon: "🌅",
      colors: {
        primary: "#ea580c",
        "primary-dark": "#c2410c",
        "primary-light": "#f97316",
        "primary-gradient": "linear-gradient(135deg, #ea580c 0%, #fb923c 100%)",
        secondary: "#78716c",
        accent: "#fb923c",
        "bg-body": "#fff7ed",
        "bg-card": "#ffffff",
        "bg-sidebar":
          "linear-gradient(180deg, #431407 0%, #7c2d12 50%, #9a3412 100%)",
        "sidebar-text": "#ffffff",
        "sidebar-text-muted": "#fed7aa",
        "text-primary": "#431407",
        "text-secondary": "#9a3412",
        "text-muted": "#fdba74",
        "border-color": "#fed7aa",
        "border-light": "#ffedd5",
      },
    },
    midnight: {
      name: "Midnight",
      icon: "🌌",
      colors: {
        primary: "#6366f1",
        "primary-dark": "#4f46e5",
        "primary-light": "#818cf8",
        "primary-gradient": "linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)",
        secondary: "#a1a1aa",
        accent: "#818cf8",
        "bg-body": "#18181b",
        "bg-card": "#27272a",
        "bg-sidebar":
          "linear-gradient(180deg, #09090b 0%, #18181b 50%, #27272a 100%)",
        "sidebar-text": "#fafafa",
        "sidebar-text-muted": "#a1a1aa",
        "text-primary": "#fafafa",
        "text-secondary": "#d4d4d8",
        "text-muted": "#71717a",
        "border-color": "#3f3f46",
        "border-light": "#27272a",
      },
    },
  },

  currentTheme: "default",

  /**
   * Initialize the theme manager
   */
  init() {
    // Load saved theme or use default
    const savedTheme = localStorage.getItem("atea-idlm-theme") || "default";
    this.applyTheme(savedTheme);
    this.renderThemeToggle();
    console.log(`🎨 Theme Manager initialized with theme: ${savedTheme}`);
  },

  /**
   * Apply a theme by name
   */
  applyTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) {
      console.warn(`Theme "${themeName}" not found, using default`);
      themeName = "default";
    }

    this.currentTheme = themeName;
    const colors = this.themes[themeName].colors;

    // Apply CSS custom properties to root
    const root = document.documentElement;

    // Apply all theme colors
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });

    // Apply theme-specific overrides for consistency
    this.applyThemeOverrides(themeName, colors);

    // Save preference
    localStorage.setItem("atea-idlm-theme", themeName);

    // Update toggle button if it exists
    this.updateToggleButton();

    // Dispatch event for other components
    window.dispatchEvent(
      new CustomEvent("themeChanged", { detail: { theme: themeName } })
    );

    console.log(`🎨 Applied theme: ${theme.name}`);
  },

  /**
   * Apply additional overrides for full theme consistency
   */
  applyThemeOverrides(themeName, colors) {
    const root = document.documentElement;

    // Map to existing CSS variables used throughout the app
    root.style.setProperty("--gray-50", colors["bg-card"] || "#f8fafc");
    root.style.setProperty("--gray-100", colors["bg-body"] || "#f1f5f9");
    root.style.setProperty("--gray-200", colors["border-color"] || "#e2e8f0");
    root.style.setProperty("--gray-500", colors["text-muted"] || "#64748b");
    root.style.setProperty("--gray-600", colors["text-secondary"] || "#475569");
    root.style.setProperty("--gray-700", colors["text-secondary"] || "#334155");
    root.style.setProperty("--gray-800", colors["text-primary"] || "#1e293b");

    // Update body background
    document.body.style.backgroundColor = colors["bg-body"];
    document.body.style.color = colors["text-primary"];

    // Add theme class to body for CSS hooks
    document.body.className = document.body.className.replace(/theme-\w+/g, "");
    document.body.classList.add(`theme-${themeName}`);
  },

  /**
   * Render the theme toggle dropdown in the header
   */
  renderThemeToggle() {
    const headerRight = document.querySelector(".header-right");
    if (!headerRight) return;

    // Check if toggle already exists
    if (document.getElementById("themeToggle")) return;

    const toggleContainer = document.createElement("div");
    toggleContainer.className = "theme-toggle-container";
    toggleContainer.id = "themeToggle";
    toggleContainer.innerHTML = `
      <button class="theme-toggle-btn" id="themeToggleBtn" title="Change Theme">
        <span class="theme-icon">${
          this.themes[this.currentTheme]?.icon || "🎨"
        }</span>
        <span class="theme-label">Theme</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="theme-dropdown" id="themeDropdown">
        <div class="theme-dropdown-header">
          <span>🎨</span> Choose Theme
        </div>
        <div class="theme-options">
          ${Object.entries(this.themes)
            .map(
              ([key, theme]) => `
            <button class="theme-option ${
              key === this.currentTheme ? "active" : ""
            }" data-theme="${key}">
              <span class="theme-option-icon">${theme.icon}</span>
              <span class="theme-option-name">${theme.name}</span>
              ${
                key === this.currentTheme
                  ? '<span class="theme-check">✓</span>'
                  : ""
              }
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // Insert before the currency selector
    const currencySelector = headerRight.querySelector(".currency-selector");
    if (currencySelector) {
      headerRight.insertBefore(toggleContainer, currencySelector);
    } else {
      headerRight.prepend(toggleContainer);
    }

    // Add event listeners
    this.setupEventListeners();
    this.injectStyles();
  },

  /**
   * Setup event listeners for the theme toggle
   */
  setupEventListeners() {
    const toggleBtn = document.getElementById("themeToggleBtn");
    const dropdown = document.getElementById("themeDropdown");

    if (toggleBtn && dropdown) {
      // Toggle dropdown
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".theme-toggle-container")) {
          dropdown.classList.remove("show");
        }
      });

      // Theme selection
      dropdown.querySelectorAll(".theme-option").forEach((option) => {
        option.addEventListener("click", (e) => {
          const themeName = option.dataset.theme;
          this.applyTheme(themeName);
          dropdown.classList.remove("show");
        });
      });
    }
  },

  /**
   * Update the toggle button to reflect current theme
   */
  updateToggleButton() {
    const toggleBtn = document.getElementById("themeToggleBtn");
    const dropdown = document.getElementById("themeDropdown");

    if (toggleBtn) {
      const theme = this.themes[this.currentTheme];
      toggleBtn.querySelector(".theme-icon").textContent = theme?.icon || "🎨";
    }

    if (dropdown) {
      dropdown.querySelectorAll(".theme-option").forEach((option) => {
        const isActive = option.dataset.theme === this.currentTheme;
        option.classList.toggle("active", isActive);

        // Update checkmark
        let check = option.querySelector(".theme-check");
        if (isActive && !check) {
          const checkSpan = document.createElement("span");
          checkSpan.className = "theme-check";
          checkSpan.textContent = "✓";
          option.appendChild(checkSpan);
        } else if (!isActive && check) {
          check.remove();
        }
      });
    }
  },

  /**
   * Inject theme toggle styles
   */
  injectStyles() {
    if (document.getElementById("theme-toggle-styles")) return;

    const styles = document.createElement("style");
    styles.id = "theme-toggle-styles";
    styles.textContent = `
      /* Theme Toggle Container */
      .theme-toggle-container {
        position: relative;
        display: inline-block;
      }

      .theme-toggle-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: var(--bg-card, #ffffff);
        border: 2px solid var(--border-color, #e2e8f0);
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        transition: all 0.2s ease;
        box-shadow: var(--shadow-sm);
      }

      .theme-toggle-btn:hover {
        border-color: var(--primary, #0066b3);
        background: var(--primary, #0066b3);
        color: white;
        box-shadow: var(--shadow-md);
      }

      .theme-toggle-btn .theme-icon {
        font-size: 18px;
      }

      .theme-toggle-btn .dropdown-arrow {
        font-size: 10px;
        opacity: 0.7;
        transition: transform 0.2s;
      }

      .theme-toggle-container:has(.theme-dropdown.show) .dropdown-arrow {
        transform: rotate(180deg);
      }

      /* Theme Dropdown */
      .theme-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        width: 260px;
        background: var(--bg-card, #ffffff);
        border: 2px solid var(--border-color, #e2e8f0);
        border-radius: 14px;
        box-shadow: var(--shadow-xl);
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s ease;
        z-index: 1000;
        overflow: hidden;
      }

      .theme-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .theme-dropdown-header {
        padding: 14px 18px;
        background: var(--primary-gradient, linear-gradient(135deg, #0066b3 0%, #00a0e3 100%));
        color: white;
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .theme-options {
        padding: 10px;
        max-height: 400px;
        overflow-y: auto;
      }

      .theme-option {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px 14px;
        background: transparent;
        border: 2px solid transparent;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        transition: all 0.15s ease;
        text-align: left;
      }

      .theme-option:hover {
        background: var(--bg-body, #f1f5f9);
        border-color: var(--border-color, #e2e8f0);
      }

      .theme-option.active {
        background: rgba(0, 102, 179, 0.1);
        border-color: var(--primary, #0066b3);
        color: var(--primary, #0066b3);
      }

      .theme-option-icon {
        font-size: 20px;
        width: 28px;
        text-align: center;
      }

      .theme-option-name {
        flex: 1;
      }

      .theme-check {
        color: var(--primary, #0066b3);
        font-weight: 700;
        font-size: 16px;
      }

      /* Dark theme adjustments */
      body.theme-dark .theme-toggle-btn,
      body.theme-midnight .theme-toggle-btn {
        background: var(--bg-card);
        color: var(--text-primary);
      }

      body.theme-dark .theme-dropdown,
      body.theme-midnight .theme-dropdown {
        background: var(--bg-card);
        border-color: var(--border-color);
      }

      body.theme-dark .theme-option,
      body.theme-midnight .theme-option {
        color: var(--text-primary);
      }

      body.theme-dark .theme-option:hover,
      body.theme-midnight .theme-option:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      /* Scrollbar for theme options */
      .theme-options::-webkit-scrollbar {
        width: 6px;
      }

      .theme-options::-webkit-scrollbar-track {
        background: var(--bg-body, #f1f5f9);
        border-radius: 3px;
      }

      .theme-options::-webkit-scrollbar-thumb {
        background: var(--border-color, #e2e8f0);
        border-radius: 3px;
      }

      .theme-options::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted, #94a3b8);
      }

      /* Responsive */
      @media (max-width: 768px) {
        .theme-toggle-btn .theme-label {
          display: none;
        }
        
        .theme-dropdown {
          width: 240px;
          right: -50px;
        }
      }
    `;
    document.head.appendChild(styles);
  },

  /**
   * Get current theme name
   */
  getCurrentTheme() {
    return this.currentTheme;
  },

  /**
   * Get theme by name
   */
  getTheme(themeName) {
    return this.themes[themeName];
  },

  /**
   * Cycle to next theme (useful for keyboard shortcuts)
   */
  nextTheme() {
    const themeNames = Object.keys(this.themes);
    const currentIndex = themeNames.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    this.applyTheme(themeNames[nextIndex]);
  },
};

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => ThemeManager.init());
} else {
  ThemeManager.init();
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeManager;
}
