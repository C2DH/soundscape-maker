import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SiteBasename } from './constants'

import { BrowserRouter } from 'react-router'
console.info(`Site basename: "${SiteBasename}"`)

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={SiteBasename}>
    <StrictMode>
      <App />
    </StrictMode>
  </BrowserRouter>,
)
