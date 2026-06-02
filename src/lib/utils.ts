export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function parseDuration(str: string): number {
  // Accepts HH:MM:SS or MM:SS
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export function calcAvgSpeed(distanceKm: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0;
  return Math.round((distanceKm / (durationSeconds / 3600)) * 10) / 10;
}

export function calcCalories(distanceKm: number, weightKg = 70): number {
  return Math.round(distanceKm * weightKg * 1.036);
}

export function formatDistance(km: number): string {
  if (km >= 1) return `${km.toFixed(2)} km`;
  return `${(km * 1000).toFixed(0)} m`;
}

export function totalDistanceLabel(km: number): { city: string; description: string } {
  if (km < 5) return { city: "Your Neighborhood", description: "Keep going, you've just started!" };
  if (km < 42) return { city: "Across Town", description: "You've run a city marathon distance!" };
  if (km < 100) return { city: "Next City", description: "You could have reached the next city!" };
  if (km < 500) return { city: "Cross-Country", description: "You're crossing the country!" };
  if (km < 2000) return { city: "Cross-Continent", description: "You're running across a continent!" };
  return { city: "Around the World", description: "You're circling the globe!" };
}
