import React, { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as satellite from "satellite.js";

// --- API KEYS ---
const NASA_API_KEY = "4a9BWOSMMTuKkxF3yJdtnaVKgjKcqUXPYIJhTSoy";
const N2YO_API_KEY = "7W972R-NWYXJV-8RV8HP-5HNQ";
const CORS_PROXY = "https://c145ad64-2e3d-450a-9dcb-2b585b373580-00-zbpwzrcss4r5.riker.replit.dev/proxy?url=";

// --- ErrorBoundary ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <p>Something went wrong in this panel.</p>;
    }
    return this.props.children;
  }
}

function proxyFetch(url, ...args) {
  // Try direct first, then fallback to proxy
  return fetch(url, ...args)
    .then(res => {
      if (!res.ok || res.status === 403 || res.status === 429) throw new Error("Direct fetch blocked or error");
      return res;
    })
    .catch(() => {
      if (url.startsWith(CORS_PROXY)) throw new Error("Proxy also failed");
      return fetch(CORS_PROXY + encodeURIComponent(url), ...args);
    });
}
function SpaceEventsPanel({ isDark }) {
  const [asteroids, setAsteroids] = useState([]);
  const [kpIndex, setKpIndex] = useState([]);
  const [solarFlares, setSolarFlares] = useState([]);
  const [aurora, setAurora] = useState(null);
  const [meteors, setMeteors] = useState([]);
  const [astroEvents, setAstroEvents] = useState([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    // NASA NEO
    fetch(
      `https://api.cors.lol/?url=https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`
    )
      .then((r) => r.json())
      .then((data) => setAsteroids(data?.near_earth_objects?.[today] || []))
      .catch(() => setAsteroids([]));
    // Kp Index
    fetch(
      "https://api.cors.lol/?url=https://services.swpc.noaa.gov/json/planetary_k_index_3_day.json"
    )
      .then((r) => r.json())
      .then(setKpIndex)
      .catch(() => setKpIndex([]));
    // Solar Flares
    fetch(
      "https://api.cors.lol/?url=https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json"
    )
      .then((r) => r.json())
      .then(setSolarFlares)
      .catch(() => setSolarFlares([]));
    // Aurora
    fetch(
      "https://api.cors.lol/?url=https://services.swpc.noaa.gov/json/ovation_aurora_latest.json"
    )
      .then((r) => r.json())
      .then(setAurora)
      .catch(() => setAurora(null));
    // Meteors (hardcoded fallback is safe)
    setMeteors([{ name: "Eta Aquariids", date: "May 5-6", peak: "2024-05-06" }]);
    // Astro events
    fetch(
      "https://api.cors.lol/?url=https://in-the-sky.org/newscal.php?year=2024&month=5&maxdiff=31&feed=ical"
    )
      .then((r) => r.text())
      .then((txt) => {
        const events = [];
        const lines = txt.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("SUMMARY:")) {
            events.push({
              summary: lines[i].replace("SUMMARY:", ""),
              date:
                lines[i - 2]?.replace("DTSTART;VALUE=DATE:", "") || "Unknown",
            });
          }
        }
        setAstroEvents(events);
      })
      .catch(() => setAstroEvents([]));
  }, []);

  // Card style for Apple HIG polish
  const cardStyle = {
    borderRadius: 16,
    background: isDark ? "#23253a" : "#fff",
    boxShadow: isDark
      ? "0 2px 16px #14141650"
      : "0 2px 16px #cad1e533",
    padding: "1.5rem 1.5rem",
    marginBottom: "2rem",
    marginTop: 0,
    border: isDark ? "1px solid #242743" : "1px solid #e7eaf2",
    transition: "box-shadow 0.2s"
  };

  const sectionTitleStyle = {
    fontSize: 17,
    fontWeight: 700,
    color: isDark ? "#dbe3f8" : "#2a2a36",
    marginBottom: 6,
    letterSpacing: 0.1,
    display: "flex",
    alignItems: "center",
    gap: 6
  };

  const dividerStyle = {
    border: "none",
    borderTop: isDark ? "1px solid #363a56" : "1px solid #e7eaf2",
    margin: "1.5rem 0"
  };

  return (
    <section style={{ padding: 0, maxWidth: 820, margin: "0 auto" }}>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          marginBottom: 20,
          letterSpacing: -0.5,
          color: isDark ? "#f9faff" : "#2a2a36",
          textShadow: isDark ? "0 2px 14px #23253a99" : undefined,
          textAlign: "center"
        }}
      >
        ✨ Live Space & Cosmic Events
      </div>
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>🪐 Near-Earth Asteroids Today <span style={{fontWeight:400, fontSize:13, color:"#aa9"}}>(NASA)</span></div>
        {asteroids.length ? (
          <ul style={{ margin: "0.6em 0 0 0.7em", padding: 0, fontSize: 15, lineHeight: 1.7 }}>
            {asteroids.slice(0, 5).map((a) => (
              <li key={a.id} style={{ marginBottom: 6 }}>
                <b style={{ fontWeight: 600 }}>{a.name}</b>
                {" – Closest: "}
                <span style={{ color: "#2a6" }}>
                  {(a.close_approach_data?.[0]?.miss_distance.kilometers | 0).toLocaleString()} km
                </span>
                <span style={{ color: "#b4b7c7", fontSize: 13, marginLeft: 12 }}>
                  <a href={a.nasa_jpl_url} target="_blank" rel="noopener noreferrer" style={{ color: "#8aa", textDecoration: "underline" }}>
                    NASA JPL
                  </a>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: "#a1a1b3" }}>No close approaches listed today.</span>
        )}
      </div>
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>🌐 Kp Index <span style={{fontWeight:400, fontSize:13, color:"#aa9"}}>(Geomagnetic Storm, NOAA)</span></div>
        {kpIndex.length ? (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 15 }}>
            {kpIndex.slice(-8).map((k, i) => (
              <span
                key={i}
                style={{
                  color: k.kp_index >= 5 ? "#e44" : "#197",
                  fontWeight: 700,
                  background: k.kp_index >= 5 ? "#ffebee" : "#e6f7f1",
                  borderRadius: 7,
                  padding: "0.2em 0.7em",
                  fontSize: 15,
                  boxShadow: isDark ? "0 1px 5px #23253a33" : "0 1px 5px #cad1e533"
                }}
              >
                Kp {k.kp_index} <span style={{ fontWeight: 400, color: "#888", marginLeft: 4 }}>({k.time_tag.slice(11, 16)})</span>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: "#a1a1b3" }}>Not available.</span>
        )}
      </div>
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>☀️ Solar Flares <span style={{fontWeight:400, fontSize:13, color:"#aa9"}}>(GOES X-ray, 6h)</span></div>
        {solarFlares.length ? (
          <div style={{ fontSize: 14, whiteSpace: "nowrap", overflowX: "auto", maxWidth: "100%" }}>
            {solarFlares.slice(-12).map((f, i) => (
              <span key={i} style={{ marginRight: 18 }}>
                <span style={{ color: "#888" }}>{f.time_tag?.slice(11, 19)}Z:</span>{" "}
                <b style={{ color: "#fa0", fontFamily: "SFMono-Regular,monospace" }}>
                  {(+f.flux).toExponential(2)}
                </b>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: "#a1a1b3" }}>Not available.</span>
        )}
      </div>
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>🌌 Aurora Activity <span style={{fontWeight:400, fontSize:13, color:"#aa9"}}>(Ovation, NOAA)</span></div>
        {aurora ? (
          <div>
            <span>
              Power North:{" "}
              <b style={{ color: "#4ed" }}>{aurora.Power_N.toFixed(1)} GW</b>, Power South:{" "}
              <b style={{ color: "#4ed" }}>{aurora.Power_S.toFixed(1)} GW</b>
            </span>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <img
                src="https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.png"
                width={340}
                alt="Aurora forecast"
                style={{ borderRadius: 10, boxShadow: "0 2px 10px #0002" }}
              />
            </div>
          </div>
        ) : (
          <span style={{ color: "#a1a1b3" }}>Not available.</span>
        )}
      </div>
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>☄️ Meteor Showers <span style={{fontWeight:400, fontSize:13, color:"#aa9"}}>(IMO)</span></div>
        {meteors.length ? (
          <ul style={{ margin: 0, padding: 0, fontSize: 15 }}>
            {meteors.map((m, i) => (
              <li key={i}>
                <b>{m.name}</b> — Peak: <span style={{ color: "#2a6" }}>{m.peak}</span>{" "}
                <span style={{ color: "#888", fontSize: 13 }}>({m.date})</span>
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: "#a1a1b3" }}>No upcoming major showers listed.</span>
        )}
      </div>
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>📅 Astronomy Events <span style={{fontWeight:400, fontSize:13, color:"#aa9"}}>(In-The-Sky.org)</span></div>
        {astroEvents.length ? (
          <ul style={{ margin: 0, padding: 0, fontSize: 15 }}>
            {astroEvents.slice(0, 6).map((e, i) => (
              <li key={i}>
                <span style={{ color: "#888" }}>{e.date}:</span>{" "}
                <span style={{ fontWeight: 600 }}>{e.summary}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span style={{ color: "#a1a1b3" }}>No events found.</span>
        )}
      </div>
    </section>
  );
}

// Featured satellites
const FEATURED_SATELLITES = [
  { name: "International Space Station", noradId: 25544, type: "ISS", description: "Habitable artificial satellite in low Earth orbit.", icon: "🧭" },
  { name: "Hubble Space Telescope", noradId: 20580, type: "EarthObs", description: "NASA's famous deep space telescope.", icon: "🔭" },
  { name: "James Webb Telescope", noradId: 50463, type: "EarthObs", description: "Flagship infrared telescope at L2.", icon: "🛰️" },
  { name: "GOES-16", noradId: 41866, type: "Weather", description: "NOAA geostationary weather sat (East).", icon: "🌦️" },
  { name: "Aqua", noradId: 27424, type: "EarthObs", description: "Water-cycle observatory.", icon: "🌊" },
  { name: "NOAA-20", noradId: 43013, type: "Weather", description: "Polar-orbiting weather sat.", icon: "🛰️" }
];

// Satellite categories for sidebar & grouping/filtering
const SAT_CATEGORIES = [
  { label: "ISS", icon: "🧭", group: null },
  { label: "Starlink", icon: "🛰️", group: "starlink" },
  { label: "OneWeb", icon: "🛰️", group: "oneweb" },
  { label: "Iridium", icon: "📱", group: "iridium" },
  { label: "Iridium NEXT", icon: "📱", group: "iridium-NEXT" },
  // ... you can expand to include all your groups as in your original!
];

const ALL_FILTERS = [
  { label: "All", icon: "🌐" },
  { label: "ISS", icon: "🧭" }
];

function featuredToSatObj(feat) {
  // Hardcode TLE-derived values for featured sats if available; otherwise undefined.
  // Example values can be looked up for these NORAD IDs.
  // ISS: 25544, Hubble: 20580, JWST: 50463, GOES-16: 41866, Aqua: 27424, NOAA-20: 43013
  // For demo, fill in some plausible values:
  const TLE_LOOKUP = {
    "25544": { MEAN_MOTION: "15.49", INCLINATION: "51.64", ECCENTRICITY: "0.0006703" }, // ISS
    "20580": { MEAN_MOTION: "15.09", INCLINATION: "28.47", ECCENTRICITY: "0.0002855" }, // Hubble
    "50463": { MEAN_MOTION: "1.0027", INCLINATION: "28.06", ECCENTRICITY: "0.0003842" }, // JWST (approx)
    "41866": { MEAN_MOTION: "1.0027", INCLINATION: "0.04", ECCENTRICITY: "0.0001528" }, // GOES-16
    "27424": { MEAN_MOTION: "14.57", INCLINATION: "98.21", ECCENTRICITY: "0.0001273" }, // Aqua
    "43013": { MEAN_MOTION: "14.19", INCLINATION: "98.74", ECCENTRICITY: "0.0001461" }, // NOAA-20
  };
  const id = feat.noradId?.toString();
  const tleFields = TLE_LOOKUP[id] || {};
  return {
    OBJECT_NAME: feat.name,
    OBJECT_ID: id,
    EPOCH: "Live",
    type: feat.type,
    description: feat.description,
    icon: feat.icon,
    MEAN_MOTION: tleFields.MEAN_MOTION,
    INCLINATION: tleFields.INCLINATION,
    ECCENTRICITY: tleFields.ECCENTRICITY,
  };
}

function Recenter({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, zoom, { animate: true });
  }, [position, zoom, map]);
  return null;
}

function CollapsiblePanel({ title, open, onToggle, children }) {
  return (
    <div className="collapsible-panel">
      <div
        onClick={onToggle}
        style={{
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0.5em 0",
          userSelect: "none"
        }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform 0.2s",
            transform: open ? "rotate(90deg)" : "rotate(0)"
          }}
        >
          ▶
        </span>
        {title}
      </div>
      <div style={{ display: open ? "block" : "none" }}>{children}</div>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  // Dark mode
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" &&
      (document.body.classList.contains("p-dark-theme") ||
        document.body.classList.contains("p-dark-mode"))
  );
  useEffect(() => {
    function detectDark() {
      setIsDark(
        document.body.classList.contains("p-dark-theme") ||
        document.body.classList.contains("p-dark-mode")
      );
    }
    detectDark();
    const observer = new MutationObserver(detectDark);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  function toggleDarkMode() {
    if (
      document.body.classList.contains("p-dark-theme") ||
      document.body.classList.contains("p-dark-mode")
    ) {
      document.body.classList.remove("p-dark-theme");
      document.body.classList.remove("p-dark-mode");
      document.body.classList.add("p-light-mode");
      setIsDark(false);
    } else {
      document.body.classList.remove("p-light-mode");
      document.body.classList.add("p-dark-mode");
      setIsDark(true);
    }
  }

  // State
  const [filter, setFilter] = useState("All");
  const [catAccordion, setCatAccordion] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [satellites, setSatellites] = useState([]);
  const [selectedSat, setSelectedSat] = useState(null);
  const [satPosition, setSatPosition] = useState(null);
  const [satApiRaw, setSatApiRaw] = useState(null);
  const [satPositionSource, setSatPositionSource] = useState(null);
  const [tab, setTab] = useState(0);
  const [expandedGroup, setExpandedGroup] = useState({});
  const [fleetStatsOpen, setFleetStatsOpen] = useState(false);

  // Fetch all satellites (ALL groups, live)
  useEffect(() => {
    Promise.allSettled(
      SAT_CATEGORIES.filter((c) => c.group).map((c) =>
        proxyFetch(
          `https://celestrak.org/NORAD/elements/gp.php?GROUP=${c.group}&FORMAT=json`
        )
          .then((r) => r.json())
          .then((arr) => (Array.isArray(arr) ? arr.map((s) => ({ ...s, type: c.label })) : []))
          .catch(() => [])
      )
    ).then((results) => {
      const valid = results
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value);

      // For each satellite with TLE, calculate its position now
      const now = new Date();
      const withPositions = valid
        .map(sat => {
          if (sat.TLE_LINE1 && sat.TLE_LINE2) {
            try {
              console.log("Using TLE for", sat.OBJECT_NAME, sat.TLE_LINE1, sat.TLE_LINE2);
              const satrec = (() => {
                try {
                  return satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
                } catch (e) {
                  console.error("twoline2satrec failed:", sat.OBJECT_NAME, e);
                  throw e;
                }
              })();
              const gmst = satellite.gstime(now);
              const prop = satellite.propagate(satrec, now);
              if (prop.position) {
                const geo = satellite.eciToGeodetic(prop.position, gmst);
                const lat = satellite.degreesLat(geo.latitude);
                const lng = satellite.degreesLong(geo.longitude);
                const alt = geo.height * 6371;
                console.log(`Sat: ${sat.OBJECT_NAME}, lat: ${lat}, lng: ${lng}, alt: ${alt}`);
                if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                  return { ...sat, lat, lng, alt };
                }
              }
            } catch (e) {
              console.warn("Position error:", sat.OBJECT_NAME, e);
              return null;
            }
          }
          return null;
        })
        .filter(Boolean);
      console.log("Satellites with positions:", withPositions.length);

      const featured = FEATURED_SATELLITES.map(featuredToSatObj);
      const featuredIds = new Set(featured.map((s) => s.OBJECT_ID));
      const rest = withPositions.filter((s) => !featuredIds.has(s.OBJECT_ID));
      setSatellites([...featured, ...rest]);
    });
  }, []);

  // When selecting a sat, try N2YO, fallback to TLE, fallback to (0,0)
  useEffect(() => {
    if (!selectedSat) {
      setSatPosition(null);
      setSatApiRaw(null);
      setSatPositionSource(null);
      return;
    }
    let isMounted = true;
    let observerLat = 0, observerLng = 0, observerAlt = 0;

    function fetchFromN2YO() {
      const apiUrl = `${CORS_PROXY}https://api.n2yo.com/rest/v1/satellite/positions/${selectedSat.OBJECT_ID}/${observerLat}/${observerLng}/${observerAlt}/1?apiKey=${N2YO_API_KEY}`;
      fetch(apiUrl)
        .then(r => r.json())
        .then(data => {
          if (data && data.positions && data.positions[0] && isMounted) {
            setSatPosition({
              lat: data.positions[0].satlatitude,
              lng: data.positions[0].satlongitude,
              alt: data.positions[0].sataltitude,
              apiSource: "N2YO"
            });
            setSatApiRaw(data);
            setSatPositionSource("n2yo");
          } else {
            console.warn("N2YO response error or empty positions:", data);
            tleFallback();
          }
        })
        .catch((err) => {
          console.error("N2YO API fetch failed:", err);
          tleFallback();
        });
    }

    function tleFallback() {
      if (selectedSat.TLE_LINE1 && selectedSat.TLE_LINE2) {
        try {
          const now = new Date();
          let satrec;
          try {
            satrec = satellite.twoline2satrec(selectedSat.TLE_LINE1, selectedSat.TLE_LINE2);
          } catch (e) {
            console.error("twoline2satrec failed:", selectedSat.OBJECT_NAME, e);
            throw e;
          }
          const gmst = satellite.gstime(now);
          const prop = satellite.propagate(satrec, now);
          if (prop.position) {
            const geo = satellite.eciToGeodetic(prop.position, gmst);
            const lat = satellite.degreesLat(geo.latitude);
            const lng = satellite.degreesLong(geo.longitude);
            const alt = geo.height * 6371;
            console.warn("TLE fallback position", lat, lng, alt);
            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
              setSatPosition({ lat, lng, alt, apiSource: "tle" });
              setSatApiRaw(null);
              setSatPositionSource("tle");
              return;
            }
          }
        } catch {}
      }
      // If nothing works, set to [0,0], but only if not already set
      if (isMounted) {
        setSatPosition({ lat: 0, lng: 0, alt: null, apiSource: "none" });
        console.warn("Fallback to (0,0) for", selectedSat);
      }
      setSatApiRaw(null);
      setSatPositionSource("none");
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        observerLat = pos.coords.latitude;
        observerLng = pos.coords.longitude;
        observerAlt = pos.coords.altitude || 0;
        fetchFromN2YO();
      }, fetchFromN2YO, {timeout:1000});
    } else {
      fetchFromN2YO();
    }
    return () => { isMounted = false; }
  }, [selectedSat]);

  // Filtering: allow lat/lng of 0 (valid coordinates)
  function hasValidLatLng(s) {
    return (
      typeof s.lat === "number" &&
      typeof s.lng === "number" &&
      !isNaN(s.lat) &&
      !isNaN(s.lng) &&
      s.lat !== null &&
      s.lng !== null
    );
  }

  // --- Grouped satellites
  const groupedSats = useMemo(() => {
    let list = satellites;
    if (filter !== "All") {
      list =
        filter === "ISS"
          ? list.filter((s) => s.type === "ISS")
          : list.filter((s) => s.type?.toLowerCase() === filter.toLowerCase());
    }
    return list.reduce((acc, sat) => {
      const key = (sat.type || "UNKNOWN").toUpperCase();
      (acc[key] = acc[key] || []).push(sat);
      return acc;
    }, {});
  }, [satellites, filter]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // --- SIDEBAR ---
  function Sidebar() {
  const [debrisList, setDebrisList] = React.useState([]);

  React.useEffect(() => {
    fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=debris&FORMAT=json')
      .then(res => res.json())
      .then(data => setDebrisList(Array.isArray(data) ? data : []))
      .catch(() => setDebrisList([]));
  }, []);

  return (
    <aside
      className={`sidebar-frost p-shadow-1 p-card${sidebarOpen ? " open" : ""}`}
      style={{
        minWidth: 280,
        maxWidth: 320,
        width: isMobile ? 280 : undefined,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        position: isMobile ? "fixed" : "relative",
        zIndex: 1001,
        top: 0,
        left: sidebarOpen ? 0 : isMobile ? -320 : 0,

        // Apple glassy material - enhanced
        backdropFilter: "blur(40px) saturate(200%) brightness(1.1)",
        WebkitBackdropFilter: "blur(40px) saturate(200%) brightness(1.1)", // Safari support
        backgroundColor: isDark ? "rgba(28, 28, 30, 0.7)" : "rgba(255, 255, 255, 0.7)",
        borderRight: isDark ? "0.5px solid rgba(255,255,255,0.12)" : "0.5px solid rgba(0,0,0,0.08)",
        boxShadow: isMobile && sidebarOpen
          ? "0 0 100vw 100vw rgba(0,0,0,0.4)"
          : isDark 
            ? "0 10px 40px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)"
            : "0 10px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
        transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        borderRadius: isMobile ? 0 : "0 16px 16px 0",
        color: isDark ? "#f2f2f7" : "#1d1d1f",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
      }}
    >
      {isMobile && (
        <div style={{ 
          display: "flex", 
          justifyContent: "flex-end", 
          padding: "12px 16px 0",
          position: "sticky",
          top: 0,
          zIndex: 1002,
        }}>
          <button
            aria-label="Close sidebar"
            style={{
              background: isDark ? "rgba(120, 120, 128, 0.16)" : "rgba(120, 120, 128, 0.08)",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDark ? "#8e8e93" : "#6d6d70",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: 16,
            }}
            onClick={() => setSidebarOpen(false)}
            onMouseEnter={(e) => {
              e.target.style.background = isDark ? "rgba(120, 120, 128, 0.24)" : "rgba(120, 120, 128, 0.16)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = isDark ? "rgba(120, 120, 128, 0.16)" : "rgba(120, 120, 128, 0.08)";
            }}
          >
            ✕
          </button>
        </div>
      )}
      
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          paddingTop: isMobile ? "8px" : "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0 20px 16px",
            borderBottom: isDark ? "0.5px solid rgba(255,255,255,0.08)" : "0.5px solid rgba(0,0,0,0.06)",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.022em",
              color: isDark ? "#f2f2f7" : "#1d1d1f",
              lineHeight: 1.2,
            }}
          >
            Satellites
          </h2>
        </div>

        {/* Appearance toggle */}
        <div style={{ padding: "0 20px 20px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: 12,
              background: isDark ? "rgba(118, 118, 128, 0.12)" : "rgba(118, 118, 128, 0.06)",
              border: isDark ? "0.5px solid rgba(255,255,255,0.04)" : "0.5px solid rgba(0,0,0,0.04)",
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ color: isDark ? "#f2f2f7" : "#1d1d1f" }}>Appearance</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ 
                fontSize: 15, 
                fontWeight: 600,
                color: isDark ? "#f2f2f7" : "#1d1d1f" 
              }}>
                {isDark ? "Dark" : "Light"}
              </span>
              <div className="p-switch">
                <input
                  type="checkbox"
                  role="switch"
                  checked={isDark}
                  onChange={toggleDarkMode}
                />
                <span className="p-switch-slider" />
              </div>
            </div>
          </label>
        </div>

        {/* Space Environment Alerts */}
        <div style={{ padding: "0 20px", marginBottom: 24 }}>
          <h3 style={{
            margin: "0 0 12px 0",
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? "#8e8e93" : "#6d6d70",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Space Environment
          </h3>
          <div style={{
            padding: "12px 16px",
            background: isDark ? "rgba(255, 69, 58, 0.1)" : "rgba(255, 59, 48, 0.08)",
            border: isDark ? "0.5px solid rgba(255, 69, 58, 0.2)" : "0.5px solid rgba(255, 59, 48, 0.15)",
            borderRadius: 10,
            marginBottom: 8,
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              fontSize: 14,
              fontWeight: 600,
              color: isDark ? "#ff453a" : "#d70015",
              marginBottom: 4,
            }}>
              ⚠️ <span style={{ marginLeft: 8 }}>High Collision Risk</span>
            </div>
            <div style={{ 
              fontSize: 13, 
              color: isDark ? "#d1d1d6" : "#48484a",
              lineHeight: 1.4,
            }}>
              {debrisList.length
                ? `${debrisList.length.toLocaleString()}+ tracked objects in orbit. Debris concentration peaks at 800-1000km altitude.`
                : "Loading debris data..."}
            </div>
          </div>
          
          <div style={{
            padding: "12px 16px",
            background: isDark ? "rgba(255, 159, 10, 0.1)" : "rgba(255, 149, 0, 0.08)",
            border: isDark ? "0.5px solid rgba(255, 159, 10, 0.2)" : "0.5px solid rgba(255, 149, 0, 0.15)",
            borderRadius: 10,
            marginBottom: 8,
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              fontSize: 14,
              fontWeight: 600,
              color: isDark ? "#ff9f0a" : "#ff9500",
              marginBottom: 4,
            }}>
              🚨 <span style={{ marginLeft: 8 }}>Recent Conjunction</span>
            </div>
            <div style={{ 
              fontSize: 13, 
              color: isDark ? "#d1d1d6" : "#48484a",
              lineHeight: 1.4,
            }}>
              Feb 28: Close satellite approach averted. Collision would have increased LEO debris by 50%.
            </div>
          </div>

          <div style={{
            padding: "12px 16px",
            background: isDark ? "rgba(48, 209, 88, 0.1)" : "rgba(52, 199, 89, 0.08)",
            border: isDark ? "0.5px solid rgba(48, 209, 88, 0.2)" : "0.5px solid rgba(52, 199, 89, 0.15)",
            borderRadius: 10,
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              fontSize: 14,
              fontWeight: 600,
              color: isDark ? "#30d158" : "#34c759",
              marginBottom: 4,
            }}>
              📡 <span style={{ marginLeft: 8 }}>Active Tracking</span>
            </div>
            <div style={{ 
              fontSize: 13, 
              color: isDark ? "#d1d1d6" : "#48484a",
              lineHeight: 1.4,
            }}>
              ESA monitoring 40,230+ artificial objects. NASA collision avoidance procedures increasing.
            </div>
          </div>
        </div>

        {/* Debris Statistics */}
        <div style={{ padding: "0 20px", marginBottom: 24 }}>
          <h3 style={{
            margin: "0 0 12px 0",
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? "#8e8e93" : "#6d6d70",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Orbital Debris Stats
          </h3>
          <div style={{
            padding: "16px 20px",
            background: isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(242, 242, 247, 0.8)",
            borderRadius: 12,
            border: isDark ? "0.5px solid rgba(255,255,255,0.06)" : "0.5px solid rgba(0,0,0,0.04)",
            backdropFilter: "blur(10px)",
          }}>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              marginBottom: 10,
              fontSize: 14,
              fontWeight: 500,
            }}>
              <span style={{ color: isDark ? "#d1d1d6" : "#48484a" }}>🗑️ Tracked Debris</span>
              <span style={{ 
                color: "#ff453a",
                fontWeight: 700,
                fontSize: 16,
              }}>
                {debrisList.length ? debrisList.length.toLocaleString() : "Loading..."}
              </span>
            </div>
            
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              marginBottom: 10,
              fontSize: 14,
              fontWeight: 500,
            }}>
              <span style={{ color: isDark ? "#d1d1d6" : "#48484a" }}>💥 2009 Collision Debris</span>
              <span style={{ 
                color: "#ff9f0a",
                fontWeight: 700,
                fontSize: 16,
              }}>
                1,128
              </span>
            </div>

            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              marginBottom: 10,
              fontSize: 14,
              fontWeight: 500,
            }}>
              <span style={{ color: isDark ? "#d1d1d6" : "#48484a" }}>📊 Peak Altitude</span>
              <span style={{ 
                color: "#007aff",
                fontWeight: 700,
                fontSize: 16,
              }}>
                800-1000km
              </span>
            </div>

            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              fontSize: 14,
              fontWeight: 500,
            }}>
              <span style={{ color: isDark ? "#d1d1d6" : "#48484a" }}>🚀 Annual Launches</span>
              <span style={{ 
                color: "#30d158",
                fontWeight: 700,
                fontSize: 16,
              }}>
                ~110
              </span>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div style={{ padding: "0 20px", marginBottom: 24 }}>
          <h3 style={{
            margin: "0 0 12px 0",
            fontSize: 13,
            fontWeight: 600,
            color: isDark ? "#8e8e93" : "#6d6d70",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Quick Filters
          </h3>
          <nav>
            {ALL_FILTERS.map((f) => (
              <button
                key={f.label}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  marginBottom: 4,
                  fontWeight: filter === f.label ? 600 : 500,
                  background: filter === f.label
                    ? (isDark ? "rgba(10, 132, 255, 0.15)" : "rgba(0, 122, 255, 0.1)")
                    : "transparent",
                  color: filter === f.label 
                    ? (isDark ? "#64d2ff" : "#0071e3")
                    : (isDark ? "#f2f2f7" : "#1d1d1f"),
                  border: filter === f.label
                    ? (isDark ? "0.5px solid rgba(10, 132, 255, 0.3)" : "0.5px solid rgba(0, 122, 255, 0.2)")
                    : "0.5px solid transparent",
                  borderRadius: 10,
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
                onClick={() => {
                  setFilter(f.label);
                  setSelectedSat(null);
                  if (isMobile) setSidebarOpen(false);
                }}
                onMouseEnter={(e) => {
                  if (filter !== f.label) {
                    e.target.style.background = isDark ? "rgba(118, 118, 128, 0.08)" : "rgba(118, 118, 128, 0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== f.label) {
                    e.target.style.background = "transparent";
                  }
                }}
              >
                <span style={{ marginRight: 12, fontSize: 16 }}>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Category Accordion */}
        <div style={{ padding: "0 20px", marginBottom: 24 }}>
          <button
            aria-expanded={catAccordion}
            style={{
              width: "100%",
              background: "transparent",
              color: isDark ? "#f2f2f7" : "#1d1d1f",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 0 12px 0",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
            onClick={() => setCatAccordion(x => !x)}
          >
            <span style={{ color: isDark ? "#8e8e93" : "#6d6d70" }}>Categories</span>
            <span
              style={{
                display: "inline-block",
                transform: catAccordion ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                fontSize: 12,
                color: isDark ? "#8e8e93" : "#6d6d70",
              }}
            >
              ▶
            </span>
          </button>
          
          {catAccordion && (
            <nav style={{ 
              animation: "slideDown 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            }}>
              {SAT_CATEGORIES.filter(c => c.label !== "ISS").map(c => (
                <button
                  key={c.label}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    marginBottom: 4,
                    fontWeight: filter === c.label ? 600 : 500,
                    background: filter === c.label
                      ? (isDark ? "rgba(10, 132, 255, 0.15)" : "rgba(0, 122, 255, 0.1)")
                      : "transparent",
                    color: filter === c.label 
                      ? (isDark ? "#64d2ff" : "#0071e3")
                      : (isDark ? "#f2f2f7" : "#1d1d1f"),
                    border: filter === c.label
                      ? (isDark ? "0.5px solid rgba(10, 132, 255, 0.3)" : "0.5px solid rgba(0, 122, 255, 0.2)")
                      : "0.5px solid transparent",
                    borderRadius: 10,
                    fontSize: 16,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                  onClick={() => {
                    setFilter(c.label);
                    setSelectedSat(null);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  onMouseEnter={e => {
                    if (filter !== c.label) {
                      e.target.style.background = isDark ? "rgba(118, 118, 128, 0.08)" : "rgba(118, 118, 128, 0.04)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (filter !== c.label) {
                      e.target.style.background = "transparent";
                    }
                  }}
                >
                  <span style={{ marginRight: 12, fontSize: 16 }}>{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Fleet Stats */}
        <CollapsiblePanel
          title="Fleet Statistics"
          open={fleetStatsOpen}
          onToggle={() => setFleetStatsOpen(x => !x)}
        >
          <div style={{ padding: "0 20px 20px" }}>
            <div
              style={{
                padding: "16px 20px",
                background: isDark ? "rgba(28, 28, 30, 0.6)" : "rgba(242, 242, 247, 0.8)",
                borderRadius: 12,
                border: isDark ? "0.5px solid rgba(255,255,255,0.06)" : "0.5px solid rgba(0,0,0,0.04)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: 12,
                fontSize: 16,
                fontWeight: 600,
              }}>
                <span style={{ marginRight: 8 }}>🛰️</span>
                <span style={{ color: isDark ? "#f2f2f7" : "#1d1d1f" }}>Online:</span>
                <span style={{ 
                  marginLeft: "auto",
                  color: "#30d158",
                  fontWeight: 700,
                  fontSize: 18,
                }}>
                  {satellites.length}
                </span>
              </div>
              
              {SAT_CATEGORIES.map(c => (
                <div key={c.label} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  marginBottom: 8,
                  fontSize: 15,
                  fontWeight: 500,
                }}>
                  <span style={{ marginRight: 8 }}>{c.icon}</span>
                  <span style={{ color: isDark ? "#d1d1d6" : "#48484a" }}>{c.label}:</span>
                  <span style={{ 
                    marginLeft: "auto",
                    color: "#007aff",
                    fontWeight: 600,
                  }}>
                    {satellites.filter(
                      s => s.type?.toLowerCase() === c.label.toLowerCase()
                    ).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CollapsiblePanel>
      </div>
    </aside>
  );
}

  // --- MAP LOGIC ---
  function MainMap({ satellites, selectedSat, position, isDark, showAll }) {
    const markerList = showAll
      ? satellites
          .filter(hasValidLatLng)
          .slice(0, 80)
      : position && selectedSat && hasValidLatLng(position)
        ? [{ ...selectedSat, ...position }]
        : [];

    const center = markerList.length
      ? [markerList[0].lat, markerList[0].lng]
      : [20, 0];

    // Apple-grey dot
    const AppleGreyDot = L.divIcon({
      className: "apple-grey-dot",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -10],
      html: ""
    });

    const tileUrl = isDark
      ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
      : "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png";

    const mapRef = useRef();

    useEffect(() => {
      if (
        mapRef.current &&
        markerList.length === 1 &&
        markerList[0].lat !== undefined &&
        markerList[0].lng !== undefined
      ) {
        mapRef.current.setView([markerList[0].lat, markerList[0].lng], 3, { animate: true });
      }
    }, [markerList.length]);

    return (
      <MapContainer
        center={center}
        zoom={2}
        style={{
          flex: 1,
          height: 420,
          borderRadius: 20,
          boxShadow: "0 2px 18px #22232615",
          margin: "0 auto",
          maxWidth: 650
        }}
        scrollWheelZoom={false}
        attributionControl={false}
        ref={mapRef}
      >
        <TileLayer url={tileUrl} attribution="&copy; Stadia Maps" />
        {markerList.map((s, idx) =>
          hasValidLatLng(s) ? (
            <Marker key={s.OBJECT_ID + idx} position={[s.lat, s.lng]} icon={AppleGreyDot} />
          ) : null
        )}
        {markerList.length === 1 && (
          <Recenter position={[markerList[0].lat, markerList[0].lng]} zoom={3} />
        )}
      </MapContainer>
    );
  }

  // --- SAT TILE LIST (LIVE ORBITS) ---
  function SatTileList({ groupedSats }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
      {Object.entries(groupedSats).map(([type, sats]) => (
        <div key={type} className="p-card p-shadow-2"
          style={{
            minWidth: 160, 
            maxWidth: 300, 
            width: isMobile ? "100%" : undefined, 
            padding: 20, 
            borderRadius: 16,
            display: "flex", 
            flexDirection: "column", 
            gap: 12,
            background: isDark 
              ? "rgba(28, 28, 30, 0.8)" 
              : "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: isDark 
              ? "0.5px solid rgba(255,255,255,0.08)" 
              : "0.5px solid rgba(0,0,0,0.06)",
            boxShadow: isDark 
              ? "0 4px 20px rgba(0,0,0,0.2)" 
              : "0 4px 15px rgba(0,0,0,0.08)",
            color: isDark ? "#f2f2f7" : "#1d1d1f",
            fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {SAT_CATEGORIES.find((c) => c.label === type)?.icon || "🛰️"} {type}
            </div>
            <div style={{ color: "#aaa" }}>
              {type === "ISS" ? "International Space Station" : `${sats.length} satellites`}
            </div>
            {type !== "ISS" && <div style={{ fontSize: 13, color: "#888" }}>Latest epoch: {sats[0]?.EPOCH}</div>}
            <button className="p-btn p-prim-col" onClick={() => setExpandedGroup(e => ({ ...e, [type]: !e[type] }))}>
              {expandedGroup[type] ? "Hide List" : "Show List"}
            </button>
            {expandedGroup[type] && (
              <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 8 }}>
                {sats.map((s, i) => (
                  <div key={s.OBJECT_ID + i} style={{
                    display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee"
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.OBJECT_NAME}</div>
                      <div style={{ color: "#888", fontSize: 12 }}>{s.EPOCH}</div>
                    </div>
                    <button className="p-btn p-prim-col" onClick={() => { setSelectedSat(s); setTab(1); }}>Track</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // --- INFO PANEL ---
  function InfoPanel({ selectedSat, allCount, allList, isDark }) {
    // Find more details for selectedSat if available (alt, lat/lng, source)
    let alt = null, lat = null, lng = null, apiSource = null;
    if (selectedSat && typeof selectedSat.alt !== "undefined") {
      alt = selectedSat.alt;
      lat = selectedSat.lat;
      lng = selectedSat.lng;
      apiSource = selectedSat.apiSource;
    }
    // Source note
    let sourceNote = "";
    if (apiSource === "N2YO" || apiSource === "n2yo") sourceNote = "Data via N2YO";
    else if (apiSource === "tle") sourceNote = "TLE computed";
    else if (apiSource === "none") sourceNote = "No position data";

    const divider = (
      <div
        style={{
          border: "none",
          borderTop: isDark ? "1px solid #34344a" : "1px solid #e7eaf2",
          margin: "1.2em 0"
        }}
      />
    );
    return (
    <div
      style={{
        margin: "18px auto 0",
        maxWidth: 560,
        borderRadius: 16,
        background: isDark
          ? "rgba(28, 28, 30, 0.8)"
          : "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: isDark 
          ? "0.5px solid rgba(255,255,255,0.08)" 
          : "0.5px solid rgba(0,0,0,0.06)",
        boxShadow: isDark 
          ? "0 8px 40px rgba(0,0,0,0.3)" 
          : "0 8px 30px rgba(0,0,0,0.1)",
        color: isDark ? "#f2f2f7" : "#1d1d1f",
        padding: 28,
        fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
        {selectedSat ? (
          <>
            {/* Prominent icon + name */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 10
            }}>
              <span style={{
                fontSize: 38,
                lineHeight: 1,
                filter: isDark ? "drop-shadow(0 2px 8px #23253a88)" : "",
              }}>{selectedSat.icon || "🛰️"}</span>
              <span style={{
                fontSize: 25,
                fontWeight: 800,
                letterSpacing: -0.5,
                color: isDark ? "#f7f8ff" : "#232428"
              }}>
                {selectedSat.OBJECT_NAME}
              </span>
            </div>
            {/* Description and IDs */}
            <div style={{
              fontSize: 16,
              color: isDark ? "#b5b8cd" : "#555",
              marginBottom: 6,
              fontWeight: 500
            }}>
              {selectedSat.description || "Satellite"}
            </div>
            <div style={{
              fontSize: 14,
              color: isDark ? "#b5b8cd" : "#555",
              marginBottom: 2
            }}>
              <span style={{ fontWeight: 500 }}>NORAD:</span> <b>{selectedSat.OBJECT_ID}</b>
              <span style={{ marginLeft: 14 }}><span style={{ fontWeight: 500 }}>Epoch:</span> <b>{selectedSat.EPOCH}</b></span>
            </div>
            {/* Divider */}
            {divider}
            {/* Group: Position & Altitude */}
            <div style={{
              display: "flex",
              flexDirection: "row",
              gap: 24,
              marginBottom: 8,
              flexWrap: "wrap"
            }}>
              <div>
                <div style={{ fontSize: 13, color: "#a4a7bb", fontWeight: 500 }}>Altitude</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isDark ? "#70e7ff" : "#1a8bff"
                }}>
                  {typeof satPosition?.alt === "number" ? `${satPosition.alt.toFixed(2)} km` : "N/A"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#a4a7bb", fontWeight: 500 }}>Position (Lat, Lng)</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isDark ? "#f7e67a" : "#b99a1a"
                }}>
                  {typeof satPosition?.lat === "number" && typeof satPosition?.lng === "number"
                    ? `(${satPosition.lat.toFixed(2)}, ${satPosition.lng.toFixed(2)})`
                    : "N/A"}
                </div>
              </div>
            </div>
            {/* Source note */}
            {sourceNote && (
              <div style={{ fontSize: 12, color: isDark ? "#7be2d6" : "#1a7b5a", marginTop: 2 }}>
                <span style={{ fontWeight: 600 }}>Source:</span> {sourceNote}
              </div>
            )}
            {/* Divider */}
            {divider}
            {/* Metadata group */}
            <div>
              <div style={{ fontSize: 13, color: "#a4a7bb", fontWeight: 500, marginBottom: 2 }}>Type</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? "#b6d0ff" : "#2a4b9c" }}>
                {selectedSat.type || "Unknown"}
              </div>
            </div>
            {/* Orbital Details */}
            {divider}
            <div style={{
              fontSize: 13,
              color: "#a4a7bb",
              fontWeight: 500,
              marginBottom: 4
            }}>Orbital Details</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div><b>Inclination:</b> {selectedSat.INCLINATION || "N/A"}°</div>
              <div><b>Eccentricity:</b> {selectedSat.ECCENTRICITY || "N/A"}</div>
              <div><b>Mean Motion:</b> {selectedSat.MEAN_MOTION || "N/A"} rev/day</div>
              <div><b>Period:</b> {selectedSat.MEAN_MOTION ? (1440 / parseFloat(selectedSat.MEAN_MOTION)).toFixed(2) + " min" : "N/A"}</div>
              <div><b>Estimated Velocity:</b> {satPosition?.alt ? (Math.sqrt(398600.4418 / (satPosition.alt + 6371)) * 3.6).toFixed(2) + " km/h" : "N/A"}</div>
              <div><b>Footprint Radius:</b> {satPosition?.alt ? (2 * Math.sqrt(satPosition.alt * 6371)).toFixed(1) + " km" : "N/A"}</div>
              <div><b>Orbit Type:</b> {selectedSat.INCLINATION && satPosition?.alt ? (
                parseFloat(selectedSat.INCLINATION) > 60 ? "Polar" :
                satPosition.alt > 20000 ? "Geostationary" :
                "LEO"
              ) : "N/A"}</div>
            </div>
            {/* Operator and Launch Info placeholders */}
            {divider}
            <div style={{ fontSize: 13, color: "#a4a7bb", fontWeight: 500, marginBottom: 2 }}>Operator</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? "#b6d0ff" : "#2a4b9c" }}>N/A</div>
            <div style={{ fontSize: 13, color: "#a4a7bb", fontWeight: 500, marginTop: 10, marginBottom: 2 }}>Launch Info</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? "#b6d0ff" : "#2a4b9c" }}>Date: N/A · Vehicle: N/A</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>
              🚀 Showing all {allCount} satellites in view
            </div>
            <div
              style={{
                fontSize: 15,
                color: isDark ? "#b5b8cd" : "#555",
                maxHeight: 100,
                overflowY: "auto"
              }}
            >
              {allList
                .slice(0, 5)
                .map((sat, idx) => (
                  <span key={sat.OBJECT_ID + idx}>
                    {sat.icon} {sat.OBJECT_NAME}{" "}
                  </span>
                ))}
              {allList.length > 5 ? <span>...and more.</span> : null}
            </div>
            <div style={{ fontSize: 12, color: isDark ? "#858798" : "#a2a2b0", marginTop: 5 }}>
              Select a satellite from the left or click a marker for details.
            </div>
          </>
        )}
      </div>
    );
  }

  // --- RENDER ---
  return (
    <div className="window window-full" style={{
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: isDark 
    ? "linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)" 
    : "linear-gradient(135deg, #f2f2f7 0%, #ffffff 100%)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
}}>
      <header className="titlebar" style={{
  zIndex: 1002, 
  background: isDark 
    ? "rgba(28, 28, 30, 0.8)" 
    : "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderBottom: isDark 
    ? "0.5px solid rgba(255,255,255,0.08)" 
    : "0.5px solid rgba(0,0,0,0.06)",
  color: isDark ? "#f2f2f7" : "#1d1d1f",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
}}>
        <div className="traffic-lights" />
        <div className="title p-large-title">🛰️ SpaceShield</div>
        {isMobile && (
          <button
            className="sidebar-toggle-btn"
            aria-label="Open sidebar"
            style={{
              marginLeft: "auto", marginRight: 12,
              background: "none", border: "none", fontSize: 32, cursor: "pointer", color: "inherit", zIndex: 1003
            }}
            onClick={() => setSidebarOpen(true)}
          >
            <span role="img" aria-label="menu">☰</span>
          </button>
        )}
      </header>
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
        <Sidebar />
        <main className="p-layout" style={{
          flex: 1, display: "flex", flexDirection: "column", background: "none", minWidth: 0
        }}>
          <nav className="p-tabs p-shadow-1" style={{
  margin: "1.2rem auto 0.6rem",
  borderRadius: 12,
  maxWidth: 640,
  width: "100%",
  background: isDark 
    ? "rgba(28, 28, 30, 0.8)" 
    : "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: isDark 
    ? "0.5px solid rgba(255,255,255,0.08)" 
    : "0.5px solid rgba(0,0,0,0.06)",
  color: isDark ? "#f2f2f7" : "#1d1d1f",
  boxShadow: isDark 
    ? "0 4px 30px rgba(0,0,0,0.3)" 
    : "0 4px 20px rgba(0,0,0,0.1)",
  padding: "6px",
}}>
            <button
              className={`p-tab${tab === 0 ? " p-is-active" : ""}`}
              style={{
                background: tab === 0
                  ? isDark ? "#313134" : "#eef0fb"
                  : "transparent",
                color: tab === 0
                  ? isDark ? "#ffe" : "#232428"
                  : undefined
              }}
              onClick={() => {
                setTab(0); setSelectedSat(null);
              }}
            >
              <span style={{ marginRight: 6 }}>🛰️</span>Live Orbits
            </button>
            <button
              className={`p-tab${tab === 1 ? " p-is-active" : ""}`}
              style={{
                background: tab === 1
                  ? isDark ? "#313134" : "#eef0fb"
                  : "transparent",
                color: tab === 1
                  ? isDark ? "#ffe" : "#232428"
                  : undefined
              }}
              onClick={() => setTab(1)}
            >
              <span style={{ marginRight: 6 }}>📡</span>Track View
            </button>
            <button
              className={`p-tab${tab === 2 ? " p-is-active" : ""}`}
              style={{
                background: tab === 2
                  ? isDark ? "#313134" : "#eef0fb"
                  : "transparent",
                color: tab === 2
                  ? isDark ? "#ffe" : "#232428"
                  : undefined
              }}
              onClick={() => setTab(2)}
            >
              <span style={{ marginRight: 6 }}>✨</span>Space Events
            </button>
          </nav>
          <section className="p-panels" style={{
            flex: 1,
            padding: isMobile ? "0.5rem" : "1.5rem",
            overflowY: "auto"
          }}>
            {/* LIVE ORBITS: map + tile list */}
            {tab === 0 && (
              <>
                <MainMap
                  satellites={satellites}
                  selectedSat={null}
                  position={null}
                  isDark={isDark}
                  showAll={true}
                />
                <SatTileList groupedSats={groupedSats} />
              </>
            )}
            {/* TRACK VIEW: single or all */}
            {tab === 1 && (
              <>
                <MainMap
                  satellites={satellites}
                  selectedSat={selectedSat}
                  position={satPosition}
                  isDark={isDark}
                  showAll={!selectedSat}
                />
                <InfoPanel
                  selectedSat={selectedSat}
                  allCount={satellites.length}
                  allList={satellites}
                  isDark={isDark}
                />
              </>
            )}
            {/* SPACE EVENTS */}
            {tab === 2 && (
              <ErrorBoundary>
                <SpaceEventsPanel isDark={isDark} />
              </ErrorBoundary>
            )}
          </section>
        </main>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .sidebar-frost {
            min-width: 0 !important;
            max-width: none !important;
            width: 260px !important;
            border-radius: 0 !important;
          }
          .sidebar-frost:not(.open) {
            left: -300px !important;
            box-shadow: none !important;
          }
          .sidebar-frost.open {
            left: 0 !important;
            box-shadow: 0 0 100vw 100vw rgba(0,0,0,0.36);
            position: fixed !important;
          }
        }
        .apple-grey-dot {
          background: radial-gradient(ellipse at center, #bbb 60%, #232428 100%);
          width: 22px; height: 22px; border-radius: 50%;
          box-shadow: 0 0 8px 3px #23242888, 0 0 0 3px rgba(30,30,40,0.14);
          border: 2px solid #fff;
        }
        .sidebar-toggle-btn { display: none; }
        @media (max-width: 900px) {
          .sidebar-toggle-btn { display: block; }
        }
        .collapsible-panel > div:first-child { cursor: pointer; }
        .p-tab { border: none; background: transparent; cursor: pointer; padding: 0.6em 1.3em; font-size: 17px; border-radius: 7px; margin: 0 2px;}
        .p-is-active { font-weight: 700; }
        ::-webkit-scrollbar { width: 0 !important; background: transparent !important; }
        html, body, .window-full { scrollbar-width: none !important; }
      `}</style>
      <style>{`
  .apple-grey-dot {
    background: radial-gradient(ellipse at center, 
      ${isDark ? '#64d2ff' : '#007aff'} 60%, 
      ${isDark ? '#1c1c1e' : '#ffffff'} 100%);
    width: 22px; 
    height: 22px; 
    border-radius: 50%;
    box-shadow: 0 0 12px 4px rgba(0, 122, 255, 0.3), 
                0 0 0 2px rgba(255, 255, 255, 0.8);
    border: 2px solid ${isDark ? '#1c1c1e' : '#ffffff'};
  }
  
  .p-tab {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 10px 16px;
    font-size: 16px;
    border-radius: 8px;
    margin: 0 4px;
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    transition: all 0.2s ease;
  }
  
  .titlebar {
    padding: 12px 20px;
    display: flex;
    align-items: center;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.022em;
  }
  
  .p-card {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  .p-card:hover {
    transform: translateY(-2px);
    box-shadow: ${isDark 
      ? '0 8px 30px rgba(0,0,0,0.4)' 
      : '0 8px 25px rgba(0,0,0,0.12)'};
  }
  
  ::-webkit-scrollbar { 
    width: 0 !important; 
    background: transparent !important; 
  }
  
  html, body, .window-full { 
    scrollbar-width: none !important; 
  }
`}</style>
    </div>
  );
}

export default App;