//import React from 'react'

export default function Home() {
  const go = () => {
    history.pushState(null, '', '/generatejson')
    // dispatch a popstate so our App router notices
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <main className='app-root'>
      <h1>Soundscape Maker</h1>
      <h2>
        Transform your favorite audio into a unique 3D soundscape—right in your
        browser.
      </h2>
      <p>
        <br />
        Upload your MP3, watch your music come alive as an interactive
        landscape, and export your creation with a single click.
        <br />
        Ready to see (and hear) your sound differently?
      </p>
      <button
        type='button'
        onClick={go}
        className='inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2'
      >
        Get Started!
      </button>
    </main>
  )
}
