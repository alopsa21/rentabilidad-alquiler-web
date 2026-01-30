import { useState } from 'react';
import type { FormularioRentabilidadState } from '../types/formulario';
import { INITIAL_FORM_STATE } from '../types/formulario';
import { COMUNIDADES_AUTONOMAS } from '../constants/comunidades';
import { calcularRentabilidadApi } from '../services/api';
import type { RentabilidadApiResponse } from '../types/api';

function updateNum(
  state: FormularioRentabilidadState,
  key: keyof FormularioRentabilidadState,
  value: string
): FormularioRentabilidadState {
  const num = value === '' ? 0 : Number(value);
  return { ...state, [key]: isNaN(num) ? 0 : num };
}

interface FormularioRentabilidadProps {
  /** Se llama al iniciar el cálculo (null) y al terminar con éxito (datos) */
  onResultadoChange?: (resultado: RentabilidadApiResponse | null) => void;
}

export function FormularioRentabilidad({ onResultadoChange }: FormularioRentabilidadProps) {
  const [state, setState] = useState<FormularioRentabilidadState>(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalcular = async () => {
    setError(null);
    onResultadoChange?.(null);
    setLoading(true);
    try {
      const data = await calcularRentabilidadApi(state);
      onResultadoChange?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCalcular();
      }}
      style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}
    >
      <h2 style={{ marginTop: 0 }}>Datos básicos</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <label>
          Precio de compra (€) *
          <input
            type="number"
            min={0}
            step={1000}
            value={state.precioCompra || ''}
            onChange={(e) => setState((s) => updateNum(s, 'precioCompra', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Comunidad autónoma *
          <select
            value={state.comunidadAutonoma}
            onChange={(e) => setState((s) => ({ ...s, comunidadAutonoma: e.target.value }))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="">Seleccione...</option>
            {COMUNIDADES_AUTONOMAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Alquiler mensual (€) *
          <input
            type="number"
            min={0}
            step={50}
            value={state.alquilerMensual || ''}
            onChange={(e) => setState((s) => updateNum(s, 'alquilerMensual', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
      </div>

      <h2>Gastos de compra y reforma</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <label>
          Reforma (€)
          <input
            type="number"
            min={0}
            step={500}
            value={state.reforma || ''}
            onChange={(e) => setState((s) => updateNum(s, 'reforma', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Notaría (€)
          <input
            type="number"
            min={0}
            step={100}
            value={state.notaria || ''}
            onChange={(e) => setState((s) => updateNum(s, 'notaria', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Registro (€)
          <input
            type="number"
            min={0}
            step={100}
            value={state.registro || ''}
            onChange={(e) => setState((s) => updateNum(s, 'registro', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
      </div>

      <h2>Gastos anuales</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <label>
          Comunidad (€/año)
          <input
            type="number"
            min={0}
            step={50}
            value={state.comunidadAnual || ''}
            onChange={(e) => setState((s) => updateNum(s, 'comunidadAnual', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          IBI (€/año)
          <input
            type="number"
            min={0}
            step={50}
            value={state.ibi || ''}
            onChange={(e) => setState((s) => updateNum(s, 'ibi', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
        <label>
          Seguro hogar (€/año)
          <input
            type="number"
            min={0}
            step={25}
            value={state.seguroHogar || ''}
            onChange={(e) => setState((s) => updateNum(s, 'seguroHogar', e.target.value))}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>
      </div>

      <h2>Hipoteca</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={state.hayHipoteca}
            onChange={(e) => setState((s) => ({ ...s, hayHipoteca: e.target.checked }))}
          />
          Hay hipoteca
        </label>
        {state.hayHipoteca && (
          <>
            <label>
              Importe hipoteca (€)
              <input
                type="number"
                min={0}
                step={1000}
                value={state.importeHipoteca || ''}
                onChange={(e) => setState((s) => updateNum(s, 'importeHipoteca', e.target.value))}
                style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
            <label>
              Tipo de interés (%)
              <input
                type="number"
                min={0}
                step={0.1}
                value={state.tipoInteres || ''}
                onChange={(e) => setState((s) => updateNum(s, 'tipoInteres', e.target.value))}
                style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
            <label>
              Plazo (años)
              <input
                type="number"
                min={1}
                max={40}
                step={1}
                value={state.plazoHipoteca || ''}
                onChange={(e) => setState((s) => updateNum(s, 'plazoHipoteca', e.target.value))}
                style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
          </>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: 'crimson', marginBottom: 16 }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{ padding: '10px 24px', fontSize: 16 }}
      >
        {loading ? 'Cargando...' : 'Calcular'}
      </button>
    </form>
  );
}
