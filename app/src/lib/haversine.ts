/**
 * lib/haversine.ts
 * 
 * Implementação do Algoritmo de Haversine para cálculo de distâncias
 * na superfície esférica da Terra entre dois pares de coordenadas GPS.
 */

const EARTH_RADIUS_KM = 6371.0;

/**
 * Converte graus decimais para radianos
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula a distância em quilómetros entre duas coordenadas GPS
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Formata a distância para exibição amigável aos utilizadores (RN-02):
 * - Menor que 1.000m: '350 m', '820 m'
 * - Igual ou superior a 1.000m: '1.2 km', '4.7 km'
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1.0) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
