/**
 * Charts Manager
 * Creates and manages Chart.js visualizations
 *
 * @author Uy Le Thai Phan
 * @company Atea
 * @version 1.0.0
 */

const Charts = {
  instances: {},

  /**
   * Initialize all charts with data
   */
  init(data) {
    if (!data) return;

    // Destroy existing charts
    this.destroyAll();

    // Create charts
    this.createUserStatusChart(data.users);
    this.createLicenseSavingsChart(data.licenses);
    this.createMfaStatusChart(data.security);
    this.createAdminRolesChart(data.security);
  },

  /**
   * Destroy all chart instances
   */
  destroyAll() {
    Object.values(this.instances).forEach((chart) => {
      if (chart) chart.destroy();
    });
    this.instances = {};
  },

  /**
   * Create user status doughnut chart
   */
  createUserStatusChart(users) {
    const canvas = document.getElementById("userStatusChart");
    if (!canvas || !users) return;

    const ctx = canvas.getContext("2d");

    this.instances.userStatus = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Active", "Inactive", "Disabled"],
        datasets: [
          {
            data: [users.active, users.inactive, users.disabled],
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)", // Green - Active
              "rgba(245, 158, 11, 0.8)", // Orange - Inactive
              "rgba(239, 68, 68, 0.8)", // Red - Disabled
            ],
            borderColor: [
              "rgba(34, 197, 94, 1)",
              "rgba(245, 158, 11, 1)",
              "rgba(239, 68, 68, 1)",
            ],
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
                family: "'Inter', sans-serif",
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((context.raw / total) * 100);
                return `${context.label}: ${context.raw.toLocaleString(
                  "nb-NO"
                )} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  },

  /**
   * Create license savings doughnut chart
   */
  createLicenseSavingsChart(licenses) {
    const canvas = document.getElementById("licenseSavingsChart");
    if (!canvas || !licenses) return;

    const ctx = canvas.getContext("2d");
    const utilized = licenses.totalCost - licenses.potentialSavings;

    this.instances.licenseSavings = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Utilized", "Unassigned", "Inactive Users", "Disabled Users"],
        datasets: [
          {
            data: [
              utilized,
              licenses.unassigned * 30, // Approximate cost per license
              licenses.inactive * 35,
              licenses.disabled * 40,
            ],
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)", // Green - Utilized
              "rgba(100, 116, 139, 0.8)", // Gray - Unassigned
              "rgba(245, 158, 11, 0.8)", // Orange - Inactive
              "rgba(239, 68, 68, 0.8)", // Red - Disabled
            ],
            borderColor: [
              "rgba(34, 197, 94, 1)",
              "rgba(100, 116, 139, 1)",
              "rgba(245, 158, 11, 1)",
              "rgba(239, 68, 68, 1)",
            ],
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
                family: "'Inter', sans-serif",
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const currency = Config?.ui?.currency || "NOK";
                const formatted = new Intl.NumberFormat("nb-NO", {
                  style: "currency",
                  currency: currency,
                  minimumFractionDigits: 0,
                }).format(context.raw);
                return `${context.label}: ${formatted}/month`;
              },
            },
          },
        },
      },
    });
  },

  /**
   * Create MFA status pie chart
   */
  createMfaStatusChart(security) {
    const canvas = document.getElementById("mfaStatusChart");
    if (!canvas || !security) return;

    const ctx = canvas.getContext("2d");

    this.instances.mfaStatus = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["MFA Registered", "Missing MFA"],
        datasets: [
          {
            data: [security.mfaRegistered, security.mfaMissing],
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)", // Green
              "rgba(239, 68, 68, 0.8)", // Red
            ],
            borderColor: ["rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)"],
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
                family: "'Inter', sans-serif",
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((context.raw / total) * 100);
                return `${context.label}: ${context.raw.toLocaleString(
                  "nb-NO"
                )} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  },

  /**
   * Create admin roles horizontal bar chart
   */
  createAdminRolesChart(security) {
    const canvas = document.getElementById("adminRolesChart");
    if (!canvas || !security || !security.adminRoles) return;

    const ctx = canvas.getContext("2d");

    const roles = security.adminRoles;
    const labels = roles.map((r) => r.name);
    const data = roles.map((r) => r.count);

    this.instances.adminRoles = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Users",
            data: data,
            backgroundColor: "rgba(37, 99, 235, 0.8)",
            borderColor: "rgba(37, 99, 235, 1)",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              display: false,
            },
            ticks: {
              stepSize: 1,
              font: {
                size: 11,
                family: "'Inter', sans-serif",
              },
            },
          },
          y: {
            grid: {
              display: false,
            },
            ticks: {
              font: {
                size: 11,
                family: "'Inter', sans-serif",
              },
            },
          },
        },
      },
    });
  },
};
