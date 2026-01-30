import { useState, useEffect } from 'react'
import { FormularioRentabilidad } from './components/FormularioRentabilidad'
import { Resultados } from './components/Resultados'
import type { RentabilidadApiResponse } from './types/api'
import './App.css'

function App() {
  const [resultado, setResultado] = useState<RentabilidadApiResponse | null>(null)

  useEffect(() => {
    if (resultado) {
      document.getElementById('resultados')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [resultado])

  return (
    <div className="app">
      <h1>Rentabilidad Alquiler</h1>
      <FormularioRentabilidad onResultadoChange={setResultado} />
      <Resultados resultado={resultado} />
    </div>
  )
}

export default App
