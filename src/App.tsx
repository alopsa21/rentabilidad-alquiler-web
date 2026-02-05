import { useState } from 'react'
import { HeaderRentabilidad } from './components/HeaderRentabilidad'
import { CardAnalisis } from './components/CardAnalisis'
import { DetalleAnalisis } from './components/DetalleAnalisis'
import { calcularRentabilidadApi } from './services/api'
import type { RentabilidadApiResponse } from './types/api'
import type { FormularioRentabilidadState } from './types/formulario'
import type { AnalisisCard } from './types/analisis'
import type { VeredictoHumano } from './utils/veredicto'
import { mapResultadosToVerdict } from './utils/veredicto'
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
  const [veredictoGlobal, setVeredictoGlobal] = useState<VeredictoHumano | null>(null)
  const [tarjetaActivaId, setTarjetaActivaId] = useState<string | null>(null)

  const handleAnalizar = async (_url: string) => {
    setError(null)
    setResultado(null)
    setVeredictoGlobal(null)
    setLoading(true)
    try {
      // Generar alquiler aleatorio entre 500 y 1000
      const alquilerAleatorio = Math.floor(Math.random() * (1000 - 500 + 1)) + 500
      const payload = { ...DEFAULT_PAYLOAD, alquilerMensual: alquilerAleatorio }
      const data = await calcularRentabilidadApi(payload)
      setResultado(data)

      const veredicto = mapResultadosToVerdict(data)
      setVeredictoGlobal(veredicto)

      // Construir tarjeta acumulativa
      const rentNetaRaw = Number(data.rentabilidadNeta)
      const rentNetaPct =
        !Number.isNaN(rentNetaRaw) && rentNetaRaw > -1 && rentNetaRaw < 1
          ? rentNetaRaw * 100
          : rentNetaRaw

      const nuevaTarjeta: AnalisisCard = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        url: _url,
        ubicacion: payload.comunidadAutonoma,
        precioCompra: payload.precioCompra,
        alquilerEstimado: alquilerAleatorio,
        rentabilidadNetaPct: rentNetaPct,
        estado: veredicto.estado,
        veredictoTitulo: veredicto.titulo,
        veredictoRazones: veredicto.razones,
      }

      setAnalisis((prev) => [nuevaTarjeta, ...prev])
      setTarjetaActivaId(nuevaTarjeta.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setLoading(false)
    }
  }

  const tarjetaActiva = analisis.find((c) => c.id === tarjetaActivaId)

  return (
    <div className="app">
      <HeaderRentabilidad onAnalizar={handleAnalizar} loading={loading} />
      <main className="app-main">
        {error && (
          <p role="alert" className="app-error">
            {error}
          </p>
        )}
        {veredictoGlobal && (
          <section className="app-veredicto-global" aria-label="Veredicto global">
            <strong>{veredictoGlobal.titulo}</strong>
            {veredictoGlobal.razones.length > 0 && (
              <ul>
                {veredictoGlobal.razones.map((razon, idx) => (
                  <li key={idx}>{razon}</li>
                ))}
              </ul>
            )}
          </section>
        )}
        <div className="app-layout-desktop">
          <section aria-label="Panel de tarjetas" className="app-panel-tarjetas">
            {analisis.map((card) => (
              <CardAnalisis
                key={card.id}
                card={card}
                isActive={card.id === tarjetaActivaId}
                onClick={() => setTarjetaActivaId(card.id)}
              />
            ))}
          </section>
          {tarjetaActiva && resultado && (
            <DetalleAnalisis card={tarjetaActiva} resultado={resultado} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
