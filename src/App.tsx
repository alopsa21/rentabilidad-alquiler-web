import { useState, useEffect } from 'react'
import { HeaderRentabilidad } from './components/HeaderRentabilidad'
import { Resultados } from './components/Resultados'
import { CardAnalisis } from './components/CardAnalisis'
import { calcularRentabilidadApi } from './services/api'
import type { RentabilidadApiResponse } from './types/api'
import type { FormularioRentabilidadState } from './types/formulario'
import type { AnalisisCard } from './types/analisis'
import './App.css'

/** Payload por defecto para mantener la API conectada hasta que la URL se use para obtener datos */
const DEFAULT_PAYLOAD: FormularioRentabilidadState = {
  precioCompra: 150000,
  comunidadAutonoma: 'Comunidad de Madrid',
  alquilerMensual: 800,
  reforma: 0,
  notaria: 0,
  registro: 0,
  comunidadAnual: 0,
  ibi: 0,
  seguroHogar: 0,
  hayHipoteca: false,
  importeHipoteca: 0,
  tipoInteres: 0,
  plazoHipoteca: 0,
}

function App() {
  const [resultado, setResultado] = useState<RentabilidadApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analisis, setAnalisis] = useState<AnalisisCard[]>([])

  const handleAnalizar = async (_url: string) => {
    setError(null)
    setResultado(null)
    setLoading(true)
    try {
      const data = await calcularRentabilidadApi(DEFAULT_PAYLOAD)
      setResultado(data)

      // Construir tarjeta acumulativa
      const rentNetaRaw = Number(data.rentabilidadNeta)
      const rentNetaPct =
        !Number.isNaN(rentNetaRaw) && rentNetaRaw > -1 && rentNetaRaw < 1
          ? rentNetaRaw * 100
          : rentNetaRaw

      let estado: AnalisisCard['estado'] = 'rojo'
      if (rentNetaPct >= 6) {
        estado = 'verde'
      } else if (rentNetaPct >= 3) {
        estado = 'amarillo'
      }

      const nuevaTarjeta: AnalisisCard = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        url: _url,
        ubicacion: DEFAULT_PAYLOAD.comunidadAutonoma,
        precioCompra: DEFAULT_PAYLOAD.precioCompra,
        alquilerEstimado: DEFAULT_PAYLOAD.alquilerMensual,
        rentabilidadNetaPct: rentNetaPct,
        estado,
      }

      setAnalisis((prev) => [nuevaTarjeta, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (resultado) {
      document.getElementById('resultados')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [resultado])

  return (
    <div className="app">
      <HeaderRentabilidad onAnalizar={handleAnalizar} loading={loading} />
      <main className="app-main">
        {error && (
          <p role="alert" className="app-error">
            {error}
          </p>
        )}
        <section aria-label="Panel de tarjetas" className="app-panel-tarjetas">
          {analisis.map((card) => (
            <CardAnalisis key={card.id} card={card} />
          ))}
        </section>
        <Resultados resultado={resultado} />
      </main>
    </div>
  )
}

export default App
