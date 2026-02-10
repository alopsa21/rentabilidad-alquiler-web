import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './theme'
import './index.css'
import App from './App.tsx'
import { Layout } from './Layout.tsx'
import { LegalAviso } from './pages/LegalAviso.tsx'
import { LegalPrivacidad } from './pages/LegalPrivacidad.tsx'
import { LegalCookies } from './pages/LegalCookies.tsx'
import { LegalDisclaimer } from './pages/LegalDisclaimer.tsx'
import { Contacto } from './pages/Contacto.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<App />} />
          <Route path="legal/aviso" element={<LegalAviso />} />
          <Route path="legal/privacidad" element={<LegalPrivacidad />} />
          <Route path="legal/cookies" element={<LegalCookies />} />
          <Route path="legal/disclaimer" element={<LegalDisclaimer />} />
          <Route path="contacto" element={<Contacto />} />
        </Route>
        {/* Ruta catch-all para evitar que App se renderice en otras rutas */}
        <Route path="*" element={null} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
