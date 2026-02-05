export type EstadoColor = 'verde' | 'amarillo' | 'rojo';

export interface AnalisisCard {
  id: string;
  url: string;
  ubicacion: string;
  precioCompra: number;
  alquilerEstimado: number;
  rentabilidadNetaPct: number;
  estado: EstadoColor;
  veredictoTitulo: string;
  veredictoRazones: string[];
  habitaciones: number;
  metrosCuadrados: number;
  banos: number;
}

