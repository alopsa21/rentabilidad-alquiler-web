import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { HeroSearch } from './components/HeroSearch'
import { CompactSearchHeader } from './components/CompactSearchHeader'
import { CardAnalisis } from './components/CardAnalisis'
// Lazy load de componentes pesados para mejorar rendimiento inicial
const DetalleAnalisis = lazy(() => import('./components/DetalleAnalisis').then(m => ({ default: m.DetalleAnalisis })))
import { ModalDetalle } from './components/ModalDetalle'
import { ModalNotas } from './components/ModalNotas'
import { ModalCompartirSelectivo } from './components/ModalCompartirSelectivo'
import { ModalCompletarCampos } from './components/ModalCompletarCampos'
import { calcularRentabilidadApi, autofillFromUrlApi } from './services/api'
import { NOMBRE_COMUNIDAD_POR_CODIGO } from './constants/comunidades'
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
import Tooltip from '@mui/material/Tooltip'
import HomeIcon from '@mui/icons-material/Home'
import PercentIcon from '@mui/icons-material/Percent'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import './App.css'

/** Payload por defecto para mantener la API conectada hasta que la URL se use para obtener datos */
const DEFAULT_PAYLOAD: FormularioRentabilidadState = {
  precioCompra: 150000,
  codigoComunidadAutonoma: 13, // Madrid
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
  const location = useLocation()
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
  /** ID de la tarjeta resaltada al pegar una URL ya analizada (borde de color); se limpia a los pocos segundos */
  const [tarjetaResaltadaPorUrlId, setTarjetaResaltadaPorUrlId] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  // Evitar renderizar hasta confirmar que estamos en la ruta correcta
  const isCorrectRoute = location.pathname === '/'
  const [createdAtPorTarjeta, setCreatedAtPorTarjeta] = useState<Record<string, string>>({})
  const [, setResetUrlTrigger] = useState(0)
  const [notificacion, setNotificacion] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null)
  const [vistaFiltro, setVistaFiltro] = useState<'all' | 'favorites'>('all')
  const [modalNotasCardId, setModalNotasCardId] = useState<string | null>(null)
  const [modalLimpiarPanelOpen, setModalLimpiarPanelOpen] = useState(false)
  const [modalCompartirSelectivoOpen, setModalCompartirSelectivoOpen] = useState(false)
  const [hasUserAnalyzedBefore, setHasUserAnalyzedBefore] = useState(false)
  const [modalCompletarCamposOpen, setModalCompletarCamposOpen] = useState(false)
  const [datosPendientes, setDatosPendientes] = useState<{
    url: string;
    autofillData: any;
    camposFaltantes: {
      habitaciones?: boolean;
      metrosCuadrados?: boolean;
      banos?: boolean;
      codigoComunidadAutonoma?: boolean;
      ciudad?: boolean;
      precioCompra?: boolean;
      alquilerMensual?: boolean;
    };
  } | null>(null)

  // OPTIMIZACIÓN CRÍTICA: usar refs para evitar recrear callbacks
  const analisisRef = useRef(analisis)
  const resultadosPorTarjetaRef = useRef(resultadosPorTarjeta)
  const resultadoOriginalPorTarjetaRef = useRef(resultadoOriginalPorTarjeta)
  
  // Mantener refs actualizados
  useEffect(() => {
    analisisRef.current = analisis
  }, [analisis])
  
  useEffect(() => {
    resultadosPorTarjetaRef.current = resultadosPorTarjeta
  }, [resultadosPorTarjeta])
  
  useEffect(() => {
    resultadoOriginalPorTarjetaRef.current = resultadoOriginalPorTarjeta
  }, [resultadoOriginalPorTarjeta])

  // Función helper para mostrar notificaciones
  const mostrarNotificacion = (mensaje: string, tipo: 'success' | 'error' = 'success') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => {
      setNotificacion(null)
    }, 3000)
  }

  // Hidratación inicial: cargar tarjetas desde localStorage o URL al montar
  useEffect(() => {
    // Solo ejecutar si estamos en la ruta principal
    if (location.pathname !== '/') {
      return
    }
    
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
          cards.push({ 
            ...card, 
            isFavorite: card.isFavorite ?? false, 
            notes: card.notes ?? '',
            originalCiudad: card.originalCiudad ?? card.ciudad,
          })
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
      const resultadosOriginal: Record<string, RentabilidadApiResponse> = {}
      const createdAt: Record<string, string> = {}

      loaded.forEach(({ card, motorOutput, motorOutputOriginal, createdAt: cardCreatedAt }) => {
        cards.push({ ...card, isFavorite: card.isFavorite ?? false, notes: card.notes ?? '' })
        if (motorOutput) {
          resultados[card.id] = motorOutput
        }
        if (motorOutputOriginal) {
          resultadosOriginal[card.id] = motorOutputOriginal
        }
        if (cardCreatedAt) {
          createdAt[card.id] = cardCreatedAt
        }
      })

      setAnalisis(cards)
      setResultadosPorTarjeta(resultados)
      setResultadoOriginalPorTarjeta(resultadosOriginal)
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
  }, [location.pathname])

  // Sincronización automática con DEBOUNCE: guardar en localStorage cuando cambien las tarjetas o resultados
  // OPTIMIZACIÓN CRÍTICA: debounce para evitar escrituras constantes que bloquean el hilo principal
  useEffect(() => {
    // Solo sincronizar después de la hidratación inicial para evitar guardar datos vacíos
    if (!isHydrated || analisis.length === 0) {
      return
    }

    // Debounce de 500ms para evitar escrituras constantes en localStorage (bloqueante)
    const timeoutId = setTimeout(() => {
      saveCards(analisis, resultadosPorTarjeta, resultadoOriginalPorTarjeta, createdAtPorTarjeta)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [analisis, resultadosPorTarjeta, resultadoOriginalPorTarjeta, createdAtPorTarjeta, isHydrated])

  /** Quitar resaltado de tarjeta (borde) a los 4 s de haber pegado una URL duplicada */
  useEffect(() => {
    if (!tarjetaResaltadaPorUrlId) return
    const t = setTimeout(() => setTarjetaResaltadaPorUrlId(null), 4000)
    return () => clearTimeout(t)
  }, [tarjetaResaltadaPorUrlId])

  /** Normaliza URL para comparar (evitar duplicados por trailing slash o espacios) */
  const normalizeUrlForCompare = (u: string) =>
    u.trim().replace(/\/+$/, '')

  const handleAnalizar = async (_url: string) => {
    setError(null)
    setResultado(null)
    setVeredictoGlobal(null)

    const urlNorm = normalizeUrlForCompare(_url)
    const yaExiste = analisis.find(
      (c) => normalizeUrlForCompare(c.url) === urlNorm
    )
    if (yaExiste) {
      mostrarNotificacion('Este piso ya ha sido analizado y está en el panel', 'error')
      setTarjetaResaltadaPorUrlId(yaExiste.id)
      return
    }

    setLoading(true)
    try {
      const autofillData = await autofillFromUrlApi(_url)
      
      // Detectar campos faltantes (obligatorios). Si el API devuelve estimatedRent, el alquiler está completado.
      const alquilerDelApi = autofillData.estimatedRent ?? autofillData.alquilerMensual
      const camposFaltantes = {
        habitaciones: autofillData.rooms == null,
        metrosCuadrados: autofillData.sqm == null,
        banos: autofillData.banos == null,
        codigoComunidadAutonoma: autofillData.codigoComunidadAutonoma == null || autofillData.codigoComunidadAutonoma < 1 || autofillData.codigoComunidadAutonoma > 19,
        ciudad: !autofillData.ciudad,
        precioCompra: autofillData.buyPrice == null,
        alquilerMensual: !(alquilerDelApi != null && alquilerDelApi > 0),
      }
      
      // Crear la tarjeta siempre, incluso si faltan campos (se resaltarán en la tarjeta)
      await crearTarjetaConDatos(_url, autofillData, camposFaltantes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCompletarCampos = async (datos: {
    habitaciones: number;
    metrosCuadrados: number;
    banos: number;
    codigoComunidadAutonoma: number;
    ciudad: string;
    precioCompra: number;
    alquilerMensual: number;
  }) => {
    if (!datosPendientes) return;
    
    setLoading(true);
    try {
      // Crear objeto autofillData con los datos completados
      const autofillDataCompleto = {
        ...datosPendientes.autofillData,
        rooms: datos.habitaciones,
        sqm: datos.metrosCuadrados,
        banos: datos.banos,
        codigoComunidadAutonoma: datos.codigoComunidadAutonoma,
        ciudad: datos.ciudad,
        buyPrice: datos.precioCompra,
        alquilerMensual: datos.alquilerMensual,
      };
      
      await crearTarjetaConDatos(datosPendientes.url, autofillDataCompleto, datosPendientes.camposFaltantes);
      setDatosPendientes(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear tarjeta');
    } finally {
      setLoading(false);
    }
  };

  const crearTarjetaConDatos = async (
    _url: string,
    autofillData: any,
    camposFaltantes: any
  ) => {
    // Usar datos extraídos o valores vacíos (0 o '') si faltan
    const precioCompra = autofillData.buyPrice ?? 0
    const metrosCuadrados = autofillData.sqm ?? 0
    const habitaciones = autofillData.rooms ?? 0
    const banos = autofillData.banos ?? 0
    const codigoComunidadAutonoma = autofillData.codigoComunidadAutonoma ?? 0
    const ciudad = autofillData.ciudad ?? ''
    // Pre-rellenar alquiler con estimación del LLM si está disponible
    const alquilerMensual = autofillData.estimatedRent ?? autofillData.alquilerMensual ?? 0
    
    // Verificar si faltan campos obligatorios
    const faltanCamposObligatorios = 
      camposFaltantes.habitaciones ||
      camposFaltantes.metrosCuadrados ||
      camposFaltantes.banos ||
      camposFaltantes.codigoComunidadAutonoma ||
      camposFaltantes.ciudad ||
      camposFaltantes.precioCompra ||
      camposFaltantes.alquilerMensual
    
    // Input de la tarjeta: guardar valores vacíos (0 o '') cuando faltan campos
    const inputReal: FormularioRentabilidadState = {
      ...DEFAULT_PAYLOAD,
      alquilerMensual: alquilerMensual, // 0 si falta
      precioCompra: precioCompra, // 0 si falta
      codigoComunidadAutonoma: codigoComunidadAutonoma, // 0 si falta
    }
    
    let data: RentabilidadApiResponse | null = null
    let veredicto: VeredictoHumano | null = null
    let rentNetaPct = 0
    let estado: 'verde' | 'amarillo' | 'rojo' = 'amarillo'
    let veredictoTitulo = 'Completa los datos faltantes'
    let veredictoRazones: string[] = []
    
    // Solo calcular rentabilidad si NO faltan campos obligatorios
    if (!faltanCamposObligatorios) {
      data = await calcularRentabilidadApi(inputReal)
      setResultado(data)

      veredicto = mapResultadosToVerdict(data)
      setVeredictoGlobal(veredicto)

      // Construir tarjeta acumulativa
      const rentNetaRaw = Number(data.rentabilidadNeta)
      rentNetaPct =
        !Number.isNaN(rentNetaRaw) && rentNetaRaw > -1 && rentNetaRaw < 1
          ? rentNetaRaw * 100
          : rentNetaRaw
      
      estado = veredicto.estado
      veredictoTitulo = veredicto.titulo
      veredictoRazones = veredicto.razones
    } else {
      // Si faltan campos, crear mensaje informativo
      const camposFaltantesLista: string[] = []
      if (camposFaltantes.habitaciones || camposFaltantes.metrosCuadrados || camposFaltantes.banos) {
        camposFaltantesLista.push('Datos del inmueble')
      }
      if (camposFaltantes.codigoComunidadAutonoma) camposFaltantesLista.push('Comunidad autónoma')
      if (camposFaltantes.ciudad) camposFaltantesLista.push('Ciudad')
      if (camposFaltantes.precioCompra) camposFaltantesLista.push('Precio compra')
      if (camposFaltantes.alquilerMensual) camposFaltantesLista.push('Alquiler estimado')
      
      veredictoRazones = [`Completa los siguientes campos: ${camposFaltantesLista.join(', ')}`]
    }

    const nuevaTarjeta: AnalisisCard = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      url: _url,
      ciudad: ciudad,
      precioCompra: precioCompra,
      alquilerEstimado: alquilerMensual,
      rentabilidadNetaPct: rentNetaPct,
      estado: estado,
      veredictoTitulo: veredictoTitulo,
      veredictoRazones: veredictoRazones,
      habitaciones: habitaciones,
      metrosCuadrados: metrosCuadrados,
      banos: banos,
      originalHabitaciones: habitaciones,
      originalMetrosCuadrados: metrosCuadrados,
      originalBanos: banos,
      originalCiudad: ciudad,
      originalInput: { ...inputReal },
      currentInput: inputReal,
      isFavorite: false,
      notes: '',
      camposFaltantes: Object.keys(camposFaltantes).some(k => camposFaltantes[k as keyof typeof camposFaltantes]) ? camposFaltantes : undefined,
      source: autofillData.source,
    }

    const ahora = new Date().toISOString()
    setAnalisis((prev) => {
      const nuevasTarjetas = [nuevaTarjeta, ...prev]
      // Log temporal para debug
      console.log('📊 Nueva tarjeta creada:', nuevaTarjeta)
      console.log('📋 Campos faltantes:', nuevaTarjeta.camposFaltantes)
      console.log('📦 Todas las tarjetas:', nuevasTarjetas)
      return nuevasTarjetas
    })
    if (data) {
      setResultadosPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: data }))
    }
    setCreatedAtPorTarjeta((prev) => ({ ...prev, [nuevaTarjeta.id]: ahora }))
    setHasUserAnalyzedBefore(true)
    try { localStorage.setItem(STORAGE_KEY_HAS_ANALYZED, '1') } catch { /* ignore */ }
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
  
  // Determinar color del semáforo para Rentabilidad neta media
  // Verde: rent >= 5%, Amarillo: rent >= 3%, Rojo: rent < 3%
  const getRentabilidadColor = (rentabilidad: number | null): string => {
    if (rentabilidad === null) return scoreColorMap.amarillo
    if (rentabilidad >= 5) return scoreColorMap.verde
    if (rentabilidad >= 3) return scoreColorMap.amarillo
    return scoreColorMap.rojo
  }
  const rentabilidadColor = getRentabilidadColor(portfolioStats.avgRentabilidadNeta)
  
  // Determinar color del semáforo para ROE medio usando los mismos umbrales del veredicto
  // Verde: ROCE >= 10%, Amarillo: ROCE >= 7%, Rojo: ROCE < 7%
  const getROEColor = (roe: number | null): string => {
    if (roe === null) return scoreColorMap.amarillo
    if (roe >= 10) return scoreColorMap.verde
    if (roe >= 7) return scoreColorMap.amarillo
    return scoreColorMap.rojo
  }
  const roeColor = getROEColor(portfolioStats.avgROE)
  
  // Determinar color del semáforo para Cashflow anual total
  // Verde: cashflow >= 5000€, Amarillo: cashflow >= 0€ pero < 5000€, Rojo: cashflow < 0€
  const getCashflowColor = (cashflow: number): string => {
    if (cashflow >= 5000) return scoreColorMap.verde
    if (cashflow >= 0) return scoreColorMap.amarillo
    return scoreColorMap.rojo
  }
  const cashflowColor = getCashflowColor(portfolioStats.totalCashflow)

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
    const noTieneOriginal = !resultadoOriginalPorTarjetaRef.current[tarjetaId];
    
    // Guardar resultado original cuando: (1) no tenía cambios antes O (2) tiene cambios pero aún no tiene original guardado
    if ((hadNoChanges || noTieneOriginal) && resultadosPorTarjetaRef.current[tarjetaId]) {
      setResultadoOriginalPorTarjeta((prev) => ({ ...prev, [tarjetaId]: resultadosPorTarjetaRef.current[tarjetaId] }));
    }
    
    // Si editan el alquiler, marcar como editado manualmente
    const esEdicionAlquiler = campo === 'alquilerMensual';
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

      return prev.map((c) => {
        if (c.id !== tarjetaId) return c;
        
        // Si es edición de alquiler, marcar como editado manualmente
        const alquilerEditadoFlag = esEdicionAlquiler ? true : c.alquilerEditado;
        
        // Actualizar camposFaltantes: si se completa un campo que faltaba, marcarlo como completado
        const camposFaltantesActualizados = c.camposFaltantes ? { ...c.camposFaltantes } : undefined;
        
        // Mapear campos del formulario a camposFaltantes
        if (camposFaltantesActualizados) {
          if (campo === 'precioCompra' && typeof valor === 'number' && valor > 0) {
            camposFaltantesActualizados.precioCompra = false;
          }
          if (campo === 'alquilerMensual' && typeof valor === 'number' && valor > 0) {
            camposFaltantesActualizados.alquilerMensual = false;
          }
          if (campo === 'codigoComunidadAutonoma' && typeof valor === 'number' && valor >= 1 && valor <= 19) {
            camposFaltantesActualizados.codigoComunidadAutonoma = false;
          }
          
          // Verificar si todos los campos están completos después de esta actualización
          const todosCompletos = 
            nuevoCurrentInput.precioCompra > 0 &&
            nuevoCurrentInput.codigoComunidadAutonoma >= 1 &&
            nuevoCurrentInput.codigoComunidadAutonoma <= 19 &&
            nuevoCurrentInput.alquilerMensual > 0 &&
            c.ciudad &&
            c.habitaciones > 0 &&
            c.metrosCuadrados > 0 &&
            c.banos > 0;
          
          // Si todos están completos, limpiar camposFaltantes
          if (todosCompletos) {
            return {
              ...c,
              currentInput: nuevoCurrentInput,
              camposFaltantes: undefined,
              alquilerEditado: alquilerEditadoFlag,
            };
          }
        }
        
        return {
          ...c,
          currentInput: nuevoCurrentInput,
          camposFaltantes: camposFaltantesActualizados,
          alquilerEditado: alquilerEditadoFlag,
        };
      });
    });
  }, []) // OPTIMIZACIÓN: sin dependencias porque usamos refs

  /**
   * Maneja el cambio de ciudad en una tarjeta.
   */
  const handleCiudadChange = useCallback((tarjetaId: string, ciudad: string) => {
    setAnalisis((prev) => {
      return prev.map((c) => {
        if (c.id !== tarjetaId) return c;
        
        const camposFaltantesActualizados = c.camposFaltantes ? { ...c.camposFaltantes } : undefined;
        if (camposFaltantesActualizados && ciudad) {
          camposFaltantesActualizados.ciudad = false;
        }
        
        // Verificar si todos los campos están completos después de esta actualización
        const todosCompletos = 
          c.currentInput.precioCompra > 0 &&
          c.currentInput.codigoComunidadAutonoma >= 1 &&
          c.currentInput.codigoComunidadAutonoma <= 19 &&
          c.currentInput.alquilerMensual > 0 &&
          ciudad &&
          c.habitaciones > 0 &&
          c.metrosCuadrados > 0 &&
          c.banos > 0;
        
        // Si todos están completos, limpiar camposFaltantes y recalcular
        if (todosCompletos) {
          // Recalcular en el siguiente tick para evitar problemas de sincronización
          setTimeout(() => {
            const tarjetaActualizada = analisisRef.current.find((t) => t.id === tarjetaId);
            if (tarjetaActualizada) {
              recalcularTarjetaConInput(tarjetaId, tarjetaActualizada.currentInput);
            }
          }, 0);
          
          return {
            ...c,
            ciudad,
            camposFaltantes: undefined,
          };
        }
        
        return {
          ...c,
          ciudad,
          camposFaltantes: camposFaltantesActualizados,
        };
      });
    });
  }, []);

  const handleInmuebleChange = useCallback((tarjetaId: string, campo: 'habitaciones' | 'metrosCuadrados' | 'banos', valor: number) => {
    setAnalisis((prev) => {
      return prev.map((c) => {
        if (c.id !== tarjetaId) return c;
        
        const camposFaltantesActualizados = c.camposFaltantes ? { ...c.camposFaltantes } : undefined;
        if (camposFaltantesActualizados && valor > 0) {
          camposFaltantesActualizados[campo] = false;
        }
        
        // Verificar si todos los campos están completos después de esta actualización
        const todosCompletos = 
          c.currentInput.precioCompra > 0 &&
          c.currentInput.codigoComunidadAutonoma >= 1 &&
          c.currentInput.codigoComunidadAutonoma <= 19 &&
          c.currentInput.alquilerMensual > 0 &&
          c.ciudad &&
          (campo === 'habitaciones' ? valor : c.habitaciones) > 0 &&
          (campo === 'metrosCuadrados' ? valor : c.metrosCuadrados) > 0 &&
          (campo === 'banos' ? valor : c.banos) > 0;
        
        // Si todos están completos, recalcular
        if (todosCompletos) {
          setTimeout(() => {
            const tarjetaActualizada = analisisRef.current.find((t) => t.id === tarjetaId);
            if (tarjetaActualizada) {
              recalcularTarjetaConInput(tarjetaId, tarjetaActualizada.currentInput);
            }
          }, 0);
          
          return {
            ...c,
            [campo]: valor,
            camposFaltantes: undefined,
          };
        }
        
        return {
          ...c,
          [campo]: valor,
          camposFaltantes: camposFaltantesActualizados,
        };
      });
    });
  }, []);

  /**
   * Recalcula las métricas de una tarjeta usando un input específico.
   * Versión interna que acepta el input directamente para evitar problemas de sincronización.
   */
  const recalcularTarjetaConInput = async (tarjetaId: string, input: FormularioRentabilidadState) => {
    try {
      // Verificar si todos los campos obligatorios están completos
      const tarjetaActual = analisisRef.current.find((c) => c.id === tarjetaId);
      if (!tarjetaActual) return;
      
      const camposFaltantes = tarjetaActual.camposFaltantes;
      const faltanCamposObligatorios = camposFaltantes && (
        camposFaltantes.habitaciones ||
        camposFaltantes.metrosCuadrados ||
        camposFaltantes.banos ||
        camposFaltantes.codigoComunidadAutonoma ||
        camposFaltantes.ciudad ||
        camposFaltantes.precioCompra ||
        camposFaltantes.alquilerMensual
      );
      
      // Verificar también directamente desde el input y la tarjeta
      const faltanCamposEnInput = 
        input.precioCompra <= 0 ||
        input.codigoComunidadAutonoma < 1 ||
        input.codigoComunidadAutonoma > 19 ||
        input.alquilerMensual <= 0 ||
        !tarjetaActual.ciudad ||
        tarjetaActual.habitaciones <= 0 ||
        tarjetaActual.metrosCuadrados <= 0 ||
        tarjetaActual.banos <= 0;
      
      // Si faltan campos obligatorios, NO calcular rentabilidad
      if (faltanCamposObligatorios || faltanCamposEnInput) {
        // Actualizar solo los valores del input, sin calcular rentabilidad
        setAnalisis((prev) => {
          return prev.map((c) =>
            c.id === tarjetaId
              ? {
                  ...c,
                  precioCompra: input.precioCompra,
                  alquilerEstimado: input.alquilerMensual,
                  rentabilidadNetaPct: 0,
                  estado: 'amarillo' as const,
                  veredictoTitulo: 'Completa los datos faltantes',
                  veredictoRazones: ['Completa todos los campos obligatorios para calcular la rentabilidad'],
                }
              : c
          );
        });
        return;
      }
      
      // Todos los campos están completos, calcular rentabilidad
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
      let nuevaCiudad: string | null = null;
      if (tarjetaActual.currentInput.codigoComunidadAutonoma !== input.codigoComunidadAutonoma) {
        const { obtenerCiudadAleatoria } = await import('./utils/ciudades');
        const nombreComunidad = NOMBRE_COMUNIDAD_POR_CODIGO[input.codigoComunidadAutonoma];
        nuevaCiudad = nombreComunidad ? obtenerCiudadAleatoria(nombreComunidad) : null;
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
                // Limpiar camposFaltantes si todos están completos
                camposFaltantes: undefined,
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
   * Revierte un solo campo (precio compra, alquiler, comunidad o ciudad) al valor original.
   */
  const handleRevertField = useCallback((tarjetaId: string, campo: 'precioCompra' | 'alquilerMensual' | 'codigoComunidadAutonoma' | 'ciudad') => {
    setAnalisis((prev) => {
      const tarjeta = prev.find((c) => c.id === tarjetaId);
      if (!tarjeta) return prev;

      let nuevoCurrentInput = { ...tarjeta.currentInput };
      let nuevaCiudad = tarjeta.ciudad;

      if (campo === 'codigoComunidadAutonoma') {
        nuevoCurrentInput = {
          ...tarjeta.currentInput,
          codigoComunidadAutonoma: tarjeta.originalInput.codigoComunidadAutonoma,
        };
        // Si se revierte la comunidad, también revertir la ciudad
        nuevaCiudad = tarjeta.originalCiudad;
      } else if (campo === 'ciudad') {
        nuevaCiudad = tarjeta.originalCiudad;
      } else {
        nuevoCurrentInput = {
          ...tarjeta.currentInput,
          [campo]: tarjeta.originalInput[campo],
        };
      }

      const quedaSinCambios = inputsAreEqual(nuevoCurrentInput, tarjeta.originalInput) && nuevaCiudad === tarjeta.originalCiudad;
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
          ? { ...c, currentInput: nuevoCurrentInput, ciudad: nuevaCiudad }
          : c
      );
    });
  }, []) // OPTIMIZACIÓN: sin dependencias, todo dentro de setState

  /**
   * Revierte un campo del inmueble (habitaciones, metrosCuadrados o banos) al valor original.
   */
  const handleRevertInmueble = useCallback((tarjetaId: string, campo: 'habitaciones' | 'metrosCuadrados' | 'banos') => {
    setAnalisis((prev) => {
      return prev.map((c) => {
        if (c.id !== tarjetaId) return c;
        
        const valorOriginal = campo === 'habitaciones' 
          ? c.originalHabitaciones 
          : campo === 'metrosCuadrados' 
          ? c.originalMetrosCuadrados 
          : c.originalBanos;
        
        // Verificar si todos los campos están completos después del revert
        const todosCompletos = 
          c.currentInput.precioCompra > 0 &&
          c.currentInput.codigoComunidadAutonoma >= 1 &&
          c.currentInput.codigoComunidadAutonoma <= 19 &&
          c.currentInput.alquilerMensual > 0 &&
          c.ciudad &&
          (campo === 'habitaciones' ? valorOriginal : c.habitaciones) > 0 &&
          (campo === 'metrosCuadrados' ? valorOriginal : c.metrosCuadrados) > 0 &&
          (campo === 'banos' ? valorOriginal : c.banos) > 0;
        
        // Si todos están completos, recalcular
        if (todosCompletos) {
          setTimeout(() => {
            const tarjetaActualizada = analisisRef.current.find((t) => t.id === tarjetaId);
            if (tarjetaActualizada) {
              recalcularTarjetaConInput(tarjetaId, tarjetaActualizada.currentInput);
            }
          }, 0);
        }
        
        return {
          ...c,
          [campo]: valorOriginal,
        };
      });
    });
  }, []);

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


  // Solo renderizar si estamos en la ruta principal
  // Verificar directamente sin estado para evitar cualquier delay
  if (!isCorrectRoute) {
    return null
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
      {analisis.length === 0 && !hasUserAnalyzedBefore && isHydrated ? (
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
            <Box className="tabs-portfolio" sx={{ display: 'flex', gap: 0, pt: 1, px: 2, borderBottom: '1px solid #e0e0e0', mb: 1 }}>
              <Button
                variant="text"
                onClick={() => setVistaFiltro('all')}
                disableRipple
                className={vistaFiltro === 'all' ? 'tab-active' : 'tab-inactive'}
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
                className={vistaFiltro === 'favorites' ? 'tab-active' : 'tab-inactive'}
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
              <Box
                className="portfolio-stats"
                sx={{
                  padding: { xs: '12px 16px', md: '16px' },
                  marginBottom: 8,
                  borderRadius: { xs: 0, md: 2 },
                }}
                aria-label="Resumen del portfolio"
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
                  {/* 1. Rentabilidad neta media */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 0.5, md: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PercentIcon sx={{ fontSize: 16, color: rentabilidadColor }} />
                      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Rent. neta media:
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 16, fontWeight: 600, color: rentabilidadColor }}>
                      {portfolioStats.avgRentabilidadNeta !== null
                        ? `${portfolioStats.avgRentabilidadNeta.toFixed(2)} %`
                        : '—'}
                    </Typography>
                  </Box>
                  {/* 2. ROE medio */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 0.5, md: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 16, color: roeColor }} />
                      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        ROE medio:
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 16, fontWeight: 600, color: roeColor }}>
                      {portfolioStats.avgROE !== null
                        ? `${portfolioStats.avgROE.toFixed(2)} %`
                        : '—'}
                    </Typography>
                  </Box>
                  {/* 3. Cashflow anual total */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 0.5, md: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AttachMoneyIcon sx={{ fontSize: 16, color: cashflowColor }} />
                      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Cashflow anual total:
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 16, fontWeight: 600, color: cashflowColor }}>
                      {portfolioStats.totalCashflow >= 0 ? '+' : ''}
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0,
                        minimumFractionDigits: 0,
                      }).format(portfolioStats.totalCashflow)}
                    </Typography>
                  </Box>
                  {/* 4. Score */}
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 0.5, md: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <EmojiEventsIcon sx={{ fontSize: 16, color: '#f9a825' }} />
                      <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        Score:
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: 16, fontWeight: 600, color: scoreColor, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {portfolioScore} / 100
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
            {/* Cabecera sticky con títulos de columnas (espaciador = ancho icono expandir + gap 2rem para alinear con filas) */}
            <div className="card-header-sticky card-header-full-width" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0, width: '100%', paddingRight: '80px' }}>
              <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} aria-hidden />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0, paddingLeft: '4px' }} className="card-info-horizontal card-header-row">
                <Tooltip title="Habitaciones, metros cuadrados y número de baños del inmueble">
                  <div style={{ flex: '1.2 1 0', minWidth: 0, display: 'flex', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Vivienda</strong>
                  </div>
                </Tooltip>
                <Tooltip title="Comunidad autónoma donde se encuentra el inmueble">
                  <div style={{ flex: '1.4 1 0', minWidth: 240, display: 'flex', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Comunidad autónoma</strong>
                  </div>
                </Tooltip>
                <Tooltip title="Ciudad donde se encuentra el inmueble">
                  <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('ciudad')}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Ciudad</strong>
                    {ordenarPor.campo === 'ciudad' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </Tooltip>
                <Tooltip title="Precio de compra del inmueble en euros">
                  <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('precio')}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Precio compra</strong>
                    {ordenarPor.campo === 'precio' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </Tooltip>
                <Tooltip title="Alquiler mensual estimado que se puede obtener del inmueble">
                  <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('alquiler')}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Alquiler estimado</strong>
                    {ordenarPor.campo === 'alquiler' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </Tooltip>
                <Tooltip title="Rentabilidad neta anual después de todos los gastos, expresada como porcentaje">
                  <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('rentabilidad')}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Rentabilidad neta</strong>
                    {ordenarPor.campo === 'rentabilidad' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </Tooltip>
                <Tooltip title="Cashflow anual final: dinero disponible después de amortizar capital de la hipoteca">
                  <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('cashflow')}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>Cashflow</strong>
                    {ordenarPor.campo === 'cashflow' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </Tooltip>
                <Tooltip title="ROCE (Return on Capital Employed): rentabilidad del capital propio invertido después de amortizar deuda">
                  <div style={{ flex: '1 1 0', minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => handleOrdenar('roce')}>
                    <strong style={{ fontSize: 13, color: '#666', textTransform: 'uppercase' }}>ROCE</strong>
                    {ordenarPor.campo === 'roce' && (
                      <span style={{ fontSize: 12 }}>{ordenarPor.direccion === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </Tooltip>
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
                        highlightBorder={card.id === tarjetaResaltadaPorUrlId}
                        onClick={() => handleClickTarjeta(card.id)}
                        onDelete={() => handleEliminarTarjeta(card.id)}
                        onToggleFavorite={() => handleToggleFavorite(card.id)}
                        onOpenNotes={() => handleOpenNotes(card.id)}
                        resultado={resultadoParaDetalle ?? undefined}
                        resultadoOriginal={resultadoOriginalPorTarjeta[card.id]}
                        onInputChange={(campo, valor) => handleInputChange(card.id, campo, valor)}
                        onRevertField={(campo) => handleRevertField(card.id, campo)}
                        onRevertInmueble={(campo) => handleRevertInmueble(card.id, campo)}
                        onCiudadChange={(ciudad) => handleCiudadChange(card.id, ciudad)}
                        onInmuebleChange={(campo, valor) => handleInmuebleChange(card.id, campo, valor)}
                        isInFavoritesView={vistaFiltro === 'favorites'}
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
                title="Compartir tarjetas via link"
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
              {vistaFiltro !== 'favorites' && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleNuevoAnalisis}
                  disabled={analisis.length === 0}
                  title="Borrar todas las tarjetas"
                  disableRipple
                  sx={{
                    outline: 'none',
                    '&:focus': { outline: 'none', boxShadow: 'none' },
                    '&:focus-visible': { outline: 'none', boxShadow: 'none' },
                    '&:active': { outline: 'none', boxShadow: 'none' },
                  }}
                >
                  Descartar
                </Button>
              )}
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
            className="modal-limpiar-overlay"
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
              className="modal-limpiar-content"
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
              <Typography id="modal-limpiar-titulo" variant="h6" component="h2" sx={{ mb: 1.5, color: 'text.primary' }}>
                Eliminar tarjetas
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, color: 'text.primary' }}>
                ¿Eliminar todas las tarjetas de análisis? Esta acción no se puede deshacer.
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
                  No, mantener
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
                  Sí, eliminar todas
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
        {datosPendientes && (
          <ModalCompletarCampos
            open={modalCompletarCamposOpen}
            onClose={() => {
              setModalCompletarCamposOpen(false);
              setDatosPendientes(null);
            }}
            url={datosPendientes.url}
            autofillData={datosPendientes.autofillData}
            camposFaltantes={datosPendientes.camposFaltantes}
            onCompletar={handleCompletarCampos}
          />
        )}
      </main>
        </>
      )}
    </div>
  )
}

export default App
