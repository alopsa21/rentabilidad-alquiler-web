import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { HeroSearch } from './components/HeroSearch'
import { CompactSearchHeader } from './components/CompactSearchHeader'
import { CardAnalisis } from './components/CardAnalisis'
// Lazy load de componentes pesados para mejorar rendimiento inicial
const DetalleAnalisis = lazy(() => import('./components/DetalleAnalisis').then(m => ({ default: m.DetalleAnalisis })))
import { ModalDetalle } from './components/ModalDetalle'
import { ModalNotas } from './components/ModalNotas'
import { ModalCompartirSelectivo } from './components/ModalCompartirSelectivo'
import { calcularRentabilidadApi } from './services/api'
import { COMUNIDADES_AUTONOMAS } from './constants/comunidades'
import type { RentabilidadApiResponse } from './types/api'
import type { FormularioRentabilidadState } from './types/formulario'
import type { AnalisisCard } from './types/analisis'
import type { VeredictoHumano } from './utils/veredicto'
import { mapResultadosToVerdict } from './utils/veredicto'
import { loadCards, saveCards, clearCards } from './utils/storage'
import { STORAGE_KEY_HAS_ANALYZED } from './constants/storage'
import { getFavoriteCards, calculatePortfolioStats, calculatePortfolioScore, getScoreColor } from './utils/portfolioStats'
import { generateShareableUrl, copyToClipboard, getStateFromUrl, deserializeCards, type ShareableCardData } from './utils/share'
import { inputsAreEqual } from './utils/compareInputs'
import { cardsToCSV, downloadCSV } from './utils/csv'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
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
  const [, setResultado] = useState<RentabilidadApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analisis, setAnalisis] = useState<AnalisisCard[]>([])
  const [resultadosPorTarjeta, setResultadosPorTarjeta] = useState<Record<string, RentabilidadApiResponse>>({})
  /** Resultado con originalInput; se guarda al primer cambio para mostrar deltas (y al compartir/cargar URL) */
  const [resultadoOriginalPorTarjeta, setResultadoOriginalPorTarjeta] = useState<Record<string, RentabilidadApiResponse>>({})
  const [, setVeredictoGlobal] = useState<VeredictoHumano | null>(null)
  const [tarjetaActivaId, setTarjetaActivaId] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ordenarPor, setOrdenarPor] = useState<{ campo: string | null; direccion: 'asc' | 'desc' }>({ campo: null, direccion: 'asc' })
  const [tarjetasExpandidas, setTarjetasExpandidas] = useState<Set<string>>(new Set())
  const [isHydrated, setIsHydrated] = useState(false)
  const [createdAtPorTarjeta, setCreatedAtPorTarjeta] = useState<Record<string, string>>({})
  const [, setResetUrlTrigger] = useState(0)
  const [notificacion, setNotificacion] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)
  const [vistaFiltro, setVistaFiltro] = useState<'all' | 'favorites'>('all')
  const [modalNotasCardId, setModalNotasCardId] = useState<string | null>(null)
  const [modalLimpiarPanelOpen, setModalLimpiarPanelOpen] = useState(false)
  const [modalCompartirSelectivoOpen, setModalCompartirSelectivoOpen] = useState(false)
  const [hasUserAnalyzedBefore, setHasUserAnalyzedBefore] = useState(false)

  // OPTIMIZACIÓN CRÍTICA: usar refs para evitar recrear callbacks
  const analisisRef = useRef(analisis)
  const resultadosPorTarjetaRef = useRef(resultadosPorTarjeta)
  
  // Mantener refs actualizados
  useEffect(() => {
    analisisRef.current = analisis
  }, [analisis])
  
  useEffect(() => {
    resultadosPorTarjetaRef.current = resultadosPorTarjeta
  }, [resultadosPorTarjeta])

  // Función helper para mostrar notificaciones
  const mostrarNotificacion = (mensaje: string, tipo: 'success' | 'error' = 'success') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => {
      setNotificacion(null)
    }, 3000)
  }

  // Hidratación inicial: cargar tarjetas desde localStorage o URL al montar
  useEffect(() => {
    let hasAnalyzed = false

    // Primero intentar cargar desde URL (tiene prioridad)
    const stateFromUrl = getStateFromUrl()
    if (stateFromUrl) {
      try {
        const sharedCards = deserializeCards(stateFromUrl)
        const cards: AnalisisCard[] = []
        const resultados: Record<string, RentabilidadApiResponse> = {}
        const resultadosOriginal: Record<string, RentabilidadApiResponse> = {}

        sharedCards.forEach((item) => {
          const { card, motorOutput, motorOutputOriginal } = item
          cards.push({ ...card, isFavorite: card.isFavorite ?? false, notes: card.notes ?? '' })
          resultados[card.id] = motorOutput
          if (motorOutputOriginal) resultadosOriginal[card.id] = motorOutputOriginal
        })

        // CRÍTICO: Limpiar localStorage antes de cargar desde URL
        // para evitar mezclar tarjetas compartidas con tarjetas antiguas
        try {
          clearCards()
        } catch (error) {
          console.error('Error clearing localStorage:', error)
        }
        
        setAnalisis(cards)
        setResultadosPorTarjeta(resultados)
        setResultadoOriginalPorTarjeta(resultadosOriginal)
        setCreatedAtPorTarjeta({})
        if (cards.length > 0) {
          hasAnalyzed = true
          try { localStorage.setItem(STORAGE_KEY_HAS_ANALYZED, '1') } catch { /* ignore */ }
        }
        window.history.replaceState({}, '', window.location.pathname)
        setIsHydrated(true)
        setHasUserAnalyzedBefore(hasAnalyzed)
        return
      } catch (error) {
        console.error('Error cargando tarjetas desde URL:', error)
      }
    }

    // Si no hay URL o falló, cargar desde localStorage
    const loaded = loadCards()
    if (loaded.length > 0) {
      const cards: AnalisisCard[] = []
      const resultados: Record<string, RentabilidadApiResponse> = {}
      const createdAt: Record<string, string> = {}

      loaded.forEach(({ card, motorOutput, createdAt: cardCreatedAt }) => {
        cards.push({ ...card, isFavorite: card.isFavorite ?? false, notes: card.notes ?? '' })
        resultados[card.id] = motorOutput
        if (cardCreatedAt) {
          createdAt[card.id] = cardCreatedAt
        }
      })

      setAnalisis(cards)
      setResultadosPorTarjeta(resultados)
      setResultadoOriginalPorTarjeta({})
      setCreatedAtPorTarjeta(createdAt)
      hasAnalyzed = true
      try { localStorage.setItem(STORAGE_KEY_HAS_ANALYZED, '1') } catch { /* ignore */ }
    } else {
      try {
        hasAnalyzed = localStorage.getItem(STORAGE_KEY_HAS_ANALYZED) === '1' || localStorage.getItem(STORAGE_KEY_HAS_ANALYZED) === 'true'
      } catch { /* ignore */ }
    }
    setIsHydrated(true)
    setHasUserAnalyzedBefore(hasAnalyzed)
  }, [])

  // Sincronización automática con DEBOUNCE: guardar en localStorage cuando cambien las tarjetas o resultados
  // OPTIMIZACIÓN CRÍTICA: debounce para evitar escrituras constantes que bloquean el hilo principal
  useEffect(() => {
    // Solo sincronizar después de la hidratación inicial para evitar guardar datos vacíos
    if (!isHydrated || analisis.length === 0) {
      return
    }

    // Guardar solo si hay tarjetas y resultados correspondientes
    const todasTienenResultados = analisis.every((card) => resultadosPorTarjeta[card.id])
    if (!todasTienenResultados) {
      return
    }

    // Debounce de 500ms para evitar escrituras constantes en localStorage (bloqueante)
    const timeoutId = setTimeout(() => {
      saveCards(analisis, resultadosPorTarjeta, createdAtPorTarjeta)
    }, 500)

    return () => clearTimeout(timeoutId)
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
        isFavorite: false,
        notes: '',
      }

      const ahora = new Date().toISOString()
      setAnalisis((prev) => [nuevaTarjeta, ...prev])
      setResultadosPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: data }))
      setCreatedAtPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: ahora }))
      setHasUserAnalyzedBefore(true)
      try { localStorage.setItem(STORAGE_KEY_HAS_ANALYZED, '1') } catch { /* ignore */ }
      // No establecer tarjetaActivaId ni expandir automáticamente
      // La tarjeta aparecerá sin resaltar hasta que el usuario haga clic
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setLoading(false)
    }
  }

  const tarjetaActiva = analisis.find((c) => c.id === tarjetaActivaId)

  const handleToggleFavorite = useCallback((id: string) => {
    setAnalisis((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c))
    )
  }, [])

  const handleOpenNotes = useCallback((cardId: string) => {
    setModalNotasCardId(cardId)
  }, [])

  const handleSaveNotas = (cardId: string, notes: string) => {
    setAnalisis((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, notes } : c))
    )
    setModalNotasCardId(null)
  }

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

  // Filtrar por vista (Todas / Mi Portfolio) - memoizado
  const analisisParaLista = useMemo(
    () => vistaFiltro === 'favorites' ? analisis.filter((c) => c.isFavorite) : analisis,
    [analisis, vistaFiltro]
  )

  const favoriteCards = useMemo(() => getFavoriteCards(analisis), [analisis])
  const portfolioStats = useMemo(
    () => calculatePortfolioStats(favoriteCards, resultadosPorTarjeta),
    [favoriteCards, resultadosPorTarjeta]
  )
  const portfolioScore = useMemo(
    () => calculatePortfolioScore(favoriteCards, resultadosPorTarjeta),
    [favoriteCards, resultadosPorTarjeta]
  )
  const scoreColorKey = getScoreColor(portfolioScore)
  const scoreColorMap = { verde: '#2e7d32', amarillo: '#f9a825', rojo: '#c62828' } as const
  const scoreColor = scoreColorMap[scoreColorKey]

  // Ordenar tarjetas según el criterio seleccionado - memoizado y optimizado
  const analisisOrdenados = useMemo(() => {
    if (!ordenarPor.campo) return analisisParaLista;
    // Crear copia solo si realmente necesitamos ordenar
    const copia = [...analisisParaLista];
    return copia.sort((a, b) => {
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
    });
  }, [analisisParaLista, ordenarPor, resultadosPorTarjeta])

  const handleClickTarjeta = useCallback((id: string) => {
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
  }, [])

  const handleEliminarTarjeta = useCallback((id: string) => {
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
  }, [tarjetaActivaId])

  /**
   * Maneja el cambio de un campo editable en una tarjeta.
   * Actualiza currentInput y recalcula automáticamente.
   * En el primer cambio guarda el resultado actual como "original" para mostrar deltas.
   */
  const handleInputChange = useCallback((tarjetaId: string, campo: keyof FormularioRentabilidadState, valor: number | string | boolean) => {
    const tarjeta = analisisRef.current.find((c) => c.id === tarjetaId);
    // Comparación eficiente sin JSON.stringify
    const hadNoChanges = tarjeta && inputsAreEqual(tarjeta.currentInput, tarjeta.originalInput);
    if (hadNoChanges && resultadosPorTarjetaRef.current[tarjetaId]) {
      setResultadoOriginalPorTarjeta((prev) => ({ ...prev, [tarjetaId]: resultadosPorTarjetaRef.current[tarjetaId] }));
    }
    setAnalisis((prev) => {
      const tarjetaActualizada = prev.find((c) => c.id === tarjetaId);
      if (!tarjetaActualizada) return prev;

      const nuevoCurrentInput = {
        ...tarjetaActualizada.currentInput,
        [campo]: valor,
      };

      // Usar queueMicrotask en lugar de setTimeout(0) para mejor rendimiento
      queueMicrotask(() => {
        recalcularTarjetaConInput(tarjetaId, nuevoCurrentInput);
      });

      return prev.map((c) =>
        c.id === tarjetaId
          ? {
              ...c,
              currentInput: nuevoCurrentInput,
            }
          : c
      );
    });
  }, []) // OPTIMIZACIÓN: sin dependencias porque usamos refs

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

      // Resolver nueva ciudad si cambió la comunidad (fuera del setState para poder usar await)
      const tarjetaActual = analisis.find((c) => c.id === tarjetaId);
      let nuevaCiudad: string | null = null;
      if (tarjetaActual && tarjetaActual.currentInput.comunidadAutonoma !== input.comunidadAutonoma) {
        const { obtenerCiudadAleatoria } = await import('./utils/ciudades');
        nuevaCiudad = obtenerCiudadAleatoria(input.comunidadAutonoma);
      }

      setAnalisis((prev) => {
        const t = prev.find((c) => c.id === tarjetaId);
        if (!t) return prev;
        const ciudad = nuevaCiudad !== null ? nuevaCiudad : t.ciudad;
        return prev.map((c) =>
          c.id === tarjetaId
            ? {
                ...c,
                precioCompra: input.precioCompra,
                alquilerEstimado: input.alquilerMensual,
                ciudad,
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
      // Exportar lo que está visible según el filtro (Todas o Favoritos)
      const csvContent = cardsToCSV(analisisParaLista, resultadosPorTarjeta)
      downloadCSV(csvContent)
      mostrarNotificacion('CSV exportado correctamente', 'success')
    } catch (error) {
      console.error('Error exportando CSV:', error)
      mostrarNotificacion('No se pudo exportar el CSV', 'error')
    }
  }

  /**
   * Limpia todas las tarjetas y el localStorage (Limpiar panel).
   */
  const handleConfirmarLimpiarPanel = () => {
    setAnalisis([])
    setResultadosPorTarjeta({})
    setResultadoOriginalPorTarjeta({})
    setCreatedAtPorTarjeta({})
    setResultado(null)
    setVeredictoGlobal(null)
    setTarjetaActivaId(null)
    setModalAbierto(false)
    setTarjetasExpandidas(new Set())
    clearCards()
    setResetUrlTrigger((prev) => prev + 1)
    setModalLimpiarPanelOpen(false)
  }

  const handleNuevoAnalisis = () => {
    setModalLimpiarPanelOpen(true)
  }

  /**
   * Revierte los cambios de una tarjeta restaurando originalInput.
   */
  /**
   * Revierte un solo campo (precio compra o alquiler) al valor original.
   */
  const handleRevertField = useCallback((tarjetaId: string, campo: 'precioCompra' | 'alquilerMensual') => {
    setAnalisis((prev) => {
      const tarjeta = prev.find((c) => c.id === tarjetaId);
      if (!tarjeta) return prev;

      const nuevoCurrentInput = {
        ...tarjeta.currentInput,
        [campo]: tarjeta.originalInput[campo],
      };

      const quedaSinCambios = inputsAreEqual(nuevoCurrentInput, tarjeta.originalInput);
      if (quedaSinCambios) {
        setResultadoOriginalPorTarjeta((p) => {
          const next = { ...p };
          delete next[tarjetaId];
          return next;
        });
      }

      recalcularTarjetaConInput(tarjetaId, nuevoCurrentInput);

      return prev.map((c) =>
        c.id === tarjetaId
          ? { ...c, currentInput: nuevoCurrentInput }
          : c
      );
    });
  }, []) // OPTIMIZACIÓN: sin dependencias, todo dentro de setState

  /**
   * Abre el modal para seleccionar tarjetas a compartir
   */
  const handleShareAll = () => {
    if (analisis.length === 0) {
      mostrarNotificacion('No hay tarjetas para compartir', 'error')
      return
    }
    setModalCompartirSelectivoOpen(true)
  }

  /**
   * Comparte las tarjetas seleccionadas mediante link (copia al portapapeles)
   */
  const handleShareSelected = async (cardIds: string[]) => {
    if (cardIds.length === 0) {
      mostrarNotificacion('Selecciona al menos una tarjeta para compartir', 'error')
      return
    }

    try {
      const shareableData: ShareableCardData[] = cardIds
        .map((cardId) => {
          const card = analisis.find((c) => c.id === cardId)
          if (!card || !resultadosPorTarjeta[cardId]) return null
          
          const hasChanges = !inputsAreEqual(card.currentInput, card.originalInput)
          const original = hasChanges ? resultadoOriginalPorTarjeta[cardId] : undefined
          return {
            card,
            motorOutput: resultadosPorTarjeta[cardId],
            ...(original && { motorOutputOriginal: original }),
          }
        })
        .filter((item): item is ShareableCardData => item !== null)

      if (shareableData.length === 0) {
        mostrarNotificacion('No hay tarjetas completas para compartir', 'error')
        return
      }

      const url = generateShareableUrl(shareableData)
      await copyToClipboard(url)
      mostrarNotificacion(`Link copiado al portapapeles (${shareableData.length} tarjeta${shareableData.length > 1 ? 's' : ''})`, 'success')
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
      {analisis.length === 0 && !hasUserAnalyzedBefore ? (
        <>
          <HeroSearch onAnalizar={handleAnalizar} loading={loading} />
          <main className="app-main">
            {error && (
              <p role="alert" className="app-error">
                {error}
              </p>
            )}
          </main>
        </>
      ) : (
        <>
          <CompactSearchHeader onAnalizar={handleAnalizar} loading={loading} />
          <main className="app-main">
        {error && (
          <p role="alert" className="app-error">
            {error}
          </p>
        )}
          <div className="app-layout-desktop layout-horizontal">
            {/* Tabs Todas / Mi Portfolio */}
            <Box sx={{ display: 'flex', gap: 0, pt: 1, px: 2, borderBottom: '1px solid #e0e0e0', mb: 1 }}>
              <Button
                variant="text"
                onClick={() => setVistaFiltro('all')}
                disableRipple
                sx={{
                  color: vistaFiltro === 'all' ? 'primary.main' : 'text.secondary',
                  borderRadius: 0,
                  outline: 'none',
                  border: 'none',
                  '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:focus-visible': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:active': { outline: 'none', border: 'none', boxShadow: 'none' },
                }}
              >
                Todas
              </Button>
              <Button
                variant="text"
                onClick={() => setVistaFiltro('favorites')}
                disableRipple
                sx={{
                  color: vistaFiltro === 'favorites' ? 'primary.main' : 'text.secondary',
                  borderRadius: 0,
                  outline: 'none',
                  border: 'none',
                  '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:focus-visible': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:active': { outline: 'none', border: 'none', boxShadow: 'none' },
                }}
              >
                Mi Portfolio
              </Button>
            </Box>
            {/* Stats del portfolio (solo en vista Mi Portfolio) */}
            {vistaFiltro === 'favorites' && (
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: 8,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px 24px',
                  alignItems: 'center',
                }}
                aria-label="Resumen del portfolio"
              >
                <strong style={{ fontSize: 15, color: '#333', marginRight: 8 }}>
                  📊 Mi portfolio
                </strong>
                <span style={{ fontSize: 14, color: '#555' }}>
                  Propiedades: {portfolioStats.count}
                </span>
                <span style={{ fontSize: 14, color: '#555' }}>
                  ROE medio:{' '}
                  {portfolioStats.avgROE !== null
                    ? `${portfolioStats.avgROE.toFixed(2)} %`
                    : '—'}
                </span>
                <span style={{ fontSize: 14, color: '#555' }}>
                  Cashflow anual total:{' '}
                  {portfolioStats.totalCashflow >= 0 ? '+' : ''}
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                  }).format(portfolioStats.totalCashflow)}
                </span>
                <span style={{ fontSize: 14, color: scoreColor, fontWeight: 600 }}>
                  🏆 Score: {portfolioScore} / 100
                </span>
              </div>
            )}
            {/* Cabecera sticky con títulos de columnas */}
            <div className="card-header-sticky card-header-full-width" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '1rem', width: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }} className="card-info-horizontal card-header-row">
                <div style={{ flex: '1.2 1 0', minWidth: 0, display: 'flex', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Inmueble</strong>
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('ciudad')}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Ciudad</strong>
                  {ordenarPor.campo === 'ciudad' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('precio')}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Precio compra</strong>
                  {ordenarPor.campo === 'precio' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('alquiler')}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Alquiler estimado</strong>
                  {ordenarPor.campo === 'alquiler' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('rentabilidad')}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Rentabilidad neta</strong>
                  {ordenarPor.campo === 'rentabilidad' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('cashflow')}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Cashflow</strong>
                  {ordenarPor.campo === 'cashflow' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
                <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('roce')}>
                  <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>ROCE</strong>
                  {ordenarPor.campo === 'roce' && (
                    <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </div>
            </div>
            {/* Panel de tarjetas: ancho completo */}
            <section aria-label="Panel de tarjetas" className="app-panel-tarjetas app-panel-tarjetas-horizontal">
              {analisisOrdenados.length === 0 && vistaFiltro === 'all' ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ fontSize: 15, color: 'text.secondary' }}>
                    Aún no has analizado ningún piso.
                  </Typography>
                </Box>
              ) : (
                analisisOrdenados.map((card) => {
                const mostrarDetalle = tarjetasExpandidas.has(card.id)
                const resultadoParaDetalle = resultadosPorTarjeta[card.id] || null
                return (
                  <div key={card.id} data-card-id={card.id}>
                    <CardAnalisis
                        card={card}
                        isActive={mostrarDetalle}
                        onClick={() => handleClickTarjeta(card.id)}
                        onDelete={() => handleEliminarTarjeta(card.id)}
                        onToggleFavorite={() => handleToggleFavorite(card.id)}
                        onOpenNotes={() => handleOpenNotes(card.id)}
                        resultado={resultadoParaDetalle ?? undefined}
                        resultadoOriginal={resultadoOriginalPorTarjeta[card.id]}
                        onInputChange={(campo, valor) => handleInputChange(card.id, campo, valor)}
                        onRevertField={(campo) => handleRevertField(card.id, campo)}
                      />
                    {/* Detalle debajo de la tarjeta: toggle al hacer clic */}
                    {mostrarDetalle && resultadoParaDetalle && (
                      <div className="card-detalle-expandido">
                        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Cargando...</div>}>
                          <DetalleAnalisis
                            card={card}
                            resultado={resultadoParaDetalle}
                            isHorizontalLayout={true}
                          />
                        </Suspense>
                      </div>
                    )}
                  </div>
                )
              })
              )}
            </section>
            {/* Botones de acción debajo de las tarjetas */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={analisis.length === 0}
                onClick={handleShareAll}
                title="Compartir todas las tarjetas (copiar link)"
                disableRipple
                sx={{
                  outline: 'none',
                  border: 'none',
                  '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:focus-visible': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:active': { outline: 'none', border: 'none', boxShadow: 'none' },
                }}
              >
                Compartir
              </Button>
              <Button
                variant="contained"
                size="small"
                disabled={analisis.length === 0}
                onClick={handleExportarCSV}
                title="Exportar todas las tarjetas a CSV"
                disableRipple
                sx={{
                  outline: 'none',
                  border: 'none',
                  '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:focus-visible': { outline: 'none', border: 'none', boxShadow: 'none' },
                  '&:active': { outline: 'none', border: 'none', boxShadow: 'none' },
                }}
              >
                Exportar
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleNuevoAnalisis}
                title="Borrar todas las tarjetas y limpiar el panel"
                disableRipple
                sx={{
                  outline: 'none',
                  '&:focus': { outline: 'none', boxShadow: 'none' },
                  '&:focus-visible': { outline: 'none', boxShadow: 'none' },
                  '&:active': { outline: 'none', boxShadow: 'none' },
                }}
              >
                Limpiar
              </Button>
            </Box>
          </div>
        
        {/* Mobile: mostrar modal cuando está abierto */}
        {tarjetaActiva && resultadosPorTarjeta[tarjetaActiva.id] && (
          <ModalDetalle
            card={tarjetaActiva}
            resultado={resultadosPorTarjeta[tarjetaActiva.id]}
            isOpen={modalAbierto}
            onClose={() => setModalAbierto(false)}
          />
        )}

        {/* Modal confirmar limpiar panel */}
        {modalLimpiarPanelOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-limpiar-titulo"
            onClick={() => setModalLimpiarPanelOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              boxSizing: 'border-box',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#fff',
                width: '100%',
                maxWidth: 400,
                borderRadius: 12,
                padding: 24,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              <Typography id="modal-limpiar-titulo" variant="h6" component="h2" sx={{ mb: 1.5 }}>
                Limpiar panel
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                ¿Quieres borrar todos los análisis actuales?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => setModalLimpiarPanelOpen(false)}
                  disableRipple
                  sx={{
                    outline: 'none',
                    '&:focus': { outline: 'none', boxShadow: 'none' },
                    '&:focus-visible': { outline: 'none', boxShadow: 'none' },
                    '&:active': { outline: 'none', boxShadow: 'none' },
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleConfirmarLimpiarPanel}
                  disableRipple
                  sx={{
                    outline: 'none',
                    border: 'none',
                    '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
                    '&:focus-visible': { outline: 'none', border: 'none', boxShadow: 'none' },
                    '&:active': { outline: 'none', border: 'none', boxShadow: 'none' },
                  }}
                >
                  Limpiar panel
                </Button>
              </Box>
            </div>
          </div>
        )}

        {/* Modal notas por tarjeta */}
        {modalNotasCardId && (() => {
          const cardNotas = analisis.find((c) => c.id === modalNotasCardId)
          return cardNotas ? (
            <ModalNotas
              isOpen={true}
              onClose={() => setModalNotasCardId(null)}
              initialNotes={cardNotas.notes ?? ''}
              onSave={(notes) => handleSaveNotas(modalNotasCardId, notes)}
            />
          ) : null
        })()}

        {/* Modal compartir selectivo */}
        <ModalCompartirSelectivo
          isOpen={modalCompartirSelectivoOpen}
          onClose={() => setModalCompartirSelectivoOpen(false)}
          cards={analisisParaLista}
          resultadosPorTarjeta={resultadosPorTarjeta}
          onShare={handleShareSelected}
        />
      </main>
        </>
      )}
    </div>
  )
}

export default App
