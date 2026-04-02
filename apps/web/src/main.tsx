import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import QRPage from './components/QRPage.tsx'

const isQR = window.location.pathname === '/qr'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isQR ? <QRPage url="https://little-greece-menu.netlify.app" /> : <App />}
  </StrictMode>,
)
