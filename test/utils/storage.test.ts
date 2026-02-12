import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCards, saveCards, clearCards } from '../../src/utils/storage';
import type { AnalisisCard } from '../../src/types/analisis';
import type { RentabilidadApiResponse } from '../../src/types/api';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn((callback: () => void) => {
  setTimeout(callback, 0);
  return 1;
}) as unknown as typeof requestIdleCallback;

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadCards', () => {
    it('debe devolver array vacío cuando no hay datos', () => {
      const cards = loadCards();
      expect(cards).toEqual([]);
    });

    it('debe cargar tarjetas correctamente desde localStorage', () => {
      const mockCard: AnalisisCard = {
        id: 'test-1',
        url: 'https://example.com',
        ciudad: 'Madrid',
        precioCompra: 150000,
        alquilerEstimado: 800,
        rentabilidadNetaPct: 5.2,
        estado: 'verde',
        veredictoTitulo: 'Buena inversión',
        veredictoRazones: ['Rentabilidad positiva'],
        habitaciones: 3,
        metrosCuadrados: 80,
        banos: 2,
        originalHabitaciones: 3,
        originalMetrosCuadrados: 80,
        originalBanos: 2,
        originalCiudad: 'Madrid',
        originalInput: {
          precioCompra: 150000,
          codigoComunidadAutonoma: 13,
          alquilerMensual: 800,
          hayHipoteca: false,
          importeHipoteca: 0,
          tipoInteres: 0,
          plazoHipoteca: 0,
        },
        currentInput: {
          precioCompra: 150000,
          codigoComunidadAutonoma: 13,
          alquilerMensual: 800,
          hayHipoteca: false,
          importeHipoteca: 0,
          tipoInteres: 0,
          plazoHipoteca: 0,
        },
        isFavorite: false,
        notes: '',
      };

      const mockOutput: RentabilidadApiResponse = {
        totalCompra: '150000',
        capitalPropio: '150000',
        ingresosAnuales: '9600',
        gastosAnuales: '2000',
        beneficioAntesImpuestos: '7600',
        cashflowAntesAmortizar: '7600',
        cashflowFinal: '7600',
        rentabilidadBruta: '6.4',
        rentabilidadNeta: '5.2',
        roceAntes: '5.2',
        roceFinal: '5.2',
      };

      const data = {
        version: 2,
        cards: [
          {
            id: 'test-1',
            url: 'https://example.com',
            ciudad: 'Madrid',
            precioCompra: 150000,
            alquilerEstimado: 800,
            rentabilidadNetaPct: 5.2,
            estado: 'verde',
            veredictoTitulo: 'Buena inversión',
            veredictoRazones: ['Rentabilidad positiva'],
            habitaciones: 3,
            metrosCuadrados: 80,
            banos: 2,
            originalHabitaciones: 3,
            originalMetrosCuadrados: 80,
            originalBanos: 2,
            originalCiudad: 'Madrid',
            originalInput: mockCard.originalInput,
            currentInput: mockCard.currentInput,
            motorOutput: mockOutput,
            createdAt: '2024-01-01T00:00:00.000Z',
            isFavorite: false,
            notes: '',
          },
        ],
      };

      localStorage.setItem('rentabilidad-alquiler:cards', JSON.stringify(data));
      const loaded = loadCards();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].card.id).toBe('test-1');
      expect(loaded[0].motorOutput).toEqual(mockOutput);
      expect(loaded[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('debe limpiar datos si la versión no coincide', () => {
      const data = {
        version: 1, // Versión antigua
        cards: [],
      };

      localStorage.setItem('rentabilidad-alquiler:cards', JSON.stringify(data));
      const loaded = loadCards();

      expect(loaded).toEqual([]);
      expect(localStorage.getItem('rentabilidad-alquiler:cards')).toBeNull();
    });

    it('debe manejar errores de parseo y limpiar datos corruptos', () => {
      localStorage.setItem('rentabilidad-alquiler:cards', 'invalid json');
      const loaded = loadCards();

      expect(loaded).toEqual([]);
      expect(localStorage.getItem('rentabilidad-alquiler:cards')).toBeNull();
    });
  });

  describe('saveCards', () => {
    it('debe guardar tarjetas correctamente en localStorage', async () => {
      const mockCard: AnalisisCard = {
        id: 'test-1',
        url: 'https://example.com',
        ciudad: 'Madrid',
        precioCompra: 150000,
        alquilerEstimado: 800,
        rentabilidadNetaPct: 5.2,
        estado: 'verde',
        veredictoTitulo: 'Buena inversión',
        veredictoRazones: ['Rentabilidad positiva'],
        habitaciones: 3,
        metrosCuadrados: 80,
        banos: 2,
        originalHabitaciones: 3,
        originalMetrosCuadrados: 80,
        originalBanos: 2,
        originalCiudad: 'Madrid',
        originalInput: {
          precioCompra: 150000,
          codigoComunidadAutonoma: 13,
          alquilerMensual: 800,
          hayHipoteca: false,
          importeHipoteca: 0,
          tipoInteres: 0,
          plazoHipoteca: 0,
        },
        currentInput: {
          precioCompra: 150000,
          codigoComunidadAutonoma: 13,
          alquilerMensual: 800,
          hayHipoteca: false,
          importeHipoteca: 0,
          tipoInteres: 0,
          plazoHipoteca: 0,
        },
        isFavorite: false,
        notes: '',
      };

      const mockOutput: RentabilidadApiResponse = {
        totalCompra: '150000',
        capitalPropio: '150000',
        ingresosAnuales: '9600',
        gastosAnuales: '2000',
        beneficioAntesImpuestos: '7600',
        cashflowAntesAmortizar: '7600',
        cashflowFinal: '7600',
        rentabilidadBruta: '6.4',
        rentabilidadNeta: '5.2',
        roceAntes: '5.2',
        roceFinal: '5.2',
      };

      saveCards([mockCard], { 'test-1': mockOutput });

      // Esperar a que se ejecute el callback
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stored = localStorage.getItem('rentabilidad-alquiler:cards');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.version).toBe(2);
      expect(parsed.cards).toHaveLength(1);
      expect(parsed.cards[0].id).toBe('test-1');
      expect(parsed.cards[0].motorOutput).toEqual(mockOutput);
    });

    it('debe preservar createdAt si se proporciona', async () => {
      const mockCard: AnalisisCard = {
        id: 'test-1',
        url: 'https://example.com',
        ciudad: 'Madrid',
        precioCompra: 150000,
        alquilerEstimado: 800,
        rentabilidadNetaPct: 5.2,
        estado: 'verde',
        veredictoTitulo: 'Buena inversión',
        veredictoRazones: ['Rentabilidad positiva'],
        habitaciones: 3,
        metrosCuadrados: 80,
        banos: 2,
        originalHabitaciones: 3,
        originalMetrosCuadrados: 80,
        originalBanos: 2,
        originalCiudad: 'Madrid',
        originalInput: {
          precioCompra: 150000,
          codigoComunidadAutonoma: 13,
          alquilerMensual: 800,
          hayHipoteca: false,
          importeHipoteca: 0,
          tipoInteres: 0,
          plazoHipoteca: 0,
        },
        currentInput: {
          precioCompra: 150000,
          codigoComunidadAutonoma: 13,
          alquilerMensual: 800,
          hayHipoteca: false,
          importeHipoteca: 0,
          tipoInteres: 0,
          plazoHipoteca: 0,
        },
        isFavorite: false,
        notes: '',
      };

      const createdAt = '2024-01-01T00:00:00.000Z';
      saveCards([mockCard], {}, { 'test-1': createdAt });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const stored = localStorage.getItem('rentabilidad-alquiler:cards');
      const parsed = JSON.parse(stored!);
      expect(parsed.cards[0].createdAt).toBe(createdAt);
    });
  });

  describe('clearCards', () => {
    it('debe limpiar las tarjetas del localStorage', () => {
      localStorage.setItem('rentabilidad-alquiler:cards', JSON.stringify({ version: 2, cards: [] }));
      expect(localStorage.getItem('rentabilidad-alquiler:cards')).not.toBeNull();

      clearCards();
      expect(localStorage.getItem('rentabilidad-alquiler:cards')).toBeNull();
    });
  });
});
