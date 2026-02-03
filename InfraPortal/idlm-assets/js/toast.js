/**
 * Toast Notification System
 * Provides non-intrusive notifications for user feedback
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const Toast = {
  container: null,
  queue: [],
  maxVisible: 5,

  /**
   * Initialize the toast system
   */
  init() {
    if (this.container) return;

    this.container = document.createElement("div");
    this.container.id = "toast-container";
    this.container.className = "toast-container";
    document.body.appendChild(this.container);

    this.injectStyles();
  },

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Type: success, error, warning, info
   * @param {number} duration - Duration in ms (0 for persistent)
   * @param {object} options - Additional options
   */
  show(message, type = "info", duration = 4000, options = {}) {
    this.init();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        ${
          options.title ? `<div class="toast-title">${options.title}</div>` : ""
        }
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="Toast.dismiss(this.parentElement)">×</button>
      ${duration > 0 ? '<div class="toast-progress"></div>' : ""}
    `;

    // Add action button if provided
    if (options.action) {
      const actionBtn = document.createElement("button");
      actionBtn.className = "toast-action";
      actionBtn.textContent = options.action.label;
      actionBtn.onclick = () => {
        options.action.callback();
        this.dismiss(toast);
      };
      toast.querySelector(".toast-content").appendChild(actionBtn);
    }

    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add("toast-visible");
    });

    // Set progress bar animation
    if (duration > 0) {
      const progress = toast.querySelector(".toast-progress");
      if (progress) {
        progress.style.animationDuration = `${duration}ms`;
      }

      // Auto dismiss
      toast.timeout = setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    // Limit visible toasts
    const toasts = this.container.querySelectorAll(".toast");
    if (toasts.length > this.maxVisible) {
      this.dismiss(toasts[0]);
    }

    return toast;
  },

  /**
   * Dismiss a toast
   */
  dismiss(toast) {
    if (!toast || toast.classList.contains("toast-dismissed")) return;

    toast.classList.add("toast-dismissed");
    if (toast.timeout) clearTimeout(toast.timeout);

    setTimeout(() => {
      toast.remove();
    }, 300);
  },

  /**
   * Show success toast
   */
  success(message, options = {}) {
    return this.show(message, "success", options.duration || 3000, options);
  },

  /**
   * Show error toast
   */
  error(message, options = {}) {
    return this.show(message, "error", options.duration || 5000, options);
  },

  /**
   * Show warning toast
   */
  warning(message, options = {}) {
    return this.show(message, "warning", options.duration || 4000, options);
  },

  /**
   * Show info toast
   */
  info(message, options = {}) {
    return this.show(message, "info", options.duration || 4000, options);
  },

  /**
   * Show loading toast (persistent until dismissed)
   */
  loading(message, options = {}) {
    const toast = this.show(message, "info", 0, {
      ...options,
      title: options.title || "Loading...",
    });
    toast.classList.add("toast-loading");
    toast.querySelector(".toast-icon").innerHTML =
      '<div class="toast-spinner"></div>';
    return toast;
  },

  /**
   * Promise-based toast for async operations
   */
  async promise(promise, messages = {}) {
    const loadingToast = this.loading(messages.loading || "Processing...");

    try {
      const result = await promise;
      this.dismiss(loadingToast);
      this.success(messages.success || "Done!");
      return result;
    } catch (error) {
      this.dismiss(loadingToast);
      this.error(messages.error || error.message || "An error occurred");
      throw error;
    }
  },

  /**
   * Clear all toasts
   */
  clear() {
    if (this.container) {
      this.container.querySelectorAll(".toast").forEach((t) => this.dismiss(t));
    }
  },

  /**
   * Inject toast styles
   */
  injectStyles() {
    if (document.getElementById("toast-styles")) return;

    const styles = document.createElement("style");
    styles.id = "toast-styles";
    styles.textContent = `
      .toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000;
        display: flex;
        flex-direction: column-reverse;
        gap: 12px;
        max-width: 420px;
        pointer-events: none;
      }

      .toast {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background: var(--bg-card, white);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        transform: translateX(120%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: all;
        position: relative;
        overflow: hidden;
        border-left: 4px solid;
      }

      .toast-visible {
        transform: translateX(0);
        opacity: 1;
      }

      .toast-dismissed {
        transform: translateX(120%);
        opacity: 0;
      }

      .toast-success {
        border-left-color: var(--success, #22c55e);
      }

      .toast-error {
        border-left-color: var(--danger, #ef4444);
      }

      .toast-warning {
        border-left-color: var(--warning, #f59e0b);
      }

      .toast-info {
        border-left-color: var(--primary, #0066b3);
      }

      .toast-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
      }

      .toast-success .toast-icon {
        background: var(--success-bg, #dcfce7);
        color: var(--success, #22c55e);
      }

      .toast-error .toast-icon {
        background: var(--danger-bg, #fef2f2);
        color: var(--danger, #ef4444);
      }

      .toast-warning .toast-icon {
        background: var(--warning-bg, #fef3c7);
        color: var(--warning, #f59e0b);
      }

      .toast-info .toast-icon {
        background: var(--info-bg, #dbeafe);
        color: var(--primary, #0066b3);
      }

      .toast-content {
        flex: 1;
        min-width: 0;
      }

      .toast-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary, #1e293b);
      }

      .toast-message {
        font-size: 14px;
        color: var(--text-secondary, #64748b);
        line-height: 1.4;
      }

      .toast-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: var(--text-muted, #94a3b8);
        padding: 4px;
        line-height: 1;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .toast-close:hover {
        background: var(--bg-secondary, #f1f5f9);
        color: var(--text-primary, #1e293b);
      }

      .toast-action {
        margin-top: 8px;
        padding: 6px 12px;
        background: var(--primary, #0066b3);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .toast-action:hover {
        background: var(--primary-dark, #004c8c);
      }

      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.3;
        animation: toast-progress linear forwards;
        width: 100%;
      }

      @keyframes toast-progress {
        from { width: 100%; }
        to { width: 0%; }
      }

      .toast-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: toast-spin 0.8s linear infinite;
      }

      @keyframes toast-spin {
        to { transform: rotate(360deg); }
      }

      .toast-loading .toast-close {
        display: none;
      }

      /* Dark mode */
      [data-theme="dark"] .toast {
        background: var(--bg-card, #1e293b);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }

      /* Mobile responsive */
      @media (max-width: 480px) {
        .toast-container {
          left: 16px;
          right: 16px;
          bottom: 16px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(styles);
  },
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => Toast.init());
