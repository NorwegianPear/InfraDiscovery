/**
 * Norwegian Locale Utilities
 * Provides consistent date, time, number, and currency formatting
 * Default: Norwegian locale (nb-NO), NOK currency, 24-hour time, dd.MM.yyyy date format
 * Supports dynamic currency switching via dropdown
 */

const LocaleUtils = {
  // Default settings (Norwegian)
  defaults: {
    locale: "nb-NO",
    currency: "NOK",
    dateFormat: "dd.MM.yyyy",
    use24Hour: true,
  },

  // Supported currencies
  currencies: {
    NOK: { symbol: "kr", locale: "nb-NO", name: "Norwegian Krone" },
    SEK: { symbol: "kr", locale: "sv-SE", name: "Swedish Krona" },
    EUR: { symbol: "€", locale: "de-DE", name: "Euro" },
    USD: { symbol: "$", locale: "en-US", name: "US Dollar" },
    GBP: { symbol: "£", locale: "en-GB", name: "British Pound" },
  },

  /**
   * Get current locale settings
   */
  getSettings() {
    const currency = Config?.ui?.currency || this.defaults.currency;
    const currencyInfo = this.currencies[currency] || this.currencies.NOK;
    return {
      locale: currencyInfo.locale,
      currency,
      symbol: currencyInfo.symbol,
      use24Hour: true,
    };
  },

  /**
   * Set currency and save to config
   * @param {string} currency - Currency code (NOK, SEK, EUR, USD, GBP)
   */
  setCurrency(currency) {
    if (!this.currencies[currency]) {
      console.warn(`Unknown currency: ${currency}, defaulting to NOK`);
      currency = "NOK";
    }

    if (Config?.ui) {
      Config.ui.currency = currency;
      Config.save();
    }

    // Dispatch event for components to update
    window.dispatchEvent(
      new CustomEvent("currencyChanged", { detail: { currency } })
    );

    console.log(`💱 Currency changed to ${currency}`);
  },

  /**
   * Get current currency code
   * @returns {string} Currency code
   */
  getCurrency() {
    return Config?.ui?.currency || this.defaults.currency;
  },

  /**
   * Format currency value
   * @param {number} amount - The amount to format
   * @returns {string} Formatted currency string (e.g., "kr 1 234")
   */
  formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      const symbol = this.getSettings().symbol;
      return `${symbol} --`;
    }

    const settings = this.getSettings();
    return new Intl.NumberFormat(settings.locale, {
      style: "currency",
      currency: settings.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  /**
   * Format number with locale-specific thousand separators
   * @param {number} num - The number to format
   * @returns {string} Formatted number string (e.g., "1 234 567")
   */
  formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) {
      return "--";
    }

    const settings = this.getSettings();
    return new Intl.NumberFormat(settings.locale).format(num);
  },

  /**
   * Format date in Norwegian format (dd.MM.yyyy)
   * @param {Date|string} date - The date to format
   * @returns {string} Formatted date string (e.g., "11.12.2025")
   */
  formatDate(date) {
    if (!date) return "--";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
  },

  /**
   * Format time in 24-hour format (HH:mm)
   * @param {Date|string} date - The date/time to format
   * @returns {string} Formatted time string (e.g., "14:30")
   */
  formatTime(date) {
    if (!date) return "--";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  },

  /**
   * Format date and time in Norwegian format (dd.MM.yyyy HH:mm)
   * @param {Date|string} date - The date/time to format
   * @returns {string} Formatted datetime string (e.g., "11.12.2025 14:30")
   */
  formatDateTime(date) {
    if (!date) return "--";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";

    return `${this.formatDate(d)} ${this.formatTime(d)}`;
  },

  /**
   * Format date with full month name in Norwegian
   * @param {Date|string} date - The date to format
   * @returns {string} Formatted date string (e.g., "11. desember 2025")
   */
  formatDateLong(date) {
    if (!date) return "--";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";

    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  },

  /**
   * Format relative time (e.g., "2 timer siden", "om 3 dager")
   * @param {Date|string} date - The date to compare
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    if (!date) return "--";

    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat("nb-NO", { numeric: "auto" });

    if (Math.abs(diffDays) >= 1) {
      return rtf.format(diffDays, "day");
    } else if (Math.abs(diffHours) >= 1) {
      return rtf.format(diffHours, "hour");
    } else if (Math.abs(diffMins) >= 1) {
      return rtf.format(diffMins, "minute");
    } else {
      return rtf.format(diffSecs, "second");
    }
  },

  /**
   * Format currency for chart axis/labels (shorter format)
   * @param {number} value - The value to format
   * @returns {string} Short currency format (e.g., "kr 1 234")
   */
  formatCurrencyShort(value) {
    const symbol = this.getSettings().symbol;
    if (value >= 1000000) {
      return `${symbol} ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${symbol} ${(value / 1000).toFixed(0)}k`;
    }
    return `${symbol} ${value}`;
  },

  /**
   * Get currency symbol
   * @returns {string} Currency symbol (e.g., "kr")
   */
  getCurrencySymbol() {
    return this.getSettings().symbol;
  },

  /**
   * Initialize currency selector and event handling
   */
  initCurrencySelector() {
    const selector = document.getElementById("currencySelect");
    if (!selector) return;

    // Set current value
    selector.value = this.getCurrency();

    // Handle changes
    selector.addEventListener("change", (e) => {
      this.setCurrency(e.target.value);
    });
  },

  /**
   * Parse Norwegian date string (dd.MM.yyyy) to Date object
   * @param {string} dateStr - Date string in dd.MM.yyyy format
   * @returns {Date|null} Parsed date or null if invalid
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    const parts = dateStr.split(".");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    if (isNaN(d.getTime())) return null;

    return d;
  },

  /**
   * Format ISO date string to input date value (yyyy-MM-dd)
   * Required for HTML date inputs
   * @param {Date|string} date - The date
   * @returns {string} Date in yyyy-MM-dd format
   */
  toInputDateValue(date) {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  },
};

// Make available globally
window.LocaleUtils = LocaleUtils;
