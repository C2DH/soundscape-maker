import React, { useEffect, useState } from 'react'
import './App.css'
import Home from './pages/Home'
import GenerateJSON from './pages/GenerateJSON'

function App() {
  const [route, setRoute] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (route === '/' || route === '') return <Home />
  if (route === '/generatejson') return <GenerateJSON />

  // fallback: render Home
  return <Home />
}

export default App
