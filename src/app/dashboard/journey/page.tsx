"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  ChevronRight,
  Lock,
  Trophy,
  Star,
  Loader2,
  Flag,
  ArrowRight,
  Globe2,
} from "lucide-react";
import { getCitiesFromLocation, getJourneyState, motivationalMessage } from "@/lib/geo";
import type { CityWithDistance, JourneyState } from "@/lib/geo";

interface JourneyMapProps {
  distanceKm: number;
  startLat?: number;
  startLon?: number;
  cities?: CityWithDistance[];
}

const JourneyMap = dynamic<JourneyMapProps>(() => import("@/components/JourneyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin" style={{ color: "#30d158" }} />
    </div>
  ),
});

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
}

interface Stats {
  totalDistance: number;
}

const MILESTONE_BADGES = [
  { km: 1, label: "First Step", icon: Flag },
  { km: 5, label: "5K Runner", icon: Star },
  { km: 10, label: "10K Club", icon: Star },
  { km: 21.1, label: "Half Marathon", icon: Trophy },
  { km: 42.2, label: "Full Marathon", icon: Trophy },
  { km: 100, label: "Century", icon: Trophy },
  { km: 500, label: "500 km", icon: Globe2 },
  { km: 1000, label: "1,000 km", icon: Globe2 },
  { km: 5000, label: "5,000 km", icon: Globe2 },
];

export default function JourneyPage() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [cities, setCities] = useState<CityWithDistance[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/user/location").then((r) => r.json()), fetch("/api/stats").then((r) => r.json())]).then(
      ([loc, st]) => {
        setLocation(loc);
        setStats(st);
        if (loc?.latitude && loc?.longitude) {
          const c = getCitiesFromLocation(loc.latitude, loc.longitude);
          setCities(c);
          setJourney(getJourneyState(loc.latitude, loc.longitude, st.totalDistance ?? 0));
        }
        setLoading(false);
      }
    );
  }, []);

  async function requestLocation() {
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode with Nominatim (free, no key)
        let city = null;
        let country = null;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || null;
          country = data.address?.country || null;
        } catch {
          // ignore geocoding errors
        }
        await fetch("/api/user/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, city, country }),
        });
        const newLoc = { latitude, longitude, city, country };
        setLocation(newLoc);
        const c = getCitiesFromLocation(latitude, longitude);
        setCities(c);
        setJourney(getJourneyState(latitude, longitude, stats?.totalDistance ?? 0));
        setLocLoading(false);
      },
      (err) => {
        setLocError(err.code === 1 ? "Location permission denied. Please enable it in browser settings." : "Could not get location.");
        setLocLoading(false);
      },
      { timeout: 10000 }
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: "#30d158" }} />
      </div>
    );
  }

  const totalKm = stats?.totalDistance ?? 0;

  return (
    <div className="px-4 pt-14 pb-4">
      {/* Header */}
      <div className="mb-6 fade-in-up">
        <h1 className="text-2xl font-bold" style={{ color: "#f5f5f7" }}>Your Journey</h1>
        <p className="text-sm mt-1" style={{ color: "#8e8e93" }}>
          Every run moves you further in the real world
        </p>
      </div>

      {/* Location prompt */}
      {!location?.latitude && (
        <div
          className="card p-5 mb-4 fade-in-up"
          style={{ border: "1px solid rgba(10,132,255,0.35)", background: "rgba(10,132,255,0.06)" }}>
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(10,132,255,0.15)" }}>
              <MapPin size={20} style={{ color: "#0a84ff" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1" style={{ color: "#f5f5f7" }}>Set your starting point</p>
              <p className="text-sm mb-3" style={{ color: "#8e8e93" }}>
                Share your location once so we can show you which real-world cities your runs could take you to.
              </p>
              {locError && (
                <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,69,58,0.12)", color: "#ff453a" }}>
                  {locError}
                </p>
              )}
              <button
                onClick={requestLocation}
                disabled={locLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: "#0a84ff", color: "white" }}>
                {locLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Navigation size={15} />
                )}
                {locLoading ? "Getting location…" : "Share Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Starting point badge */}
      {location?.latitude && (
        <div className="flex items-center gap-2 mb-4 fade-in-up px-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#ff9f0a" }} />
          <p className="text-sm" style={{ color: "#8e8e93" }}>
            Started from{" "}
            <span style={{ color: "#f5f5f7", fontWeight: 600 }}>
              {location.city ?? "your location"}{location.country ? `, ${location.country}` : ""}
            </span>
          </p>
        </div>
      )}

      <div
        className="card overflow-hidden mb-4 fade-in-up"
        style={{ height: 300, border: "1px solid rgba(48,209,88,0.15)" }}>
        <JourneyMap
          distanceKm={totalKm}
          startLat={location?.latitude ?? 24.89}
          startLon={location?.longitude ?? 91.87}
          cities={cities.slice(0, 60)}
        />
      </div>

      {/* Map legend */}
      <div className="flex items-center gap-4 mb-5 px-1 fade-in-up flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff9f0a" }} />
          <span className="text-xs" style={{ color: "#8e8e93" }}>Start</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#30d158" }} />
          <span className="text-xs" style={{ color: "#8e8e93" }}>You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffd60a" }} />
          <span className="text-xs" style={{ color: "#8e8e93" }}>Landmark</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4a6070" }} />
          <span className="text-xs" style={{ color: "#8e8e93" }}>City ahead</span>
        </div>
        <span className="text-xs" style={{ color: "#636366" }}>Drag · tap city for info</span>
      </div>

      {/* Current position narrative */}
      {location?.latitude && journey && (
        <div
          className="card p-5 mb-4 fade-in-up"
          style={{
            background: "linear-gradient(135deg, #0f2a1a, #0a1e12)",
            border: "1px solid rgba(48,209,88,0.25)",
            animationDelay: "0.1s",
          }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#30d158" }}>
            Current Position
          </p>
          {totalKm < 0.5 ? (
            <>
              <p className="text-lg font-bold mb-1" style={{ color: "#f5f5f7" }}>
                {location.city ?? "Your Starting Point"}
              </p>
              <p className="text-sm" style={{ color: "#8e8e93" }}>
                You haven&apos;t left yet — your first run is waiting.
              </p>
            </>
          ) : journey.current ? (
            <>
              <p className="text-lg font-bold mb-1" style={{ color: "#f5f5f7" }}>
                Near {journey.current.name}
              </p>
              <p className="text-sm" style={{ color: "#8e8e93" }}>
                {journey.current.country} · {journey.current.distance} km from home
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold mb-1" style={{ color: "#f5f5f7" }}>
                Approaching {journey.next?.name ?? "the next city"}
              </p>
              <p className="text-sm" style={{ color: "#8e8e93" }}>
                {(journey.next?.distance ?? 0) - totalKm} km to {journey.next?.name}
              </p>
            </>
          )}
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-2xl font-bold" style={{ color: "#f5f5f7" }}>{totalKm.toFixed(2)}</span>
            <span className="text-sm" style={{ color: "#8e8e93" }}>km total</span>
          </div>
          <p className="text-xs mt-2" style={{ color: "#636366" }}>
            {motivationalMessage(totalKm, journey.next)}
          </p>
        </div>
      )}

      {/* Next destination */}
      {location?.latitude && journey?.next && (
        <div className="card p-5 mb-4 fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#8e8e93" }}>
                Next Stop
              </p>
              <p className="text-base font-bold" style={{ color: "#f5f5f7" }}>
                {journey.next.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#8e8e93" }}>{journey.next.country}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold" style={{ color: "#0a84ff" }}>
                {(journey.next.distance - totalKm).toFixed(1)}
              </p>
              <p className="text-xs" style={{ color: "#8e8e93" }}>km to go</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "#2c2c2e" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round(journey.progressToNext * 100)}%`,
                background: "linear-gradient(90deg, #0a84ff, #30d158)",
              }}
            />
          </div>
          <p className="text-xs" style={{ color: "#8e8e93" }}>
            {Math.round(journey.progressToNext * 100)}% there
          </p>
        </div>
      )}

      {/* Upcoming cities */}
      {location?.latitude && journey && journey.upcoming.length > 0 && (
        <div className="card overflow-hidden mb-4 fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #2c2c2e" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8e8e93" }}>
              Cities Ahead
            </p>
          </div>
          {journey.upcoming.slice(0, 6).map((city, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: i < 5 ? "1px solid #1c1c1e" : undefined }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "#2c2c2e" }}>
                  <ArrowRight size={13} style={{ color: "#8e8e93" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{city.name}</p>
                  <p className="text-xs" style={{ color: "#636366" }}>{city.country}</p>
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ color: "#8e8e93" }}>
                {(city.distance - totalKm).toFixed(0)} km
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Cities you've passed */}
      {location?.latitude && journey && journey.passed.length > 0 && (
        <div className="card overflow-hidden mb-4 fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #2c2c2e" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8e8e93" }}>
              Cities Passed
              <span
                className="ml-2 px-1.5 py-0.5 rounded-md text-xs"
                style={{ background: "rgba(48,209,88,0.15)", color: "#30d158" }}>
                {journey.passed.length}
              </span>
            </p>
          </div>
          {[...journey.passed].reverse().slice(0, 5).map((city, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: i < 4 ? "1px solid #1c1c1e" : undefined }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(48,209,88,0.12)" }}>
                  <ChevronRight size={13} style={{ color: "#30d158" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#f5f5f7" }}>{city.name}</p>
                  <p className="text-xs" style={{ color: "#636366" }}>{city.country}</p>
                </div>
              </div>
              <p className="text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(48,209,88,0.12)", color: "#30d158" }}>
                {city.distance} km
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Running milestones */}
      <div className="card overflow-hidden fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #2c2c2e" }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8e8e93" }}>
            Running Milestones
          </p>
        </div>
        {MILESTONE_BADGES.map((m, i) => {
          const Icon = m.icon;
          const unlocked = totalKm >= m.km;
          const progress = Math.min(totalKm / m.km, 1);
          return (
            <div
              key={m.km}
              className="px-4 py-3.5 flex items-center gap-3"
              style={{ borderBottom: i < MILESTONE_BADGES.length - 1 ? "1px solid #1c1c1e" : undefined }}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: unlocked ? "rgba(48,209,88,0.15)" : "#2c2c2e",
                  border: `1.5px solid ${unlocked ? "#30d158" : "#3a3a3c"}`,
                }}>
                {unlocked ? (
                  <Icon size={16} style={{ color: "#30d158" }} />
                ) : (
                  <Lock size={14} style={{ color: "#636366" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium" style={{ color: unlocked ? "#f5f5f7" : "#636366" }}>
                    {m.label}
                  </p>
                  <p className="text-xs" style={{ color: "#8e8e93" }}>{m.km} km</p>
                </div>
                {!unlocked && (
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "#2c2c2e" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${progress * 100}%`, background: "#3a3a3c" }}
                    />
                  </div>
                )}
              </div>
              {unlocked && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
                  style={{ background: "rgba(48,209,88,0.12)", color: "#30d158" }}>
                  Done
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
