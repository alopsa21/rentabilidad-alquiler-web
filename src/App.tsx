import { useState } from 'react'
import { HeaderRentabilidad } from './components/HeaderRentabilidad'
import { CardAnalisis } from './components/CardAnalisis'
import { DetalleAnalisis } from './components/DetalleAnalisis'
import { ModalDetalle } from './components/ModalDetalle'
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
  const [resultadosPorTarjeta, setResultadosPorTarjeta] = useState<Record<string, RentabilidadApiResponse>>({})
  const [veredictoGlobal, setVeredictoGlobal] = useState<VeredictoHumano | null>(null)
  const [tarjetaActivaId, setTarjetaActivaId] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [tarjetaConDetalleExpandido, setTarjetaConDetalleExpandido] = useState<string | null>(null)
  const [ordenarPor, setOrdenarPor] = useState<{ campo: string | null; direccion: 'asc' | 'desc' }>({ campo: null, direccion: 'asc' })

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
      setResultadosPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: data }))
      setTarjetaActivaId(nuevaTarjeta.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setLoading(false)
    }
  }

  const tarjetaActiva = analisis.find((c) => c.id === tarjetaActivaId)

  const handleOrdenar = (campo: string) => {
    setOrdenarPor((prev) => {
      if (prev.campo === campo) {
        // Si ya está ordenando por este campo, cambiar dirección
        return { campo, direccion: prev.direccion === 'asc' ? 'desc' : 'asc' }
      }
      // Si es un campo nuevo, empezar con ascendente
      return { campo, direccion: 'asc' }
    })
  }

  // Ordenar tarjetas según el criterio seleccionado
  const analisisOrdenados = [...analisis].sort((a, b) => {
    if (!ordenarPor.campo) return 0

    let valorA: number | string
    let valorB: number | string

    switch (ordenarPor.campo) {
      case 'ubicacion':
        valorA = a.ubicacion || ''
        valorB = b.ubicacion || ''
        break
      case 'precio':
        valorA = a.precioCompra
        valorB = b.precioCompra
        break
      case 'alquiler':
        valorA = a.alquilerEstimado
        valorB = b.alquilerEstimado
        break
      case 'rentabilidad':
        valorA = a.rentabilidadNetaPct
        valorB = b.rentabilidadNetaPct
        break
      case 'cashflow':
        const cashflowA = resultadosPorTarjeta[a.id]?.cashflowFinal
        const cashflowB = resultadosPorTarjeta[b.id]?.cashflowFinal
        valorA = cashflowA ? Number(cashflowA) : 0
        valorB = cashflowB ? Number(cashflowB) : 0
        break
      default:
        return 0
    }

    if (typeof valorA === 'string' && typeof valorB === 'string') {
      const comparacion = valorA.localeCompare(valorB)
      return ordenarPor.direccion === 'asc' ? comparacion : -comparacion
    }

    const comparacion = valorA > valorB ? 1 : valorA < valorB ? -1 : 0
    return ordenarPor.direccion === 'asc' ? comparacion : -comparacion
  })

  const handleClickTarjeta = (id: string) => {
    const isMobile = window.innerWidth <= 768
    setTarjetaActivaId(id)
    
    // En mobile, abrir modal; en desktop toggle del detalle expandido
    if (isMobile) {
      setModalAbierto(true)
      setTarjetaConDetalleExpandido(null) // Cerrar detalle expandido en mobile
    } else {
      setModalAbierto(false)
      // Toggle del detalle expandido: si ya está abierto, cerrarlo; si no, abrirlo
      setTarjetaConDetalleExpandido(prev => prev === id ? null : id)
    }
  }

  const handleEliminarTarjeta = (id: string) => {
    setAnalisis((prev) => {
      const nuevasTarjetas = prev.filter((c) => c.id !== id)
      
      // Si se elimina la tarjeta activa, seleccionar la primera disponible o null
      if (tarjetaActivaId === id) {
        setTarjetaActivaId(nuevasTarjetas.length > 0 ? nuevasTarjetas[0].id : null)
        setModalAbierto(false) // Cerrar modal si estaba abierto
        setTarjetaConDetalleExpandido(null) // Cerrar detalle expandido si estaba abierto
        // Si no hay tarjetas, limpiar resultado
        if (nuevasTarjetas.length === 0) {
          setResultado(null)
          setVeredictoGlobal(null)
        }
      }
      
      // Eliminar resultado asociado
      setResultadosPorTarjeta((prev) => {
        const nuevo = { ...prev }
        delete nuevo[id]
        return nuevo
      })
      
      return nuevasTarjetas
    })
  }

  return (
    <div className="app">
      <HeaderRentabilidad onAnalizar={handleAnalizar} loading={loading} />
      <main className="app-main">
        {error && (
          <p role="alert" className="app-error">
            {error}
          </p>
        )}
        <div className="app-layout-desktop">
          <section aria-label="Panel de tarjetas" className="app-panel-tarjetas">
            {/* Cabecera sticky con títulos de columnas - solo si hay tarjetas */}
            {analisis.length > 0 && (
              <div className="card-header-sticky">
                <div className="card-info-horizontal card-header-row">
                  <div 
                    style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleOrdenar('ubicacion')}
                  >
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Ubicación</strong>
                    {ordenarPor.campo === 'ubicacion' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div 
                    style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleOrdenar('precio')}
                  >
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Precio</strong>
                    {ordenarPor.campo === 'precio' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div 
                    style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleOrdenar('alquiler')}
                  >
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Alquiler</strong>
                    {ordenarPor.campo === 'alquiler' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div 
                    style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleOrdenar('rentabilidad')}
                  >
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Rentabilidad neta</strong>
                    {ordenarPor.campo === 'rentabilidad' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                  <div 
                    style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => handleOrdenar('cashflow')}
                  >
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Cashflow</strong>
                    {ordenarPor.campo === 'cashflow' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {analisisOrdenados.map((card) => {
              const mostrarDetalle = card.id === tarjetaConDetalleExpandido
              const resultadoParaDetalle = resultadosPorTarjeta[card.id] || null
              const cashflow = resultadoParaDetalle?.cashflowFinal || null
              
              return (
                <div key={card.id}>
                  <CardAnalisis
                    card={card}
                    isActive={card.id === tarjetaActivaId}
                    onClick={() => handleClickTarjeta(card.id)}
                    onDelete={() => handleEliminarTarjeta(card.id)}
                    mostrarDetalle={mostrarDetalle}
                    cashflow={cashflow}
                  />
                  {/* Detalle expandido debajo de la tarjeta */}
                  {mostrarDetalle && resultadoParaDetalle && (
                    <div className="card-detalle-expandido">
                      <DetalleAnalisis card={card} resultado={resultadoParaDetalle} />
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        </div>
        
        {/* Mobile: mostrar modal cuando está abierto */}
        {tarjetaActiva && resultado && (
          <ModalDetalle
            card={tarjetaActiva}
            resultado={resultado}
            isOpen={modalAbierto}
            onClose={() => setModalAbierto(false)}
          />
        )}
      </main>
    </div>
  )
}

export default App
