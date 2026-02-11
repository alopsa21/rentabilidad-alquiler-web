import type { FormularioRentabilidadState } from '../types/formulario';
import type { RentabilidadApiResponse, RentabilidadApiError } from '../types/api';
import type { IdealistaAutofill } from '../types/autofill';

const getApiUrl = (): string => {
  const url = import.meta.env.VITE_API_URL;
  if (typeof url === 'string' && url.length > 0) {
    return url.replace(/\/$/, '');
  }
  
  // Detectar si estamos en móvil y usar la IP local del hostname si está disponible
  // En desarrollo, si accedes desde móvil usando la IP del ordenador, usar esa IP
  const hostname = window.location.hostname;
  
  // Si el hostname es una IP (no localhost), usar esa IP para la API también
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3000`;
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
    codigoComunidadAutonoma: state.codigoComunidadAutonoma,
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
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hostname = window.location.hostname;
      
      let errorMessage = `No se puede conectar con la API en ${baseUrl}.`;
      
      if (isMobile && hostname === 'localhost') {
        errorMessage += '\n\nDesde móvil, accede usando la IP de tu ordenador (ej: http://192.168.18.36:5173) en lugar de localhost.';
      } else if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        errorMessage += `\n\nVerifica que:\n1. La API esté corriendo y escuchando en 0.0.0.0:3000\n2. El firewall permita conexiones en el puerto 3000`;
      } else {
        errorMessage += '\n\nVerifica que el servidor de la API esté corriendo.';
      }
      
      throw new Error(errorMessage);
    }
    throw err;
  }
}

/**
 * Llama a la API POST /autofill para extraer datos de un anuncio desde su URL.
 *
 * @param url - URL del anuncio inmobiliario
 * @returns Datos extraídos del anuncio (puede contener nulls si no se encuentran)
 */
export async function autofillFromUrlApi(url: string): Promise<IdealistaAutofill> {
  const baseUrl = getApiUrl();
  const apiUrl = `${baseUrl}/autofill`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Si falla, devolver objeto con nulls (nunca lanzar excepción según reglas del producto)
      return {
        buyPrice: null,
        sqm: null,
        rooms: null,
        banos: null,
        ciudad: null,
        codigoComunidadAutonoma: null,
        source: "idealista:v1"
      };
    }

    return data as IdealistaAutofill;
  } catch (err) {
    // En caso de error, devolver objeto con nulls (nunca lanzar excepción)
    return {
      buyPrice: null,
      sqm: null,
      rooms: null,
      banos: null,
      ciudad: null,
      codigoComunidadAutonoma: null,
      source: "idealista:v1"
    };
  }
}
