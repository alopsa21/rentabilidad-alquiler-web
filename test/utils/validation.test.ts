import { describe, it, expect } from 'vitest';
import { getFormErrors } from '../../src/utils/validation';
import type { FormularioRentabilidadState } from '../../src/types/formulario';

describe('getFormErrors', () => {
  const baseState: FormularioRentabilidadState = {
    precioCompra: 150000,
    codigoComunidadAutonoma: 13,
    alquilerMensual: 800,
    hayHipoteca: false,
    importeHipoteca: 0,
    tipoInteres: 0,
    plazoHipoteca: 0,
  };

  it('debe devolver array vacío para formulario válido', () => {
    const errors = getFormErrors(baseState);
    expect(errors).toEqual([]);
  });

  it('debe detectar precio de compra inválido', () => {
    const errors = getFormErrors({ ...baseState, precioCompra: 0 });
    expect(errors).toContain('El precio de compra debe ser mayor que 0');
  });

  it('debe detectar precio de compra negativo', () => {
    const errors = getFormErrors({ ...baseState, precioCompra: -100 });
    expect(errors).toContain('El precio de compra debe ser mayor que 0');
  });

  it('debe detectar alquiler mensual negativo', () => {
    const errors = getFormErrors({ ...baseState, alquilerMensual: -100 });
    expect(errors).toContain('El alquiler mensual no puede ser negativo');
  });

  it('debe detectar comunidad autónoma inválida (fuera de rango)', () => {
    const errors = getFormErrors({ ...baseState, codigoComunidadAutonoma: 0 });
    expect(errors).toContain('Seleccione una comunidad autónoma');
  });

  it('debe detectar comunidad autónoma inválida (mayor a 19)', () => {
    const errors = getFormErrors({ ...baseState, codigoComunidadAutonoma: 20 });
    expect(errors).toContain('Seleccione una comunidad autónoma');
  });

  it('debe validar campos de hipoteca cuando hayHipoteca es true', () => {
    const stateWithMortgage: FormularioRentabilidadState = {
      ...baseState,
      hayHipoteca: true,
      importeHipoteca: 0,
      tipoInteres: 0,
      plazoHipoteca: 0,
    };
    const errors = getFormErrors(stateWithMortgage);
    expect(errors).toContain('El importe de la hipoteca debe ser mayor que 0');
    expect(errors).toContain('El tipo de interés debe ser mayor que 0');
    expect(errors).toContain('El plazo de la hipoteca debe ser mayor que 0');
  });

  it('no debe validar campos de hipoteca cuando hayHipoteca es false', () => {
    const errors = getFormErrors(baseState);
    expect(errors).not.toContain('El importe de la hipoteca debe ser mayor que 0');
    expect(errors).not.toContain('El tipo de interés debe ser mayor que 0');
    expect(errors).not.toContain('El plazo de la hipoteca debe ser mayor que 0');
  });

  it('debe acumular múltiples errores', () => {
    const invalidState: FormularioRentabilidadState = {
      precioCompra: 0,
      codigoComunidadAutonoma: 0,
      alquilerMensual: -100,
      hayHipoteca: false,
      importeHipoteca: 0,
      tipoInteres: 0,
      plazoHipoteca: 0,
    };
    const errors = getFormErrors(invalidState);
    expect(errors.length).toBeGreaterThan(1);
    expect(errors).toContain('El precio de compra debe ser mayor que 0');
    expect(errors).toContain('El alquiler mensual no puede ser negativo');
    expect(errors).toContain('Seleccione una comunidad autónoma');
  });
});
