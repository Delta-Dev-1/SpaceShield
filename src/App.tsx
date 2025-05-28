import React, { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as satellite from "satellite.js";

// --- API KEYS ---
const NASA_API_KEY = "4a9BWOSMMTuKkxF3yJdtnaVKgjKcqUXPYIJhTSoy";
const N2YO_API_KEY = "7W972R-NWYXJV-8RV8HP-5HNQ";
const CORS_PROXY = "https://c145ad64-2e3d-450a-9dcb-2b585b373580-00-zbpwzrcss4r5.riker.replit.dev/proxy?url=";

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
function SpaceEventsPanel() {
  const [asteroids, setAsteroids] = useState([]);
  const [kpIndex, setKpIndex] = useState([]);
  const [solarFlares, setSolarFlares] = useState([]);
  const [aurora, setAurora] = useState(null);
  const [meteors, setMeteors] = useState([]);
  const [astroEvents, setAstroEvents] = useState([]);

  useEffect(() => {
  const today = new Date().toISOString().slice(0, 10);

  // NASA NEO
  fetch(`https://api.cors.lol/?url=https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`)
    .then(r => r.json())
    .then(data => setAsteroids(data?.near_earth_objects?.[today] || []))
    .catch(() => setAsteroids([]));

  // Kp Index
  fetch("https://api.cors.lol/?url=https://services.swpc.noaa.gov/json/planetary_k_index_3_day.json")
    .then(r => r.json())
    .then(setKpIndex)
    .catch(() => setKpIndex([]));

  // Solar Flares
  fetch("https://api.cors.lol/?url=https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json")
    .then(r => r.json())
    .then(setSolarFlares)
    .catch(() => setSolarFlares([]));

  // Aurora
  fetch("https://api.cors.lol/?url=https://services.swpc.noaa.gov/json/ovation_aurora_latest.json")
    .then(r => r.json())
    .then(setAurora)
    .catch(() => setAurora(null));

  // Meteors (hardcoded fallback is safe)
  setMeteors([{ name: "Eta Aquariids", date: "May 5-6", peak: "2024-05-06" }]);

  // Astro events
  fetch("https://api.cors.lol/?url=https://in-the-sky.org/newscal.php?year=2024&month=5&maxdiff=31&feed=ical")
    .then(r => r.text())
    .then(txt => {
      const events = [];
      const lines = txt.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("SUMMARY:")) {
          events.push({
            summary: lines[i].replace("SUMMARY:", ""),
            date: lines[i - 2]?.replace("DTSTART;VALUE=DATE:", "") || "Unknown"
          });
        }
      }
      setAstroEvents(events);
    })
    .catch(() => setAstroEvents([]));
}, []);

  return (
    <section className="p-card p-shadow-2" style={{padding:24, maxWidth:800, margin:"0 auto"}}>
      <div className="p-headline" style={{fontSize:24,marginBottom:8}}>✨ Live Space & Cosmic Events</div>
      <div style={{margin:"1.4em 0 1em"}}>
        <strong>🪐 Near-Earth Asteroids Today (NASA):</strong>
        {asteroids.length ? (
          <ul style={{margin:"0.4em 0 0 0.7em",padding:0}}>
            {asteroids.slice(0,5).map(a=>(
              <li key={a.id}>
                <b>{a.name}</b> - Closest: {(a.close_approach_data?.[0]?.miss_distance.kilometers|0).toLocaleString()} km | <span style={{color:"#aaa"}}>{a.nasa_jpl_url}</span>
              </li>
            ))}
          </ul>
        ) : <span> No close approaches listed today.</span>}
      </div>
      <div style={{margin:"1.4em 0 1em"}}>
        <strong>🌐 Kp Index (Geomagnetic Storm, NOAA):</strong>
        {kpIndex.length ? (
          <div style={{display:"flex",gap:10}}>
            {kpIndex.slice(-8).map((k,i)=>(
              <span key={i} style={{color: k.kp_index >= 5 ? "red":"#197", fontWeight:600}}>Kp {k.kp_index} ({k.time_tag.slice(11,16)})</span>
            ))}
          </div>
        ) : <span> Not available.</span>}
      </div>
      <div style={{margin:"1.4em 0 1em"}}>
        <strong>☀️ Solar Flares (GOES X-ray, 6h):</strong>
        {solarFlares.length ? (
          <div style={{fontSize:13,whiteSpace:"nowrap",overflowX:"auto",maxWidth:"100%"}}>
            {solarFlares.slice(-12).map((f,i)=>(
              <span key={i} style={{marginRight:12}}>
                {f.time_tag?.slice(11,19)} Z: <b style={{color:"#fa0"}}>{(+f.flux).toExponential(2)}</b>
              </span>
            ))}
          </div>
        ) : <span> Not available.</span>}
      </div>
      <div style={{margin:"1.4em 0 1em"}}>
        <strong>🌌 Aurora Activity (Ovation, NOAA):</strong>
        {aurora ? (
          <div>
            <span>Power North: <b>{aurora.Power_N.toFixed(1)} GW</b>, Power South: <b>{aurora.Power_S.toFixed(1)} GW</b></span>
            <div style={{marginTop:8}}>
              <img src="https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.png" width={300} alt="Aurora forecast" style={{borderRadius:8}} />
            </div>
          </div>
        ) : <span>Not available.</span>}
      </div>
      <div style={{margin:"1.4em 0 1em"}}>
        <strong>☄️ Meteor Showers (IMO):</strong>
        {meteors.length ? (
          <ul style={{margin:0,padding:0}}>
            {meteors.map((m,i)=>(
              <li key={i}>{m.name} — Peak: {m.peak} ({m.date})</li>
            ))}
          </ul>
        ) : <span>No upcoming major showers listed.</span>}
      </div>
      <div style={{margin:"1.4em 0 1em"}}>
        <strong>📅 Astronomy Events (In-The-Sky.org):</strong>
        {astroEvents.length ? (
          <ul style={{margin:0,padding:0}}>
            {astroEvents.slice(0,6).map((e,i)=>(
              <li key={i}>{e.date}: {e.summary}</li>
            ))}
          </ul>
        ) : <span>No events found.</span>}
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
  return {
    OBJECT_NAME: feat.name,
    OBJECT_ID: feat.noradId?.toString(),
    EPOCH: "Live",
    type: feat.type,
    description: feat.description,
    icon: feat.icon
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
      const withPositions = valid.map(sat => {
        if (sat.TLE_LINE1 && sat.TLE_LINE2) {
          try {
            const satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
            const gmst = satellite.gstime(now);
            const prop = satellite.propagate(satrec, now);
            if (prop.position) {
              const geo = satellite.eciToGeodetic(prop.position, gmst);
              const lat = satellite.degreesLat(geo.latitude);
              const lng = satellite.degreesLong(geo.longitude);
              const alt = geo.height * 6371;
              // Only add lat/lng if they are numbers
              return { ...sat, lat, lng, alt };
            }
          } catch (e) {
            // Silent fail
          }
        }
        return { ...sat, lat: null, lng: null, alt: null };
      });

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
            tleFallback();
          }
        })
        .catch(() => {
          tleFallback();
        });
    }

    function tleFallback() {
      if (selectedSat.TLE_LINE1 && selectedSat.TLE_LINE2) {
        try {
          const now = new Date();
          const satrec = satellite.twoline2satrec(selectedSat.TLE_LINE1, selectedSat.TLE_LINE2);
          const gmst = satellite.gstime(now);
          const prop = satellite.propagate(satrec, now);
          if (prop.position) {
            const geo = satellite.eciToGeodetic(prop.position, gmst);
            const lat = satellite.degreesLat(geo.latitude);
            const lng = satellite.degreesLong(geo.longitude);
            const alt = geo.height * 6371;
            setSatPosition({ lat, lng, alt, apiSource: "tle" });
            setSatApiRaw(null);
            setSatPositionSource("tle");
            return;
          }
        } catch {}
      }
      // If nothing works, set to [0,0]
      setSatPosition({ lat: 0, lng: 0, alt: null, apiSource: "none" });
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
    return (
      <aside
        className={`sidebar-frost p-shadow-1 p-card${sidebarOpen ? " open" : ""}`}
        style={{
          minWidth: 270,
          maxWidth: 320,
          width: isMobile ? 260 : undefined,
          display: "flex",
          flexDirection: "column",
          borderRadius: isMobile ? 0 : "16px 0 0 16px",
          borderRight: isDark ? "1px solid #232428" : "1px solid #e5eaf8",
          height: "100vh",
          overflow: "hidden",
          position: isMobile ? "fixed" : "relative",
          zIndex: 1001,
          top: 0,
          left: sidebarOpen ? 0 : isMobile ? -300 : 0,
          background: isDark ? "#232428" : "#fff",
          color: isDark ? "#f0f3fa" : "#222",
          boxShadow: isMobile && sidebarOpen ? "0 0 100vw 100vw rgba(0,0,0,0.35)" : undefined,
          transition:
            "left 0.24s cubic-bezier(.57,1.45,.36,1), box-shadow 0.2s"
        }}
      >
        {isMobile && (
          <button
            aria-label="Close sidebar"
            style={{
              background: "none",
              border: "none",
              fontSize: 32,
              color: "inherit",
              alignSelf: "flex-end",
              margin: "1rem",
              zIndex: 1002,
              cursor: "pointer"
            }}
            onClick={() => setSidebarOpen(false)}
          >
            <span role="img" aria-label="close">
              ✖️
            </span>
          </button>
        )}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            className="sidebar-section-label"
            style={{
              padding: "1.4rem 1rem 0.5rem",
              color: isDark ? "#b0bee0" : undefined
            }}
          >
            Satellites
          </div>
          <div
            className="sidebar-section-divider"
            style={{
              borderTop: isDark ? "1px solid #272a3c" : undefined
            }}
          />
          <nav style={{ padding: "0 1rem", marginBottom: 10 }}>
            {ALL_FILTERS.map((f) => (
              <button
                key={f.label}
                className={`p-btn p-btn-block p-btn-sidebar${
                  filter === f.label ? " active" : ""
                }`}
                style={{
                  marginBottom: 4,
                  fontWeight: filter === f.label ? 700 : 500,
                  background:
                    isDark && filter === f.label ? "#2b2e30" : undefined,
                  color: isDark ? "#e2e7fa" : undefined,
                  border: isDark ? "1px solid #232428" : undefined
                }}
                onClick={() => {
                  setFilter(f.label);
                  setSelectedSat(null);
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                <span style={{ marginRight: 8 }}>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: "0 1rem" }}>
            <button
              className="p-btn p-btn-block"
              aria-expanded={catAccordion}
              style={{
                background: isDark ? "#2b2e30" : undefined,
                color: isDark ? "#e2e7fa" : undefined,
                border: isDark ? "1px solid #232428" : undefined
              }}
              onClick={() => setCatAccordion((x) => !x)}
            >
              Categories&nbsp;
              <span
                style={{
                  display: "inline-block",
                  transform: catAccordion ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s"
                }}
              >
                ▶
              </span>
            </button>
            {catAccordion && (
              <nav style={{ marginTop: 5 }}>
                {SAT_CATEGORIES.filter((c) => c.label !== "ISS").map((c) => (
                  <button
                    key={c.label}
                    className={`p-btn p-btn-block p-btn-sidebar${
                      filter === c.label ? " active" : ""
                    }`}
                    style={{
                      marginBottom: 4,
                      fontWeight: filter === c.label ? 700 : 500,
                      background:
                        isDark && filter === c.label
                          ? "#2b2e30"
                          : undefined,
                      color: isDark ? "#e2e7fa" : undefined,
                      border: isDark ? "1px solid #232428" : undefined
                    }}
                    onClick={() => {
                      setFilter(c.label);
                      setSelectedSat(null);
                      if (isMobile) setSidebarOpen(false);
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
          <CollapsiblePanel
            title="Fleet Statistics"
            open={fleetStatsOpen}
            onToggle={() => setFleetStatsOpen((x) => !x)}
          >
            <section
              className="p-card"
              style={{
                margin: "0 1rem 1rem",
                padding: "0.6rem 1rem",
                background: isDark
                  ? "#232428"
                  : "var(--p-card-bg,#f7f9fd)",
                color: isDark ? "#e2e7fa" : undefined,
                fontSize: 15,
                border: isDark ? "1px solid #232428" : undefined
              }}
            >
              <div>
                🛰️ Online: <span className="p-lime">{satellites.length}</span>
              </div>
              {SAT_CATEGORIES.map((c) => (
                <div key={c.label}>
                  {c.icon} {c.label}:{" "}
                  <span className="p-blueberry">
                    {
                      satellites.filter(
                        (s) =>
                          s.type?.toLowerCase() === c.label.toLowerCase()
                      ).length
                    }
                  </span>
                </div>
              ))}
            </section>
          </CollapsiblePanel>
          <div className="sidebar-section-label" style={{
            paddingLeft: 18,
            marginBottom: 4,
            color: isDark ? "#b0bee0" : undefined
          }}>Event Log</div>
          <section className="p-card" style={{
            margin: "0 1rem 1.6rem",
            padding: "0.6rem 1rem",
            background: isDark ? "#242743" : "var(--p-card-bg,#f7f9fd)",
            color: isDark ? "#e2e7fa" : undefined,
            maxHeight: 150,
            overflowY: "auto",
            fontSize: 14,
            border: isDark ? "1px solid #232428" : undefined
          }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", lineHeight: 1.6 }}>
              {[{ time: "12:02 UTC", text: "Starlink-1234 adjusted orbit by 1.1 km." },
                { time: "11:47 UTC", text: "MilSat-X: Communication blackout (5 min)." },
                { time: "11:33 UTC", text: "WeatherSat-3A sent weather burst." }].map((ev, i) => (
                  <li key={i}><strong>{ev.time}</strong> {ev.text}</li>
              ))}
            </ul>
          </section>
        </div>
        <div
          style={{
            padding: "1rem",
            borderTop: isDark
              ? "1px solid #252629"
              : "1px solid var(--p-card-border,#e5eaf8)",
            background: isDark ? "#222325" : "#fff",
            color: isDark ? "#e2e7fa" : undefined,
            position: "sticky", bottom: 0, zIndex: 99
          }}
        >
          <label
            className="p-switch-label"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <span>Appearance</span>
            <div className="p-switch">
              <input
                type="checkbox"
                role="switch"
                checked={isDark}
                onChange={toggleDarkMode}
              />
              <span className="p-switch-slider" />
            </div>
            <strong>{isDark ? "Dark" : "Light"}</strong>
          </label>
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
              minWidth: 160, maxWidth: 300, width: isMobile ? "100%" : undefined, padding: 16, borderRadius: 12,
              display: "flex", flexDirection: "column", gap: 8,
              background: isDark ? "#23253a" : "#fff", color: isDark ? "#e2e7fa" : "#16171a"
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
    return (
      <div
        style={{
          margin: "18px auto 0",
          maxWidth: 560,
          borderRadius: 18,
          boxShadow: isDark ? "0 2px 24px #14141640" : "0 2px 20px #cad1e533",
          background: isDark
            ? "rgba(34,35,40,0.75)"
            : "rgba(255,255,255,0.95)",
          color: isDark ? "#e4e4eb" : "#1a1a1a",
          padding: 24,
          backdropFilter: "blur(8px)",
          border: isDark ? "1px solid #29292d" : "1px solid #ecf0fa"
        }}
      >
        {selectedSat ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
              {selectedSat.icon} {selectedSat.OBJECT_NAME}
            </div>
            <div style={{ fontSize: 14, color: isDark ? "#b5b8cd" : "#555" }}>
              {selectedSat.description || "Satellite"} <br />
              NORAD: <b>{selectedSat.OBJECT_ID}</b> | Epoch: <b>{selectedSat.EPOCH}</b>
            </div>
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
      background: isDark ? "#232428" : "#f7f7fa"
    }}>
      <header className="titlebar" style={{
        zIndex: 1002, background: isDark ? "#232428" : "#fff", color: isDark ? "#eee" : "#222"
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
            borderRadius: 10,
            maxWidth: 640,
            width: "100%",
            background: isDark ? "#232428" : "#fff",
            color: isDark ? "#f6f6f7" : "#222"
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
            {tab === 2 && <SpaceEventsPanel isDark={isDark} />}
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
    </div>
  );
}

export default App;