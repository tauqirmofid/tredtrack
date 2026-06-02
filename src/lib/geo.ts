export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  type: "landmark" | "city" | "capital" | "metro";
}

export interface CityWithDistance extends City {
  distance: number;
}

export const WORLD_CITIES: City[] = [
  // Bangladesh
  { name: "Sunamganj", country: "Bangladesh", lat: 24.8839, lon: 91.3948, type: "city" },
  { name: "Moulvibazar", country: "Bangladesh", lat: 24.4829, lon: 91.7755, type: "city" },
  { name: "Habiganj", country: "Bangladesh", lat: 24.3745, lon: 91.4152, type: "city" },
  { name: "Jaflong", country: "Bangladesh", lat: 25.1620, lon: 92.0349, type: "landmark" },
  { name: "Srimangal", country: "Bangladesh", lat: 24.3092, lon: 91.7279, type: "city" },
  { name: "Kishoreganj", country: "Bangladesh", lat: 24.4446, lon: 90.7767, type: "city" },
  { name: "Mymensingh", country: "Bangladesh", lat: 24.7471, lon: 90.4203, type: "city" },
  { name: "Tangail", country: "Bangladesh", lat: 24.2513, lon: 89.9167, type: "city" },
  { name: "Gazipur", country: "Bangladesh", lat: 23.9999, lon: 90.4203, type: "city" },
  { name: "Dhaka", country: "Bangladesh", lat: 23.8103, lon: 90.4125, type: "capital" },
  { name: "Narayanganj", country: "Bangladesh", lat: 23.6238, lon: 90.4997, type: "city" },
  { name: "Comilla", country: "Bangladesh", lat: 23.4607, lon: 91.1809, type: "city" },
  { name: "Chittagong", country: "Bangladesh", lat: 22.3569, lon: 91.7832, type: "metro" },
  { name: "Cox's Bazar", country: "Bangladesh", lat: 21.4272, lon: 92.0058, type: "landmark" },
  { name: "Rajshahi", country: "Bangladesh", lat: 24.3636, lon: 88.6241, type: "city" },
  { name: "Khulna", country: "Bangladesh", lat: 22.8456, lon: 89.5403, type: "city" },
  { name: "Barisal", country: "Bangladesh", lat: 22.7010, lon: 90.3535, type: "city" },
  // India - Northeast
  { name: "Agartala", country: "India", lat: 23.8315, lon: 91.2868, type: "capital" },
  { name: "Shillong", country: "India", lat: 25.5788, lon: 91.8933, type: "capital" },
  { name: "Guwahati", country: "India", lat: 26.1445, lon: 91.7362, type: "metro" },
  { name: "Imphal", country: "India", lat: 24.8170, lon: 93.9368, type: "capital" },
  { name: "Silchar", country: "India", lat: 24.8232, lon: 92.7789, type: "city" },
  // India - Major
  { name: "Kolkata", country: "India", lat: 22.5726, lon: 88.3639, type: "metro" },
  { name: "Patna", country: "India", lat: 25.5941, lon: 85.1376, type: "capital" },
  { name: "Varanasi", country: "India", lat: 25.3176, lon: 82.9739, type: "landmark" },
  { name: "New Delhi", country: "India", lat: 28.6139, lon: 77.2090, type: "capital" },
  { name: "Mumbai", country: "India", lat: 19.0760, lon: 72.8777, type: "metro" },
  { name: "Bangalore", country: "India", lat: 12.9716, lon: 77.5946, type: "metro" },
  { name: "Chennai", country: "India", lat: 13.0827, lon: 80.2707, type: "metro" },
  { name: "Hyderabad", country: "India", lat: 17.3850, lon: 78.4867, type: "metro" },
  { name: "Agra", country: "India", lat: 27.1767, lon: 78.0081, type: "landmark" },
  { name: "Lucknow", country: "India", lat: 26.8467, lon: 80.9462, type: "capital" },
  { name: "Ahmedabad", country: "India", lat: 23.0225, lon: 72.5714, type: "metro" },
  { name: "Jaipur", country: "India", lat: 26.9124, lon: 75.7873, type: "capital" },
  { name: "Chandigarh", country: "India", lat: 30.7333, lon: 76.7794, type: "capital" },
  { name: "Srinagar", country: "India", lat: 34.0837, lon: 74.7973, type: "capital" },
  // Nepal / Bhutan / Myanmar / Sri Lanka
  { name: "Kathmandu", country: "Nepal", lat: 27.7172, lon: 85.3240, type: "capital" },
  { name: "Thimphu", country: "Bhutan", lat: 27.4728, lon: 89.6393, type: "capital" },
  { name: "Yangon", country: "Myanmar", lat: 16.8661, lon: 96.1951, type: "metro" },
  { name: "Naypyidaw", country: "Myanmar", lat: 19.7633, lon: 96.0785, type: "capital" },
  { name: "Colombo", country: "Sri Lanka", lat: 6.9271, lon: 79.8612, type: "capital" },
  { name: "Mount Everest Base Camp", country: "Nepal", lat: 28.0026, lon: 86.8528, type: "landmark" },
  // Pakistan
  { name: "Karachi", country: "Pakistan", lat: 24.8607, lon: 67.0011, type: "metro" },
  { name: "Lahore", country: "Pakistan", lat: 31.5204, lon: 74.3587, type: "metro" },
  { name: "Islamabad", country: "Pakistan", lat: 33.6844, lon: 73.0479, type: "capital" },
  // Southeast Asia
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lon: 100.5018, type: "capital" },
  { name: "Chiang Mai", country: "Thailand", lat: 18.7883, lon: 98.9853, type: "city" },
  { name: "Hanoi", country: "Vietnam", lat: 21.0278, lon: 105.8342, type: "capital" },
  { name: "Ho Chi Minh City", country: "Vietnam", lat: 10.8231, lon: 106.6297, type: "metro" },
  { name: "Kuala Lumpur", country: "Malaysia", lat: 3.1390, lon: 101.6869, type: "capital" },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198, type: "capital" },
  { name: "Jakarta", country: "Indonesia", lat: -6.2088, lon: 106.8456, type: "capital" },
  { name: "Manila", country: "Philippines", lat: 14.5995, lon: 120.9842, type: "capital" },
  { name: "Phnom Penh", country: "Cambodia", lat: 11.5564, lon: 104.9282, type: "capital" },
  { name: "Angkor Wat", country: "Cambodia", lat: 13.4125, lon: 103.8670, type: "landmark" },
  { name: "Vientiane", country: "Laos", lat: 17.9757, lon: 102.6331, type: "capital" },
  // East Asia
  { name: "Kunming", country: "China", lat: 25.0389, lon: 102.7183, type: "city" },
  { name: "Chengdu", country: "China", lat: 30.5728, lon: 104.0668, type: "metro" },
  { name: "Chongqing", country: "China", lat: 29.4316, lon: 106.9123, type: "metro" },
  { name: "Beijing", country: "China", lat: 39.9042, lon: 116.4074, type: "capital" },
  { name: "Shanghai", country: "China", lat: 31.2304, lon: 121.4737, type: "metro" },
  { name: "Hong Kong", country: "China", lat: 22.3193, lon: 114.1694, type: "metro" },
  { name: "Guangzhou", country: "China", lat: 23.1291, lon: 113.2644, type: "metro" },
  { name: "Great Wall of China", country: "China", lat: 40.4319, lon: 116.5704, type: "landmark" },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, type: "capital" },
  { name: "Osaka", country: "Japan", lat: 34.6937, lon: 135.5023, type: "metro" },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lon: 126.9780, type: "capital" },
  { name: "Taipei", country: "Taiwan", lat: 25.0330, lon: 121.5654, type: "capital" },
  { name: "Ulaanbaatar", country: "Mongolia", lat: 47.8864, lon: 106.9057, type: "capital" },
  // Central Asia / Middle East
  { name: "Kabul", country: "Afghanistan", lat: 34.5553, lon: 69.2075, type: "capital" },
  { name: "Tehran", country: "Iran", lat: 35.6892, lon: 51.3890, type: "capital" },
  { name: "Baghdad", country: "Iraq", lat: 33.3152, lon: 44.3661, type: "capital" },
  { name: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, type: "metro" },
  { name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lon: 46.6753, type: "capital" },
  { name: "Jerusalem", country: "Israel", lat: 31.7683, lon: 35.2137, type: "landmark" },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784, type: "metro" },
  { name: "Ankara", country: "Turkey", lat: 39.9334, lon: 32.8597, type: "capital" },
  { name: "Tashkent", country: "Uzbekistan", lat: 41.2995, lon: 69.2401, type: "capital" },
  { name: "Almaty", country: "Kazakhstan", lat: 43.2220, lon: 76.8512, type: "metro" },
  { name: "Baku", country: "Azerbaijan", lat: 40.4093, lon: 49.8671, type: "capital" },
  { name: "Tbilisi", country: "Georgia", lat: 41.6938, lon: 44.8015, type: "capital" },
  // Russia
  { name: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6176, type: "capital" },
  { name: "Saint Petersburg", country: "Russia", lat: 59.9311, lon: 30.3609, type: "metro" },
  { name: "Novosibirsk", country: "Russia", lat: 54.9884, lon: 82.9357, type: "city" },
  { name: "Vladivostok", country: "Russia", lat: 43.1332, lon: 131.9113, type: "city" },
  // Europe
  { name: "Warsaw", country: "Poland", lat: 52.2297, lon: 21.0122, type: "capital" },
  { name: "Berlin", country: "Germany", lat: 52.5200, lon: 13.4050, type: "capital" },
  { name: "Vienna", country: "Austria", lat: 48.2082, lon: 16.3738, type: "capital" },
  { name: "Prague", country: "Czech Republic", lat: 50.0755, lon: 14.4378, type: "capital" },
  { name: "Budapest", country: "Hungary", lat: 47.4979, lon: 19.0402, type: "capital" },
  { name: "Bucharest", country: "Romania", lat: 44.4268, lon: 26.1025, type: "capital" },
  { name: "Kyiv", country: "Ukraine", lat: 50.4501, lon: 30.5234, type: "capital" },
  { name: "Athens", country: "Greece", lat: 37.9838, lon: 23.7275, type: "capital" },
  { name: "Colosseum, Rome", country: "Italy", lat: 41.8902, lon: 12.4922, type: "landmark" },
  { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964, type: "capital" },
  { name: "Milan", country: "Italy", lat: 45.4654, lon: 9.1859, type: "metro" },
  { name: "Barcelona", country: "Spain", lat: 41.3851, lon: 2.1734, type: "metro" },
  { name: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038, type: "capital" },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, type: "capital" },
  { name: "Eiffel Tower", country: "France", lat: 48.8584, lon: 2.2945, type: "landmark" },
  { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lon: 4.9041, type: "capital" },
  { name: "Brussels", country: "Belgium", lat: 50.8503, lon: 4.3517, type: "capital" },
  { name: "Zurich", country: "Switzerland", lat: 47.3769, lon: 8.5417, type: "city" },
  { name: "London", country: "UK", lat: 51.5074, lon: -0.1278, type: "capital" },
  { name: "Dublin", country: "Ireland", lat: 53.3498, lon: -6.2603, type: "capital" },
  { name: "Stockholm", country: "Sweden", lat: 59.3293, lon: 18.0686, type: "capital" },
  { name: "Oslo", country: "Norway", lat: 59.9139, lon: 10.7522, type: "capital" },
  { name: "Copenhagen", country: "Denmark", lat: 55.6761, lon: 12.5683, type: "capital" },
  { name: "Helsinki", country: "Finland", lat: 60.1699, lon: 24.9384, type: "capital" },
  { name: "Lisbon", country: "Portugal", lat: 38.7223, lon: -9.1393, type: "capital" },
  // Africa
  { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, type: "capital" },
  { name: "Pyramids of Giza", country: "Egypt", lat: 29.9792, lon: 31.1342, type: "landmark" },
  { name: "Addis Ababa", country: "Ethiopia", lat: 9.0320, lon: 38.7469, type: "capital" },
  { name: "Nairobi", country: "Kenya", lat: -1.2921, lon: 36.8219, type: "capital" },
  { name: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792, type: "metro" },
  { name: "Accra", country: "Ghana", lat: 5.6037, lon: -0.1870, type: "capital" },
  { name: "Dar es Salaam", country: "Tanzania", lat: -6.7924, lon: 39.2083, type: "metro" },
  { name: "Johannesburg", country: "South Africa", lat: -26.2041, lon: 28.0473, type: "metro" },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241, type: "city" },
  { name: "Casablanca", country: "Morocco", lat: 33.5731, lon: -7.5898, type: "metro" },
  // Americas - North
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332, type: "capital" },
  { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832, type: "metro" },
  { name: "Montreal", country: "Canada", lat: 45.5017, lon: -73.5673, type: "metro" },
  { name: "Vancouver", country: "Canada", lat: 49.2827, lon: -123.1207, type: "metro" },
  { name: "New York", country: "USA", lat: 40.7128, lon: -74.0060, type: "metro" },
  { name: "Statue of Liberty", country: "USA", lat: 40.6892, lon: -74.0445, type: "landmark" },
  { name: "Los Angeles", country: "USA", lat: 34.0522, lon: -118.2437, type: "metro" },
  { name: "Chicago", country: "USA", lat: 41.8781, lon: -87.6298, type: "metro" },
  { name: "Houston", country: "USA", lat: 29.7604, lon: -95.3698, type: "metro" },
  { name: "Miami", country: "USA", lat: 25.7617, lon: -80.1918, type: "metro" },
  { name: "San Francisco", country: "USA", lat: 37.7749, lon: -122.4194, type: "metro" },
  { name: "Seattle", country: "USA", lat: 47.6062, lon: -122.3321, type: "metro" },
  { name: "Washington D.C.", country: "USA", lat: 38.9072, lon: -77.0369, type: "capital" },
  { name: "Boston", country: "USA", lat: 42.3601, lon: -71.0589, type: "metro" },
  { name: "Honolulu", country: "USA", lat: 21.3069, lon: -157.8583, type: "city" },
  // Americas - South
  { name: "Bogota", country: "Colombia", lat: 4.7110, lon: -74.0721, type: "capital" },
  { name: "Lima", country: "Peru", lat: -12.0464, lon: -77.0428, type: "capital" },
  { name: "Machu Picchu", country: "Peru", lat: -13.1631, lon: -72.5450, type: "landmark" },
  { name: "Santiago", country: "Chile", lat: -33.4489, lon: -70.6693, type: "capital" },
  { name: "São Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333, type: "metro" },
  { name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lon: -43.1729, type: "metro" },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816, type: "capital" },
  { name: "Caracas", country: "Venezuela", lat: 10.4806, lon: -66.9036, type: "capital" },
  // Oceania
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, type: "metro" },
  { name: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631, type: "metro" },
  { name: "Brisbane", country: "Australia", lat: -27.4698, lon: 153.0251, type: "metro" },
  { name: "Perth", country: "Australia", lat: -31.9505, lon: 115.8605, type: "metro" },
  { name: "Auckland", country: "New Zealand", lat: -36.8509, lon: 174.7645, type: "metro" },
];

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCitiesFromLocation(userLat: number, userLon: number): CityWithDistance[] {
  return WORLD_CITIES.map((c) => ({
    ...c,
    distance: Math.round(haversine(userLat, userLon, c.lat, c.lon)),
  }))
    .filter((c) => c.distance >= 1)
    .sort((a, b) => a.distance - b.distance);
}

export interface JourneyState {
  cities: CityWithDistance[];
  passed: CityWithDistance[];
  upcoming: CityWithDistance[];
  current: CityWithDistance | null;
  next: CityWithDistance | null;
  progressToNext: number; // 0–1
}

export function getJourneyState(
  userLat: number,
  userLon: number,
  totalKm: number
): JourneyState {
  const cities = getCitiesFromLocation(userLat, userLon);
  const passed = cities.filter((c) => c.distance <= totalKm);
  const upcoming = cities.filter((c) => c.distance > totalKm);
  const current = passed[passed.length - 1] ?? null;
  const next = upcoming[0] ?? null;
  const progressToNext =
    next && current
      ? (totalKm - current.distance) / (next.distance - current.distance)
      : next
      ? totalKm / next.distance
      : 1;
  return { cities, passed, upcoming, current, next, progressToNext: Math.min(progressToNext, 1) };
}

// Virtual position: travelling east from user's starting point
export function virtualPosition(
  startLat: number,
  startLon: number,
  totalKm: number
): [number, number] {
  const cosLat = Math.cos((startLat * Math.PI) / 180);
  const lonDelta = cosLat > 0.01 ? (totalKm / (111.32 * cosLat)) * (180 / Math.PI) : 0;
  const newLon = ((startLon + lonDelta + 180) % 360) - 180;
  return [startLat, newLon];
}

export function motivationalMessage(totalKm: number, nextCity: CityWithDistance | null): string {
  if (totalKm < 1) return "Lace up and go! Your first kilometer changes everything.";
  if (totalKm < 5) {
    if (nextCity) return `${nextCity.distance - totalKm} km more to reach ${nextCity.name}. You've got this!`;
    return "Great start! Keep the momentum going.";
  }
  if (totalKm < 21) return "You're building real habit now. Every run counts.";
  if (totalKm < 42) return "Half marathon territory — you're officially a runner.";
  if (totalKm < 100) return "Your legs are getting stronger with every kilometer.";
  if (totalKm < 500) return "You're covering serious ground. Cities are falling behind you.";
  if (totalKm < 1000) return "You're running across countries. Legendary.";
  return "You've run across continents. Absolute legend.";
}
