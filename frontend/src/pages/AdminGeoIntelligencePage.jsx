import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { MetricCard } from "../components/MetricCard";
import { useAuth } from "../state/AuthContext";

const REGION_OPTIONS = ["", "Central", "Eastern", "Northern", "Western"];

function formatCurrency(value) {
  return `UGX ${Number(value || 0).toLocaleString()}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function layerColorForHeat(color) {
  if (color === "RED") {
    return "#d14343";
  }
  if (color === "YELLOW") {
    return "#e0ad2f";
  }
  return "#2f8f5b";
}

function layerColorForRisk(color) {
  if (color === "RED") {
    return "#bb1f1f";
  }
  if (color === "ORANGE") {
    return "#d07a16";
  }
  return "#278a5a";
}

function getAgentMarkerHtml(agent) {
  const color = agent.markerColor === "RED" ? "#c13f3f" : agent.markerColor === "YELLOW" ? "#d9a431" : "#2d8f5d";
  return `
    <div class="geoAgentMarker" style="width:${agent.markerSize}px;height:${agent.markerSize}px;background:${color}">
      <span></span>
    </div>
  `;
}

export function AdminGeoIntelligencePage() {
  const { token } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const regionLayerRef = useRef(null);
  const districtLayerRef = useRef(null);
  const riskLayerRef = useRef(null);
  const agentLayerRef = useRef(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [agentsData, setAgentsData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    region: "",
    district: "",
    status: ""
  });
  const [layerVisibility, setLayerVisibility] = useState({
    loans: true,
    agents: true,
    risk: true
  });

  const districts = useMemo(
    () => Array.from(new Set((heatmapData?.districts || []).map((entry) => entry.district))).sort((a, b) => a.localeCompare(b)),
    [heatmapData]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      center: [1.37, 32.29],
      zoom: 7,
      zoomControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      try {
        const [heatmap, agents, risk] = await Promise.all([
          api.getGeoHeatmapData(token, filters),
          api.getGeoAgents(token, filters),
          api.getGeoRisk(token, filters)
        ]);

        if (!cancelled) {
          setHeatmapData(heatmap);
          setAgentsData(agents);
          setRiskData(risk);
          setError("");
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Failed to load geo intelligence data");
        }
      }
    }

    load();
    const intervalId = window.setInterval(load, 45000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [filters, token]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const baseUrl = (import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || "http://localhost:4001/api").replace(/\/api$/, "");
    const socket = new WebSocket(`${baseUrl.replace(/^http/, "ws")}/ws/geo-intelligence?token=${encodeURIComponent(token)}`);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "geo-batch-update") {
          Promise.all([
            api.getGeoHeatmapData(token, filters),
            api.getGeoAgents(token, filters),
            api.getGeoRisk(token, filters)
          ]).then(([heatmap, agents, risk]) => {
            setHeatmapData(heatmap);
            setAgentsData(agents);
            setRiskData(risk);
          }).catch(() => {});
        }
      } catch (_error) {
        // Ignore malformed socket payloads.
      }
    };

    return () => socket.close();
  }, [filters, token]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !heatmapData) {
      return;
    }

    if (regionLayerRef.current) {
      map.removeLayer(regionLayerRef.current);
    }
    if (districtLayerRef.current) {
      map.removeLayer(districtLayerRef.current);
    }

    const heatByDistrict = new Map((heatmapData.districts || []).map((entry) => [entry.district, entry]));

    regionLayerRef.current = L.geoJSON(heatmapData.boundaries.regions, {
      style: {
        color: "#22303a",
        weight: 2,
        fillColor: "#cfd7db",
        fillOpacity: 0.12
      }
    }).addTo(map);

    districtLayerRef.current = L.geoJSON(heatmapData.boundaries.districts, {
      style: (feature) => {
        const detail = heatByDistrict.get(feature.properties.district);
        return {
          color: "#28404a",
          weight: 1,
          fillColor: detail ? layerColorForHeat(detail.heatColor) : "#dbe3e6",
          fillOpacity: layerVisibility.loans ? 0.55 : 0.1
        };
      },
      onEachFeature: (feature, layer) => {
        const detail = heatByDistrict.get(feature.properties.district);
        layer.on("click", () => {
          setSelectedItem({
            type: "district",
            ...detail,
            district: feature.properties.district,
            region: feature.properties.region
          });
        });

        if (detail) {
          layer.bindTooltip(
            `<strong>${detail.district}</strong><br/>Capital: ${formatCurrency(detail.totalCapitalDeployed)}<br/>Repayment: ${formatPercent(detail.repaymentRate)}<br/>Default: ${formatPercent(detail.defaultRate)}<br/>Net yield proxy: ${formatPercent(detail.totalCapitalDeployed ? (detail.totalRepaid / detail.totalCapitalDeployed) * 100 : 0)}`,
            { sticky: true }
          );
        }
      }
    }).addTo(map);
  }, [heatmapData, layerVisibility.loans]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    if (riskLayerRef.current) {
      map.removeLayer(riskLayerRef.current);
      riskLayerRef.current = null;
    }

    if (!riskData?.districts?.length || !layerVisibility.risk) {
      return;
    }

    const riskByDistrict = new Map(riskData.districts.map((entry) => [entry.district, entry]));
    riskLayerRef.current = L.geoJSON(heatmapData?.boundaries?.districts, {
      style: (feature) => {
        const detail = riskByDistrict.get(feature.properties.district);
        return {
          color: detail ? layerColorForRisk(detail.riskColor) : "#78909c",
          weight: detail?.riskLevel === "HIGH" ? 3 : 2,
          dashArray: detail?.riskLevel === "HIGH" ? "6 4" : null,
          fillOpacity: 0
        };
      },
      onEachFeature: (feature, layer) => {
        const detail = riskByDistrict.get(feature.properties.district);
        if (detail?.warning) {
          layer.bindTooltip(`<strong>High Risk Zone</strong><br/>${detail.warning}`, { sticky: true });
        }
      }
    }).addTo(map);
  }, [heatmapData, layerVisibility.risk, riskData]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    if (agentLayerRef.current) {
      map.removeLayer(agentLayerRef.current);
      agentLayerRef.current = null;
    }

    if (!agentsData?.agents?.length || !layerVisibility.agents) {
      return;
    }

    agentLayerRef.current = L.layerGroup(
      agentsData.agents.map((agent) =>
        L.marker([agent.coordinates.lat, agent.coordinates.lng], {
          icon: L.divIcon({
            className: "geoAgentMarkerWrap",
            html: getAgentMarkerHtml(agent),
            iconSize: [agent.markerSize, agent.markerSize]
          })
        })
          .bindTooltip(
            `<strong>${agent.agentName}</strong><br/>Performance: ${agent.performanceScore}<br/>Loans handled: ${agent.totalLoansHandled}<br/>Default rate: ${formatPercent(agent.defaultRate)}`,
            { sticky: true }
          )
          .on("click", () => {
            setSelectedItem({
              type: "agent",
              ...agent
            });
          })
      )
    ).addTo(map);
  }, [agentsData, layerVisibility.agents]);

  const topBar = heatmapData?.topBar;

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Geo Intelligence</p>
          <h2>Live Uganda loan intelligence heatmap</h2>
          <p className="headerMeta">A national operational view of loan concentration, field performance, and regional portfolio stress.</p>
        </div>
      </section>

      {error ? <p>{error}</p> : null}

      <section className="metricsGrid investorKpiBar">
        <MetricCard label="Total Loans Today" value={String(topBar?.totalLoansToday ?? 0)} hint="New loans recorded today" />
        <MetricCard label="Active Agents" value={String(topBar?.totalActiveAgents ?? 0)} hint="Agents currently in the field" />
        <MetricCard label="System Default Rate" value={formatPercent(topBar?.systemWideDefaultRate ?? 0)} hint="Across completed and defaulted book" />
        <MetricCard label="Portfolio Size" value={formatCurrency(topBar?.totalPortfolioSize ?? 0)} hint="Disbursed capital represented on the map" />
      </section>

      <section className="geoDashboardShell">
        <aside className="card geoSidebar">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Controls</p>
              <h3>Filters and layers</h3>
            </div>
          </div>

          <label className="fieldLabel">
            Region
            <select
              value={filters.region}
              onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value, district: "" }))}
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option || "all-regions"} value={option}>
                  {option || "All regions"}
                </option>
              ))}
            </select>
          </label>

          <label className="fieldLabel">
            District
            <select
              value={filters.district}
              onChange={(event) => setFilters((current) => ({ ...current, district: event.target.value }))}
            >
              <option value="">All districts</option>
              {districts.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </label>

          <label className="fieldLabel">
            Loan status
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="DEFAULTED">Defaulted</option>
            </select>
          </label>

          <div className="stack compact">
            <label className="geoToggle">
              <input
                type="checkbox"
                checked={layerVisibility.loans}
                onChange={() => setLayerVisibility((current) => ({ ...current, loans: !current.loans }))}
              />
              Loans heatmap
            </label>
            <label className="geoToggle">
              <input
                type="checkbox"
                checked={layerVisibility.agents}
                onChange={() => setLayerVisibility((current) => ({ ...current, agents: !current.agents }))}
              />
              Agents overlay
            </label>
            <label className="geoToggle">
              <input
                type="checkbox"
                checked={layerVisibility.risk}
                onChange={() => setLayerVisibility((current) => ({ ...current, risk: !current.risk }))}
              />
              Risk zones
            </label>
          </div>

          <div className="geoLegend">
            <strong>Heat intensity</strong>
            <div className="legendRow"><span className="legendSwatch legendSwatch-green" />Low density</div>
            <div className="legendRow"><span className="legendSwatch legendSwatch-yellow" />Medium density</div>
            <div className="legendRow"><span className="legendSwatch legendSwatch-red" />High density</div>
          </div>
        </aside>

        <section className="card geoMapCard">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Live Map</p>
              <h3>Uganda portfolio heatmap</h3>
            </div>
            <span className="liveBadge">Refreshes every 45s</span>
          </div>
          <div ref={mapRef} className="geoMapCanvas" />
        </section>

        <aside className="card geoSidebar">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Details</p>
              <h3>Selection panel</h3>
            </div>
          </div>
          {!selectedItem ? (
            <p>Select a district or agent on the map to inspect live performance detail.</p>
          ) : selectedItem.type === "district" ? (
            <div className="stack compact">
              <strong>{selectedItem.district}</strong>
              <p>{selectedItem.region}</p>
              <div className="miniMetric"><span>Total loans</span><strong>{selectedItem.totalLoans}</strong></div>
              <div className="miniMetric"><span>Total value</span><strong>{formatCurrency(selectedItem.totalValue)}</strong></div>
              <div className="miniMetric"><span>Default rate</span><strong>{formatPercent(selectedItem.defaultRate)}</strong></div>
              <div className="miniMetric"><span>Top agent</span><strong>{selectedItem.topAgent}</strong></div>
            </div>
          ) : (
            <div className="stack compact">
              <strong>{selectedItem.agentName}</strong>
              <p>{selectedItem.region} • {selectedItem.district}</p>
              <div className="miniMetric"><span>Performance score</span><strong>{selectedItem.performanceScore}</strong></div>
              <div className="miniMetric"><span>Active loans</span><strong>{selectedItem.activeLoans}</strong></div>
              <div className="miniMetric"><span>Overdue loans</span><strong>{selectedItem.overdueLoans}</strong></div>
              <div className="miniMetric"><span>Total handled</span><strong>{selectedItem.totalLoansHandled}</strong></div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
