/**
 * Sign-in Map Manager
 * Displays geographic distribution of sign-ins using Leaflet
 */

const SignInMap = {
  map: null,
  markers: [],
  markerLayer: null,

  /**
   * Initialize the map
   */
  init() {
    const container = document.getElementById("signInMap");
    if (!container || this.map) return;

    // Initialize Leaflet map
    this.map = L.map("signInMap", {
      center: [54.5, 15.0], // Center on Europe
      zoom: 3,
      minZoom: 2,
      maxZoom: 12,
      scrollWheelZoom: true,
    });

    // Add tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(this.map);

    // Create marker layer group
    this.markerLayer = L.layerGroup().addTo(this.map);

    console.log("🗺️ Sign-in map initialized");
  },

  /**
   * Update map with sign-in location data
   */
  update(signInData) {
    if (!signInData || !signInData.locations) return;

    // Clear existing markers
    this.clearMarkers();

    const locations = signInData.locations;
    const bounds = [];

    locations.forEach((loc) => {
      if (loc.lat && loc.lon && (loc.lat !== 0 || loc.lon !== 0)) {
        const marker = this.createMarker(loc);
        if (marker) {
          marker.addTo(this.markerLayer);
          bounds.push([loc.lat, loc.lon]);
        }
      }
    });

    // Fit map to markers if we have any
    if (bounds.length > 0 && this.map) {
      try {
        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
      } catch (e) {
        console.warn("Could not fit bounds:", e);
      }
    }

    // Update stats
    this.updateStats(signInData);

    // Update location list
    this.updateLocationList(locations);
  },

  /**
   * Create a marker for a location
   */
  createMarker(location) {
    const total = location.successCount + location.failedCount;
    const failedRatio = location.failedCount / total;

    // Determine color based on failed ratio
    let color = "#10b981"; // Green - mostly successful
    if (failedRatio > 0.5) {
      color = "#ef4444"; // Red - mostly failed
    } else if (failedRatio > 0.2) {
      color = "#f59e0b"; // Orange - some failures
    }

    // Size based on total sign-ins (min 8, max 40)
    const radius = Math.min(40, Math.max(8, Math.log(total + 1) * 6));

    const marker = L.circleMarker([location.lat, location.lon], {
      radius: radius,
      fillColor: color,
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.7,
    });

    // Create popup content
    const popupContent = `
            <div class="signin-popup">
                <h4>${this.getCountryFlag(location.country)} ${
      location.country
    }</h4>
                <p><strong>City:</strong> ${location.city}</p>
                <p class="success-count">✓ Successful: ${location.successCount.toLocaleString(
                  "nb-NO"
                )}</p>
                <p class="failed-count">✕ Failed: ${location.failedCount.toLocaleString(
                  "nb-NO"
                )}</p>
            </div>
        `;

    marker.bindPopup(popupContent);

    // Add hover effect
    marker.on("mouseover", function () {
      this.openPopup();
      this.setStyle({ fillOpacity: 1, weight: 3 });
    });

    marker.on("mouseout", function () {
      this.closePopup();
      this.setStyle({ fillOpacity: 0.7, weight: 2 });
    });

    this.markers.push(marker);
    return marker;
  },

  /**
   * Clear all markers from the map
   */
  clearMarkers() {
    if (this.markerLayer) {
      this.markerLayer.clearLayers();
    }
    this.markers = [];
  },

  /**
   * Update sign-in statistics display
   */
  updateStats(signInData) {
    const elements = {
      totalSignIns: signInData.totalSignIns,
      uniqueCountries: signInData.uniqueCountries,
      failedSignIns: signInData.failedSignIns,
      riskySignIns: signInData.riskySignIns,
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = value?.toLocaleString() || "--";
      }
    });
  },

  /**
   * Update the location list
   */
  updateLocationList(locations) {
    const container = document.getElementById("topLocations");
    if (!container) return;

    // Take top 10 locations
    const topLocations = locations.slice(0, 10);

    if (topLocations.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <p>No sign-in data available</p>
                </div>
            `;
      return;
    }

    const html = topLocations
      .map((loc) => {
        const total = loc.successCount + loc.failedCount;
        return `
                <div class="location-item" data-lat="${loc.lat}" data-lon="${
          loc.lon
        }">
                    <div class="location-info">
                        <span class="location-flag">${this.getCountryFlag(
                          loc.country
                        )}</span>
                        <div class="location-details">
                            <span class="location-name">${loc.country}</span>
                            <span class="location-city">${loc.city}</span>
                        </div>
                    </div>
                    <span class="location-count">${total.toLocaleString(
                      "nb-NO"
                    )}</span>
                </div>
            `;
      })
      .join("");

    container.innerHTML = html;

    // Add click handlers to zoom to location
    container.querySelectorAll(".location-item").forEach((item) => {
      item.addEventListener("click", () => {
        const lat = parseFloat(item.dataset.lat);
        const lon = parseFloat(item.dataset.lon);
        if (lat && lon && this.map) {
          this.map.setView([lat, lon], 8);
        }
      });
    });
  },

  /**
   * Get country flag emoji from country name
   */
  getCountryFlag(countryName) {
    const countryFlags = {
      Norway: "🇳🇴",
      Sweden: "🇸🇪",
      Denmark: "🇩🇰",
      Finland: "🇫🇮",
      "United States": "🇺🇸",
      "United Kingdom": "🇬🇧",
      Germany: "🇩🇪",
      France: "🇫🇷",
      Netherlands: "🇳🇱",
      Belgium: "🇧🇪",
      Spain: "🇪🇸",
      Italy: "🇮🇹",
      Poland: "🇵🇱",
      Ireland: "🇮🇪",
      Switzerland: "🇨🇭",
      Austria: "🇦🇹",
      Canada: "🇨🇦",
      Australia: "🇦🇺",
      Japan: "🇯🇵",
      China: "🇨🇳",
      India: "🇮🇳",
      Brazil: "🇧🇷",
      Russia: "🇷🇺",
      "South Africa": "🇿🇦",
      Mexico: "🇲🇽",
      Singapore: "🇸🇬",
      "Hong Kong": "🇭🇰",
      "South Korea": "🇰🇷",
      Portugal: "🇵🇹",
      "Czech Republic": "🇨🇿",
      Romania: "🇷🇴",
      Hungary: "🇭🇺",
      Greece: "🇬🇷",
      Turkey: "🇹🇷",
      Israel: "🇮🇱",
      "United Arab Emirates": "🇦🇪",
    };

    return countryFlags[countryName] || "🌍";
  },

  /**
   * Resize map (call when container size changes)
   */
  resize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  },

  /**
   * Destroy the map
   */
  destroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
    this.markerLayer = null;
  },
};
