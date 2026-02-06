import { useState, useEffect } from 'react'
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
import { loadCards, saveCards, clearCards } from './utils/storage'
import { generateShareableUrl, copyToClipboard, getStateFromUrl, deserializeCards, type ShareableCardData } from './utils/share'
import { cardsToCSV, downloadCSV } from './utils/csv'
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
  const [isHydrated, setIsHydrated] = useState(false)
  const [createdAtPorTarjeta, setCreatedAtPorTarjeta] = useState<Record<string, string>>({})
  const [resetUrlTrigger, setResetUrlTrigger] = useState(0)
  const [notificacion, setNotificacion] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)

  // Función helper para mostrar notificaciones
  const mostrarNotificacion = (mensaje: string, tipo: 'success' | 'error' = 'success') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => {
      setNotificacion(null)
    }, 3000)
  }

  // Hidratación inicial: cargar tarjetas desde localStorage o URL al montar
  useEffect(() => {
    // Primero intentar cargar desde URL (tiene prioridad)
    const stateFromUrl = getStateFromUrl()
    if (stateFromUrl) {
      try {
        const sharedCards = deserializeCards(stateFromUrl)
        const cards: AnalisisCard[] = []
        const resultados: Record<string, RentabilidadApiResponse> = {}

        sharedCards.forEach(({ card, motorOutput }) => {
          cards.push(card)
          resultados[card.id] = motorOutput
        })

        setAnalisis(cards)
        setResultadosPorTarjeta(resultados)
        setCreatedAtPorTarjeta({})
        
        // Limpiar URL después de cargar
        window.history.replaceState({}, '', window.location.pathname)
        
        setIsHydrated(true)
        return
      } catch (error) {
        console.error('Error cargando tarjetas desde URL:', error)
        // Continuar con localStorage si falla
      }
    }

    // Si no hay URL o falló, cargar desde localStorage
    const loaded = loadCards()
    if (loaded.length > 0) {
      const cards: AnalisisCard[] = []
      const resultados: Record<string, RentabilidadApiResponse> = {}
      const createdAt: Record<string, string> = {}

      loaded.forEach(({ card, motorOutput, createdAt: cardCreatedAt }) => {
        cards.push(card)
        resultados[card.id] = motorOutput
        if (cardCreatedAt) {
          createdAt[card.id] = cardCreatedAt
        }
      })

      setAnalisis(cards)
      setResultadosPorTarjeta(resultados)
      setCreatedAtPorTarjeta(createdAt)
    }
    setIsHydrated(true)
  }, [])

  // Sincronización automática: guardar en localStorage cuando cambien las tarjetas o resultados
  useEffect(() => {
    // Solo sincronizar después de la hidratación inicial para evitar guardar datos vacíos
    if (!isHydrated || analisis.length === 0) {
      return
    }

    // Guardar solo si hay tarjetas y resultados correspondientes
    const todasTienenResultados = analisis.every((card) => resultadosPorTarjeta[card.id])
    if (todasTienenResultados) {
      saveCards(analisis, resultadosPorTarjeta, createdAtPorTarjeta)
    }
  }, [analisis, resultadosPorTarjeta, createdAtPorTarjeta, isHydrated])

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
        originalInput: { ...payload },
        currentInput: { ...payload },
      }

      const ahora = new Date().toISOString()
      setAnalisis((prev) => [nuevaTarjeta, ...prev])
      setResultadosPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: data }))
      setCreatedAtPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: ahora }))
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
      case 'roce':
        const roceA = resultadosPorTarjeta[a.id]?.roceFinal
        const roceB = resultadosPorTarjeta[b.id]?.roceFinal
        const roceANum = roceA ? Number(roceA) : 0
        const roceBNum = roceB ? Number(roceB) : 0
        // Normalizar si viene como decimal
        valorA = (roceANum > -1 && roceANum < 1) ? roceANum * 100 : roceANum
        valorB = (roceBNum > -1 && roceBNum < 1) ? roceBNum * 100 : roceBNum
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
      
      // Eliminar createdAt asociado
      setCreatedAtPorTarjeta((prev) => {
        const nuevo = { ...prev }
        delete nuevo[id]
        return nuevo
      })
      
      return nuevasTarjetas
    })
  }

  /**
   * Recalcula las métricas de una tarjeta usando su currentInput.
   * Actualiza el resultado, veredicto y los valores derivados de la tarjeta.
   */
  const recalcularTarjeta = async (tarjetaId: string) => {
    const tarjeta = analisis.find((c) => c.id === tarjetaId);
    if (!tarjeta) return;
    await recalcularTarjetaConInput(tarjetaId, tarjeta.currentInput);
  }

  /**
   * Maneja el cambio de un campo editable en una tarjeta.
   * Actualiza currentInput y recalcula automáticamente.
   * El debounce se maneja en CardAnalisis.
   */
  const handleInputChange = (tarjetaId: string, campo: keyof FormularioRentabilidadState, valor: number | string | boolean) => {
    setAnalisis((prev) => {
      const tarjetaActualizada = prev.find((c) => c.id === tarjetaId);
      if (!tarjetaActualizada) return prev;

      const nuevoCurrentInput = {
        ...tarjetaActualizada.currentInput,
        [campo]: valor,
      };

      // Recalcular inmediatamente con el nuevo input (el debounce ya se maneja en CardAnalisis)
      // Usar setTimeout para asegurar que el estado se actualice primero
      setTimeout(() => {
        recalcularTarjetaConInput(tarjetaId, nuevoCurrentInput);
      }, 0);

      return prev.map((c) =>
        c.id === tarjetaId
          ? {
              ...c,
              currentInput: nuevoCurrentInput,
            }
          : c
      );
    });
  }

  /**
   * Recalcula las métricas de una tarjeta usando un input específico.
   * Versión interna que acepta el input directamente para evitar problemas de sincronización.
   */
  const recalcularTarjetaConInput = async (tarjetaId: string, input: FormularioRentabilidadState) => {
    try {
      const nuevoResultado = await calcularRentabilidadApi(input);
      const nuevoVeredicto = mapResultadosToVerdict(nuevoResultado);

      // Actualizar resultado
      setResultadosPorTarjeta((prev) => ({ ...prev, [tarjetaId]: nuevoResultado }));

      // Actualizar tarjeta con nuevos valores derivados
      const rentNetaRaw = Number(nuevoResultado.rentabilidadNeta);
      const rentNetaPct =
        !Number.isNaN(rentNetaRaw) && rentNetaRaw > -1 && rentNetaRaw < 1
          ? rentNetaRaw * 100
          : rentNetaRaw;

      setAnalisis((prev) => {
        const tarjetaActual = prev.find((c) => c.id === tarjetaId);
        if (!tarjetaActual) return prev;

        // Solo cambiar la ciudad si cambió la comunidad autónoma
        let nuevaCiudad = tarjetaActual.ciudad;
        if (tarjetaActual.currentInput.comunidadAutonoma !== input.comunidadAutonoma) {
          const { obtenerCiudadAleatoria } = require('./utils/ciudades');
          nuevaCiudad = obtenerCiudadAleatoria(input.comunidadAutonoma);
        }

        return prev.map((c) =>
          c.id === tarjetaId
            ? {
                ...c,
                precioCompra: input.precioCompra,
                alquilerEstimado: input.alquilerMensual,
                ciudad: nuevaCiudad,
                rentabilidadNetaPct: rentNetaPct,
                estado: nuevoVeredicto.estado,
                veredictoTitulo: nuevoVeredicto.titulo,
                veredictoRazones: nuevoVeredicto.razones,
              }
            : c
        );
      });

      // Si es la tarjeta activa, actualizar también el resultado global
      setTarjetaActivaId((activaId) => {
        if (activaId === tarjetaId) {
          setResultado(nuevoResultado);
          setVeredictoGlobal(nuevoVeredicto);
        }
        return activaId;
      });
    } catch (err) {
      console.error('Error al recalcular tarjeta:', err);
      // No mostrar error global, solo en consola para no interrumpir la UX
    }
  }

  /**
   * Exporta todas las tarjetas a CSV
   */
  const handleExportarCSV = () => {
    try {
      const csvContent = cardsToCSV(analisis, resultadosPorTarjeta)
      downloadCSV(csvContent)
      mostrarNotificacion('CSV exportado correctamente', 'success')
    } catch (error) {
      console.error('Error exportando CSV:', error)
      mostrarNotificacion('No se pudo exportar el CSV', 'error')
    }
  }

  /**
   * Limpia todas las tarjetas y el localStorage (Nuevo análisis).
   */
  const handleNuevoAnalisis = () => {
    if (window.confirm('¿Quieres borrar todos los análisis actuales?')) {
      setAnalisis([])
      setResultadosPorTarjeta({})
      setCreatedAtPorTarjeta({})
      setResultado(null)
      setVeredictoGlobal(null)
      setTarjetaActivaId(null)
      setModalAbierto(false)
      setTarjetasExpandidas(new Set())
      clearCards()
      // Resetear URL input
      setResetUrlTrigger((prev) => prev + 1)
    }
  }

  /**
   * Limpia todas las tarjetas y el localStorage (alias para mantener compatibilidad).
   */
  const handleLimpiarTodo = handleNuevoAnalisis

  /**
   * Revierte los cambios de una tarjeta restaurando originalInput.
   */
  const handleRevert = (tarjetaId: string) => {
    setAnalisis((prev) => {
      const tarjeta = prev.find((c) => c.id === tarjetaId);
      if (!tarjeta) return prev;

      const originalInput = { ...tarjeta.originalInput };

      // Recalcular con valores originales usando el input directamente
      recalcularTarjetaConInput(tarjetaId, originalInput);

      return prev.map((c) =>
        c.id === tarjetaId
          ? {
              ...c,
              currentInput: originalInput,
            }
          : c
      );
    });
  }

  /**
   * Comparte una tarjeta mediante link (copia al portapapeles)
   */
  const handleShareLink = async (cardId: string) => {
    const card = analisis.find((c) => c.id === cardId)
    const resultado = resultadosPorTarjeta[cardId]
    
    if (!card || !resultado) {
      mostrarNotificacion('No se puede compartir: faltan datos de la tarjeta', 'error')
      return
    }

    try {
      const shareableData: ShareableCardData[] = [{ card, motorOutput: resultado }]
      const url = generateShareableUrl(shareableData)
      await copyToClipboard(url)
      mostrarNotificacion('Link copiado al portapapeles', 'success')
    } catch (error) {
      console.error('Error compartiendo link:', error)
      mostrarNotificacion('No se pudo copiar el link', 'error')
    }
  }


  return (
    <div className="app">
      {/* Notificación toast */}
      {notificacion && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            padding: '12px 24px',
            backgroundColor: notificacion.tipo === 'success' ? '#4caf50' : '#f44336',
            color: '#fff',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            fontSize: 14,
            fontWeight: 500,
            maxWidth: '90%',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {notificacion.mensaje}
        </div>
      )}
      <HeaderRentabilidad onAnalizar={handleAnalizar} loading={loading} resetUrlTrigger={resetUrlTrigger} />
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
                <div 
                  style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => handleOrdenar('roce')}
                >
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>ROCE</strong>
                  {ordenarPor.campo === 'roce' && (
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
                  <div key={card.id} data-card-id={card.id}>
                    <CardAnalisis
                        card={card}
                        isActive={mostrarDetalle}
                        onClick={() => handleClickTarjeta(card.id)}
                        onDelete={() => handleEliminarTarjeta(card.id)}
                        mostrarDetalle={mostrarDetalle}
                        resultado={resultadoParaDetalle ?? undefined}
                        onInputChange={(campo, valor) => handleInputChange(card.id, campo, valor)}
                        onRevert={() => handleRevert(card.id)}
                        onShareLink={() => handleShareLink(card.id)}
                      />
                    {/* Detalle debajo de la tarjeta: toggle al hacer clic */}
                    {mostrarDetalle && resultadoParaDetalle && (
                      <div className="card-detalle-expandido">
                        <DetalleAnalisis
                          card={card}
                          resultado={resultadoParaDetalle}
                          isHorizontalLayout={true}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
            {/* Botones de acción debajo de las tarjetas */}
            <div style={{ padding: '16px', backgroundColor: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={handleExportarCSV}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  backgroundColor: '#1976d2',
                  border: '1px solid #1976d2',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: '#fff',
                  transition: 'all 0.2s',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1565c0';
                  e.currentTarget.style.borderColor = '#1565c0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1976d2';
                  e.currentTarget.style.borderColor = '#1976d2';
                }}
                title="Exportar todas las tarjetas a CSV"
              >
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={handleNuevoAnalisis}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  backgroundColor: '#fff',
                  border: '1px solid #ccc',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: '#666',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.borderColor = '#999';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.borderColor = '#ccc';
                }}
                title="Empezar un nuevo análisis (borrar todas las tarjetas)"
              >
                Nuevo análisis
              </button>
            </div>
          </div>
        )}
        
        {/* Mobile: mostrar modal cuando está abierto */}
        {tarjetaActiva && resultadosPorTarjeta[tarjetaActiva.id] && (
          <ModalDetalle
            card={tarjetaActiva}
            resultado={resultadosPorTarjeta[tarjetaActiva.id]}
            isOpen={modalAbierto}
            onClose={() => setModalAbierto(false)}
          />
        )}
      </main>
    </div>
  )
}

export default App
