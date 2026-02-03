/**
 * Dashboard Manager
 * Updates dashboard UI with data
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const Dashboard = {
  /**
   * Update all dashboard elements with data
   */
  update(data) {
    if (!data) {
      console.warn("No data to update dashboard");
      return;
    }

    this.updateUsers(data.users);
    this.updateLicenses(data.licenses);
    this.updateSecurity(data.security);

    // Initialize charts
    Charts.init(data);
  },

  /**
   * Update users section
   */
  updateUsers(users) {
    if (!users) return;

    this.setElementText("membersCount", this.formatNumber(users.members));
    this.setElementText("guestsCount", this.formatNumber(users.guests));
    this.setElementText("totalUsersCount", this.formatNumber(users.total));
    this.setElementText("activeUsersCount", this.formatNumber(users.active));
    this.setElementText(
      "inactiveUsersCount",
      this.formatNumber(users.inactive)
    );
    this.setElementText(
      "disabledUsersCount",
      this.formatNumber(users.disabled)
    );

    // Calculate inactive percentage
    const inactivePercent =
      users.total > 0
        ? Math.round(((users.inactive + users.disabled) / users.total) * 100)
        : 0;
    this.setElementText("inactivePercentBadge", `${inactivePercent}%`);
  },

  /**
   * Update licenses section
   */
  updateLicenses(licenses) {
    if (!licenses) return;

    this.setElementText("licenseCost", this.formatCurrency(licenses.totalCost));
    this.setElementText(
      "potentialSavings",
      this.formatCurrency(licenses.potentialSavings)
    );
    this.setElementText(
      "unassignedLicenses",
      this.formatNumber(licenses.unassigned)
    );
    this.setElementText(
      "inactiveLicenses",
      this.formatNumber(licenses.inactive)
    );
    this.setElementText(
      "disabledLicenses",
      this.formatNumber(licenses.disabled)
    );

    // Calculate savings percentage
    const savingsPercent =
      licenses.totalCost > 0
        ? Math.round((licenses.potentialSavings / licenses.totalCost) * 100)
        : 0;
    this.setElementText("savingsPercentBadge", `${savingsPercent}%`);
  },

  /**
   * Update security section
   */
  updateSecurity(security) {
    if (!security) return;

    this.setElementText(
      "mfaRegistered",
      this.formatNumber(security.mfaRegistered)
    );
    this.setElementText("missingMfa", this.formatNumber(security.mfaMissing));
    this.setElementText(
      "globalAdmins",
      this.formatNumber(security.globalAdmins)
    );
    this.setElementText(
      "privilegedRoles",
      this.formatNumber(security.privilegedRoles)
    );
  },

  /**
   * Helper to set element text content
   */
  setElementText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  },

  /**
   * Format number with thousands separator
   */
  formatNumber(num) {
    if (num === null || num === undefined) return "--";
    return num.toLocaleString();
  },

  /**
   * Format currency
   */
  formatCurrency(amount) {
    // Use LocaleUtils for consistent formatting across the app
    if (typeof LocaleUtils !== "undefined") {
      return LocaleUtils.formatCurrency(amount);
    }
    // Fallback - use dynamic symbol
    if (amount === null || amount === undefined) {
      const symbol =
        Config?.ui?.currency === "USD"
          ? "$"
          : Config?.ui?.currency === "EUR"
          ? "€"
          : Config?.ui?.currency === "GBP"
          ? "£"
          : "kr";
      return `${symbol} --`;
    }
    const currency = Config?.ui?.currency || "NOK";
    const locale =
      currency === "NOK" || currency === "SEK"
        ? "nb-NO"
        : currency === "EUR"
        ? "de-DE"
        : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },
};
