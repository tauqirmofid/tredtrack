"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { CityWithDistance } from "@/lib/geo";

interface Props {
  distanceKm: number;
  startLat?: number;
  startLon?: number;
  /** Cities sorted by distance from start — become the path waypoints */
  cities?: CityWithDistance[];
}

// ─── Mercator helpers ────────────────────────────────────────────────────────

function mercX(lon: number) { return (lon + 180) / 360; }
function mercY(lat: number) {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
}

function project(
  lat: number, lon: number,
  cLat: number, cLon: number,
  zoom: number, w: number, h: number,
  panX = 0, panY = 0
): [number, number] {
  const scale = Math.pow(2, zoom) * 256;
  const px = (mercX(lon) - mercX(cLon)) * scale + w / 2 + panX;
  const py = (mercY(lat) - mercY(cLat)) * scale + h / 2 + panY;
  return [px, py];
}

/** Pick zoom so that radiusKm fits in halfPx pixels */
function zoomForRadius(radiusKm: number, halfPx: number, lat: number): number {
  const mpdLon = 111320 * Math.cos((lat * Math.PI) / 180);
  const degLon = (radiusKm * 1000) / mpdLon;
  const z = Math.log2(halfPx / (degLon / 360 * 256));
  return Math.max(2, Math.min(14, z));
}

// ─── Path interpolation ──────────────────────────────────────────────────────

interface Waypoint {
  lat: number;
  lon: number;
  km: number;
  city?: CityWithDistance;
}

function buildWaypoints(startLat: number, startLon: number, cities: CityWithDistance[]): Waypoint[] {
  const wps: Waypoint[] = [{ lat: startLat, lon: startLon, km: 0 }];
  for (const c of cities) {
    if (c.distance > wps[wps.length - 1].km) {
      wps.push({ lat: c.lat, lon: c.lon, km: c.distance, city: c });
    }
  }
  return wps;
}

function runnerPosition(wps: Waypoint[], totalKm: number): [number, number] {
  if (wps.length === 0) return [0, 0];
  if (totalKm <= 0) return [wps[0].lat, wps[0].lon];
  const last = wps[wps.length - 1];
  if (totalKm >= last.km) return [last.lat, last.lon];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    if (totalKm >= a.km && totalKm <= b.km) {
      const t = Math.min(1, Math.max(0, (totalKm - a.km) / (b.km - a.km)));
      return [a.lat + (b.lat - a.lat) * t, a.lon + (b.lon - a.lon) * t];
    }
  }
  return [wps[0].lat, wps[0].lon];
}

// ─── Background ──────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, zoom: number, cLat: number, cLon: number) {
  ctx.fillStyle = "#0a1520";
  ctx.fillRect(0, 0, w, h);

  const scale = Math.pow(2, zoom) * 256;
  const step = zoom < 4 ? 30 : zoom < 7 ? 15 : zoom < 10 ? 5 : 1;
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  for (let lon = -180; lon <= 180; lon += step) {
    const px = (mercX(lon) - mercX(cLon)) * scale + w / 2;
    if (px < -2 || px > w + 2) continue;
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
  }
  for (let lat = -80; lat <= 80; lat += step) {
    const py = (mercY(lat) - mercY(cLat)) * scale + h / 2;
    if (py < -2 || py > h + 2) continue;
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
  }

  // Rough land blobs
  const lands = [
    { lats: [36, 71] as [number, number], lons: [-10, 40] as [number, number] },
    { lats: [-35, 37] as [number, number], lons: [-18, 51] as [number, number] },
    { lats: [10, 72] as [number, number], lons: [40, 145] as [number, number] },
    { lats: [15, 72] as [number, number], lons: [-168, -52] as [number, number] },
    { lats: [-55, 12] as [number, number], lons: [-82, -34] as [number, number] },
    { lats: [-44, -10] as [number, number], lons: [113, 154] as [number, number] },
  ];
  ctx.fillStyle = "rgba(22,44,30,0.55)";
  lands.forEach(({ lats, lons }) => {
    const x1 = (mercX(lons[0]) - mercX(cLon)) * scale + w / 2;
    const x2 = (mercX(lons[1]) - mercX(cLon)) * scale + w / 2;
    const y1 = (mercY(lats[1]) - mercY(cLat)) * scale + h / 2;
    const y2 = (mercY(lats[0]) - mercY(cLat)) * scale + h / 2;
    if (x2 < -80 || x1 > w + 80 || y2 < -80 || y1 > h + 80) return;
    const rw = x2 - x1, rh = y2 - y1;
    ctx.beginPath();
    ctx.roundRect(x1, y1, rw, rh, Math.min(12, Math.abs(rw * 0.08), Math.abs(rh * 0.08)));
    ctx.fill();
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JourneyMap({ distanceKm, startLat = 24.89, startLon = 91.87, cities = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastPt = useRef({ x: 0, y: 0 });

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [pulse, setPulse] = useState(0);
  const [tooltip, setTooltip] = useState<{ name: string; sub: string; x: number; y: number } | null>(null);

  // Only show last 3 passed + next 10 upcoming cities as path waypoints
  const pathCities = (() => {
    const passed = cities.filter(c => c.distance <= distanceKm).slice(-3);
    const upcoming = cities.filter(c => c.distance > distanceKm).slice(0, 10);
    return [...passed, ...upcoming];
  })();

  const wps = buildWaypoints(startLat, startLon, pathCities);
  const [runLat, runLon] = runnerPosition(wps, distanceKm);
  const nextCity = pathCities.find(c => c.distance > distanceKm) ?? null;

  // Zoom computed per-frame inside draw() so we always have real canvas dimensions
  const zoomRef = useRef(8);
  function computeZoom(h: number): number {
    if (nextCity) {
      const dlat = Math.abs(nextCity.lat - runLat);
      const dlon = Math.abs(nextCity.lon - runLon);
      const degMax = Math.max(dlat, dlon, 0.02) * 2.0;
      return zoomForRadius((degMax * 111320) / 1000, h * 0.38, runLat);
    }
    return zoomForRadius(Math.max(distanceKm * 1.5, 3), h * 0.38, runLat);
  }

  useEffect(() => { setPan({ x: 0, y: 0 }); }, [distanceKm]);

  useEffect(() => {
    let id: number, t = 0;
    const tick = () => { t += 0.06; setPulse(t); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth, h = container.clientHeight;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const zoom = computeZoom(h);
    zoomRef.current = zoom;

    const proj = (lat: number, lon: number): [number, number] =>
      project(lat, lon, runLat, runLon, zoom, w, h, pan.x, pan.y);

    // Background: offset centre by pan
    const lonPerPx = 360 / (Math.pow(2, zoom) * 256);
    drawBackground(ctx, w, h, zoom, runLat, runLon - pan.x * lonPerPx);

    // ── Upcoming dashed path ──
    if (wps.length > 1) {
      const splitIdx = wps.findIndex(wp => wp.km > distanceKm);
      if (splitIdx !== -1) {
        ctx.beginPath();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = "rgba(74,96,112,0.55)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        const [rx0, ry0] = proj(runLat, runLon);
        ctx.moveTo(rx0, ry0);
        for (let i = splitIdx; i < wps.length; i++) {
          const [px, py] = proj(wps[i].lat, wps[i].lon);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── Traveled path ──
    if (distanceKm > 0.02 && wps.length > 1) {
      const pts: [number, number][] = [proj(wps[0].lat, wps[0].lon)];
      for (let i = 1; i < wps.length; i++) {
        if (wps[i].km >= distanceKm) { pts.push(proj(runLat, runLon)); break; }
        pts.push(proj(wps[i].lat, wps[i].lon));
      }
      if (pts.length === 1) pts.push(proj(runLat, runLon));

      // Glow
      ctx.beginPath(); ctx.strokeStyle = "rgba(48,209,88,0.18)"; ctx.lineWidth = 11;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.moveTo(...pts[0]); pts.slice(1).forEach(p => ctx.lineTo(...p)); ctx.stroke();
      // Line
      ctx.beginPath(); ctx.strokeStyle = "rgba(48,209,88,0.85)"; ctx.lineWidth = 3;
      ctx.moveTo(...pts[0]); pts.slice(1).forEach(p => ctx.lineTo(...p)); ctx.stroke();
    }

    // ── City dots ──
    const EDGE = 28;
    const offscreen: CityWithDistance[] = [];
    pathCities.forEach(city => {
      const passed = city.distance <= distanceKm;
      const isNext = city === nextCity;
      const [cx, cy] = proj(city.lat, city.lon);
      const onScreen = cx > EDGE && cx < w - EDGE && cy > EDGE && cy < h - EDGE;

      if (onScreen) {
        const sz = city.type === "capital" || city.type === "metro" ? 5.5 : city.type === "landmark" ? 6 : 4;
        const color = passed ? "#30d158" : isNext ? "#0a84ff" : "#4a6070";
        ctx.beginPath(); ctx.arc(cx, cy, sz, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        if (isNext) { ctx.strokeStyle = "rgba(10,132,255,0.4)"; ctx.lineWidth = 4; ctx.stroke(); }

        ctx.font = `${isNext ? "bold " : ""}${zoom > 9 ? 11 : 10}px -apple-system, sans-serif`;
        ctx.fillStyle = passed ? "rgba(48,209,88,0.85)" : isNext ? "rgba(120,185,255,0.95)" : "rgba(155,180,200,0.75)";
        ctx.textAlign = "left";
        ctx.fillText(city.name, cx + sz + 3, cy + 4);
      } else if (!passed) {
        offscreen.push(city);
      }
    });

    // ── Off-screen city arrows (max 3) ──
    offscreen.slice(0, 3).forEach(city => {
      const isNext = city === nextCity;
      const [cx, cy] = proj(city.lat, city.lon);
      const angle = Math.atan2(cy - h / 2, cx - w / 2);
      const EM = 22;
      const ex = Math.max(EM, Math.min(w - EM, w / 2 + Math.cos(angle) * (w / 2 - EM)));
      const ey = Math.max(EM, Math.min(h - EM, h / 2 + Math.sin(angle) * (h / 2 - EM)));

      const kmAway = (city.distance - distanceKm).toFixed(1);
      const label = `${city.name}  ${kmAway} km`;
      ctx.font = `${isNext ? "bold " : ""}10px -apple-system, sans-serif`;
      const tw = ctx.measureText(label).width;
      const pw = tw + 26, ph = 22;
      let px = ex - pw / 2, py = ey - ph / 2;
      px = Math.max(4, Math.min(w - pw - 4, px));
      py = Math.max(4, Math.min(h - ph - 4, py));

      ctx.fillStyle = isNext ? "rgba(8,50,80,0.92)" : "rgba(18,26,34,0.88)";
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 11); ctx.fill();
      ctx.strokeStyle = isNext ? "rgba(10,132,255,0.5)" : "rgba(74,96,112,0.4)";
      ctx.lineWidth = 1; ctx.stroke();

      ctx.save();
      ctx.translate(px + 11, py + ph / 2);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath();
      ctx.fillStyle = isNext ? "#0a84ff" : "#4a6070"; ctx.fill();
      ctx.restore();

      ctx.fillStyle = isNext ? "rgba(120,185,255,0.95)" : "rgba(155,180,200,0.85)";
      ctx.textAlign = "left";
      ctx.fillText(label, px + 20, py + ph / 2 + 3.5);
    });

    // ── Start dot ──
    const [sx, sy] = proj(startLat, startLon);
    if (sx > -20 && sx < w + 20 && sy > -20 && sy < h + 20) {
      ctx.beginPath(); ctx.arc(sx, sy, 9 + 3 * Math.sin(pulse), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,159,10,0.12)"; ctx.fill();
      ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff9f0a"; ctx.fill();
      ctx.strokeStyle = "rgba(255,159,10,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = "9px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,159,10,0.75)";
      ctx.textAlign = "center"; ctx.fillText("START", sx, sy - 11); ctx.textAlign = "left";
    }

    // ── Runner dot ──
    const [rx, ry] = proj(runLat, runLon);
    const p1 = 13 + 5 * Math.sin(pulse * 1.3);
    ctx.beginPath(); ctx.arc(rx, ry, p1, 0, Math.PI * 2); ctx.fillStyle = "rgba(48,209,88,0.1)"; ctx.fill();
    ctx.beginPath(); ctx.arc(rx, ry, p1 * 0.55, 0, Math.PI * 2); ctx.fillStyle = "rgba(48,209,88,0.2)"; ctx.fill();
    ctx.beginPath(); ctx.arc(rx, ry, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#30d158"; ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "bold 10px -apple-system, sans-serif";
    ctx.fillStyle = "white"; ctx.textAlign = "center";
    ctx.fillText("YOU", rx, ry - 17);
    if (distanceKm >= 0.01) {
      ctx.font = "10px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(48,209,88,0.85)";
      ctx.fillText(`${distanceKm.toFixed(2)} km`, rx, ry + 20);
    }
    ctx.textAlign = "left";

    // ── Scale bar ──
    const scalePx = 70;
    const mpp = (40075016 * Math.cos((runLat * Math.PI) / 180)) / (Math.pow(2, zoom) * 256);
    const scaleKm = (mpp * scalePx) / 1000;
    const scaleLabel = scaleKm >= 1 ? `${scaleKm.toFixed(0)} km` : `${(scaleKm * 1000).toFixed(0)} m`;
    const sbX = w - 86, sbY = h - 22;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.beginPath(); ctx.roundRect(sbX - 4, sbY - 13, scalePx + 10, 20, 4); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sbX, sbY); ctx.lineTo(sbX + scalePx, sbY);
    ctx.moveTo(sbX, sbY - 4); ctx.lineTo(sbX, sbY + 4);
    ctx.moveTo(sbX + scalePx, sbY - 4); ctx.lineTo(sbX + scalePx, sbY + 4);
    ctx.stroke();
    ctx.font = "9px -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.textAlign = "center"; ctx.fillText(scaleLabel, sbX + scalePx / 2, sbY - 5); ctx.textAlign = "left";
  }, [distanceKm, startLat, startLon, runLat, runLon, pathCities, wps, nextCity, pan, pulse]);

  useEffect(() => { draw(); }, [draw]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastPt.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setTooltip(null);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPt.current.x, dy = e.clientY - lastPt.current.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    if (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const tapX = e.clientX - rect.left, tapY = e.clientY - rect.top;
    const w = container.clientWidth, h = container.clientHeight;
    for (const city of pathCities) {
      const [cx, cy] = project(city.lat, city.lon, runLat, runLon, zoomRef.current, w, h, pan.x, pan.y);
      if (Math.hypot(tapX - cx, tapY - cy) < 18) {
        setTooltip({ name: city.name, sub: `${city.country} · ${city.distance.toFixed(1)} km from start`, x: cx, y: cy });
        return;
      }
    }
    setTooltip(null);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "inherit" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", touchAction: "none", cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      {tooltip && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 300) - 170),
          top: Math.max(6, tooltip.y - 54),
          background: "rgba(22,22,24,0.95)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, padding: "6px 10px", pointerEvents: "none", backdropFilter: "blur(10px)",
        }}>
          <p style={{ color: "#f5f5f7", fontWeight: 600, fontSize: 12, margin: 0 }}>{tooltip.name}</p>
          <p style={{ color: "#8e8e93", fontSize: 10, margin: "2px 0 0" }}>{tooltip.sub}</p>
        </div>
      )}
      {(pan.x !== 0 || pan.y !== 0) && (
        <button onClick={() => setPan({ x: 0, y: 0 })} style={{
          position: "absolute", bottom: 40, right: 10,
          background: "rgba(22,22,24,0.88)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 9, padding: "6px 10px", color: "#30d158",
          fontSize: 11, fontWeight: 600, backdropFilter: "blur(8px)", cursor: "pointer",
        }}>
          Re-center
        </button>
      )}
    </div>
  );
}
