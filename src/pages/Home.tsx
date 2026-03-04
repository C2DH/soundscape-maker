//import React from 'react'

export default function Home() {
  const go = () => {
    history.pushState(null, '', '/generatejson')
    // dispatch a popstate so our App router notices
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <main className="app-root">
      <h1>Soundscape Maker</h1>
      <p>Welcome — click the button to generate JSON from audio.</p>
      <button type="button" onClick={go}>Go to Generate JSON</button>
    </main>
  )
}
