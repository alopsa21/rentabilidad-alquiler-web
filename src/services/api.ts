import type { FormularioRentabilidadState } from '../types/formulario';
import type { RentabilidadApiResponse, RentabilidadApiError } from '../types/api';

const getApiUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (typeof url === 'string' && url.length > 0) {
    return url.replace(/\/$/, '');
  }
  // Por defecto usar localhost (útil para desarrollo desktop)
  return 'http://localhost:3000';
};

/**
 * Construye el body para POST /rentabilidad.
 * Solo incluye campos opcionales numéricos cuando son > 0 (la API valida positive()).
 */
function buildRentabilidadBody(state: FormularioRentabilidadState): Record<string, unknown> {
  const body: Record<string, unknown> = {
    precioCompra: state.precioCompra,
    comunidadAutonoma: state.comunidadAutonoma,
    alquilerMensual: state.alquilerMensual,
    hayHipoteca: state.hayHipoteca,
  };

  if (state.reforma > 0) body.reforma = state.reforma;
  if (state.notaria > 0) body.notaria = state.notaria;
  if (state.registro > 0) body.registro = state.registro;
  if (state.comunidadAnual > 0) body.comunidadAnual = state.comunidadAnual;
  if (state.ibi > 0) body.ibi = state.ibi;
  if (state.seguroHogar > 0) body.seguroHogar = state.seguroHogar;

  if (state.hayHipoteca) {
    if (state.importeHipoteca > 0) body.importeHipoteca = state.importeHipoteca;
    if (state.tipoInteres > 0) body.tipoInteres = state.tipoInteres;
    if (state.plazoHipoteca > 0) body.plazoHipoteca = state.plazoHipoteca;
  }

  return body;
}

/**
 * Llama a la API POST /rentabilidad con el estado del formulario.
 * Usa fetch nativo. Lanza si la respuesta no es ok (incluye body de error si es JSON).
 */
export async function calcularRentabilidadApi(
  state: FormularioRentabilidadState
): Promise<RentabilidadApiResponse> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}/rentabilidad`;
  const body = buildRentabilidadBody(state);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = data as RentabilidadApiError;
      const message =
        err?.message || `Error ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    return data as RentabilidadApiResponse;
  } catch (err) {
    // Mejorar mensaje de error para "Failed to fetch"
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`No se puede conectar con la API en ${baseUrl}. Verifica que el servidor esté corriendo.`);
    }
    throw err;
  }
}
