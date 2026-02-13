import { getApiUrl } from './api';

const cacheCiudadesPorCodauto = new Map<number, string[]>();
const inFlightCiudadesPorCodauto = new Map<number, Promise<string[]>>();

export async function getCiudadesPorCodauto(codauto: number): Promise<string[]> {
  if (!(codauto >= 1 && codauto <= 19)) return [];
  const cached = cacheCiudadesPorCodauto.get(codauto);
  if (cached) return cached;

  const inFlight = inFlightCiudadesPorCodauto.get(codauto);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const base = getApiUrl();
    const res = await fetch(`${base}/territorio/ciudades?codauto=${encodeURIComponent(String(codauto))}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status} cargando ciudades (codauto=${codauto})`);
    }
    const data = (await res.json()) as { ciudades: string[] } | string[];
    const ciudades = Array.isArray(data) ? data : data.ciudades;
    const normalized = Array.from(new Set((ciudades ?? []).filter(Boolean)));
    cacheCiudadesPorCodauto.set(codauto, normalized);
    return normalized;
  })();

  inFlightCiudadesPorCodauto.set(codauto, promise);
  try {
    return await promise;
  } finally {
    inFlightCiudadesPorCodauto.delete(codauto);
  }
}

