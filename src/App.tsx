import { useState } from 'react'
import { HeaderRentabilidad } from './components/HeaderRentabilidad'
import { CardAnalisis } from './components/CardAnalisis'
import { DetalleAnalisis } from './components/DetalleAnalisis'
import { ModalDetalle } from './components/ModalDetalle'
import { calcularRentabilidadApi } from './services/api'
import { COMUNIDADES_AUTONOMAS } from './constants/comunidades'
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
  const [ordenarPor, setOrdenarPor] = useState<{ campo: string | null; direccion: 'asc' | 'desc' }>({ campo: null, direccion: 'asc' })
  const [tarjetasExpandidas, setTarjetasExpandidas] = useState<Set<string>>(new Set())

  const handleAnalizar = async (_url: string) => {
    setError(null)
    setResultado(null)
    setVeredictoGlobal(null)
    setLoading(true)
    try {
      // Generar valores aleatorios
      const alquilerAleatorio = Math.floor(Math.random() * (1000 - 500 + 1)) + 500
      const precioAleatorio = Math.floor(Math.random() * (400000 - 100000 + 1)) + 100000
      const comunidadAleatoria = COMUNIDADES_AUTONOMAS[Math.floor(Math.random() * COMUNIDADES_AUTONOMAS.length)]
      const habitacionesAleatorias = Math.floor(Math.random() * (4 - 1 + 1)) + 1 // 1-4 habitaciones
      // m² de 10 en 10 entre 60 y 200 (60, 70, 80, ..., 200)
      const metrosAleatorios = (Math.floor(Math.random() * ((200 - 60) / 10 + 1)) * 10) + 60
      const banosAleatorios = Math.floor(Math.random() * (3 - 1 + 1)) + 1 // 1-3 baños
      const payload = {
        ...DEFAULT_PAYLOAD,
        alquilerMensual: alquilerAleatorio,
        precioCompra: precioAleatorio,
        comunidadAutonoma: comunidadAleatoria,
      }
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

      // Importar función para obtener ciudad aleatoria
      const { obtenerCiudadAleatoria } = await import('./utils/ciudades')
      const ciudadAleatoria = obtenerCiudadAleatoria(payload.comunidadAutonoma)

      const nuevaTarjeta: AnalisisCard = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        url: _url,
        ciudad: ciudadAleatoria,
        precioCompra: payload.precioCompra,
        alquilerEstimado: alquilerAleatorio,
        rentabilidadNetaPct: rentNetaPct,
        estado: veredicto.estado,
        veredictoTitulo: veredicto.titulo,
        veredictoRazones: veredicto.razones,
        habitaciones: habitacionesAleatorias,
        metrosCuadrados: metrosAleatorios,
        banos: banosAleatorios,
      }

      setAnalisis((prev) => [nuevaTarjeta, ...prev])
      setResultadosPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: data }))
      // No establecer tarjetaActivaId ni expandir automáticamente
      // La tarjeta aparecerá sin resaltar hasta que el usuario haga clic
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
      case 'ciudad':
        valorA = a.ciudad || ''
        valorB = b.ciudad || ''
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
    
    if (isMobile) {
      setModalAbierto(true)
    } else {
      setModalAbierto(false)
      // Toggle del detalle debajo de cada tarjeta (múltiples detalles visibles)
      setTarjetasExpandidas((prev) => {
        const nuevo = new Set(prev)
        if (nuevo.has(id)) {
          nuevo.delete(id)
        } else {
          nuevo.add(id)
        }
        return nuevo
      })
    }
  }

  const handleEliminarTarjeta = (id: string) => {
    setAnalisis((prev) => {
      const nuevasTarjetas = prev.filter((c) => c.id !== id)
      
      if (tarjetaActivaId === id) {
        setTarjetaActivaId(nuevasTarjetas.length > 0 ? nuevasTarjetas[0].id : null)
        setModalAbierto(false)
        if (nuevasTarjetas.length === 0) {
          setResultado(null)
          setVeredictoGlobal(null)
        }
      }
      
      // Eliminar de tarjetas expandidas
      setTarjetasExpandidas((prev) => {
        const nuevo = new Set(prev)
        nuevo.delete(id)
        return nuevo
      })
      
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
        {analisis.length > 0 && (
          <div className="app-layout-desktop layout-horizontal">
            {/* Cabecera sticky con títulos de columnas */}
            <div className="card-header-sticky card-header-full-width" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '1rem', width: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }} className="card-info-horizontal card-header-row">
                <div style={{ flex: 1.2, display: 'flex', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Inmueble</strong>
                </div>
                <div 
                  style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => handleOrdenar('ciudad')}
                >
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Ciudad</strong>
                  {ordenarPor.campo === 'ciudad' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                <div 
                  style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => handleOrdenar('precio')}
                >
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Precio compra</strong>
                  {ordenarPor.campo === 'precio' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                <div 
                  style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => handleOrdenar('alquiler')}
                >
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Alquiler estimado</strong>
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
            {/* Panel de tarjetas: ancho completo */}
            <section aria-label="Panel de tarjetas" className="app-panel-tarjetas app-panel-tarjetas-horizontal">
              {analisisOrdenados.map((card) => {
                const mostrarDetalle = tarjetasExpandidas.has(card.id)
                const resultadoParaDetalle = resultadosPorTarjeta[card.id] || null
                const cashflow = resultadoParaDetalle?.cashflowFinal || null
                return (
                  <div key={card.id}>
                    <CardAnalisis
                      card={card}
                      isActive={mostrarDetalle}
                      onClick={() => handleClickTarjeta(card.id)}
                      onDelete={() => handleEliminarTarjeta(card.id)}
                      mostrarDetalle={mostrarDetalle}
                      cashflow={cashflow ?? undefined}
                    />
                    {/* Detalle debajo de la tarjeta: toggle al hacer clic */}
                    {mostrarDetalle && resultadoParaDetalle && (
                      <div className="card-detalle-expandido">
                        <DetalleAnalisis card={card} resultado={resultadoParaDetalle} isHorizontalLayout={true} />
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          </div>
        )}
        
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
