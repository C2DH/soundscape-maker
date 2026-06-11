//import React from 'react'

export default function Home() {
  const go = () => {
    history.pushState(null, "", "/generatesoundscape");
    // dispatch a popstate so our App router notices
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main className="app-root flex flex-col items-center justify-center text-center gap-6 ">
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          background: "url('/img/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          opacity: 0.4, // adjust transparency here
          zIndex: -1,
        }}
      ></div>
      <h1 style={{ fontSize: "4rem" }}>Soundscape Maker</h1>
      <h2 className="text-xl max-w-2xl">
        Transform your favorite audio into a unique 3D soundscape—right in your
        browser.
      </h2>
      <p className="text-gray-400 max-w-lg">
        Upload your MP3, watch your music come alive as an interactive
        landscape, and export your creation with a single click.
        <br />
        Ready to see (and hear) your sound differently?
      </p>
      <button type="button" onClick={go} className="mb-15 primary">
        Get Started!
      </button>
    </main>
  );
}
