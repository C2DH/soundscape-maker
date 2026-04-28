import appTemplate from '../../package/src/App.jsx?raw'
import indexTemplate from '../../package/index.html?raw'
import packageReadmeTemplate from '../../package/README.md?raw'
import packageJsonTemplate from '../../package/package.json?raw'
import mainTemplate from '../../package/src/main.jsx?raw'
import stylesTemplate from '../../package/src/styles.css?raw'

// ─── HOW TO SHARE A COMPONENT FROM src/ INTO THE EXPORTED PACKAGE ───────────
//
// During development in package/, you can import components from the parent
// app using the @main alias (points to ../src via package/vite.config.js).
//
//   import SoundScape from '@main/components/SoundScape'
//
// But exported ZIPs are standalone — ../src won't exist there. You must copy
// the component and all its local dependencies into the ZIP here.
//
// Example: sharing SoundScape
//
// Step 1 — add raw imports for every file the component needs:
//
//   import soundScapeTemplate   from '../../src/components/SoundScape.tsx?raw'
//   import storeTemplate        from '../../src/store.ts?raw'
//   import easingTemplate       from '../../src/easing.ts?raw'
//   import vertexGlsl           from '../../src/shaders/soundscape/vertex.glsl?raw'
//   import fragmentGlsl         from '../../src/shaders/soundscape/fragment.glsl?raw'
//
// Step 2 — add each file to the return array of getPackageTemplateFiles():
//
//   { path: 'src/components/SoundScape.tsx',              content: soundScapeTemplate },
//   { path: 'src/store.ts',                               content: storeTemplate },
//   { path: 'src/easing.ts',                              content: easingTemplate },
//   { path: 'src/shaders/soundscape/vertex.glsl',         content: vertexGlsl },
//   { path: 'src/shaders/soundscape/fragment.glsl',       content: fragmentGlsl },
//
// Step 3 — the exported vite.config already maps @main → ./src, so the import
//   paths in the component source resolve correctly inside the ZIP without any
//   changes to the component file itself.
//
// Step 4 — validate:
//   1. cd package && npm run dev          (dev alias path works)
//   2. Export ZIP, unzip, npm install, npm run dev   (standalone path works)
//
// ─────────────────────────────────────────────────────────────────────────────

// The exported ZIP ships its own vite.config that maps @main to ./src
// (the local copy inside the package) instead of the dev-time ../src alias.
// Nothing from this const is ever a path to the parent project.
const exportedViteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, './src'),
    },
  },
})
`

export interface TemplateTokenMap {
  __SOUNDSCAPE_AUDIO__: string
  __SOUNDSCAPE_DATA__: string
  __SOUNDSCAPE_METADATA__: string
}

export interface PackageTemplateFile {
  path: string
  content: string
}

export function getPackageTemplateFiles(
  tokens: TemplateTokenMap,
): PackageTemplateFile[] {
  return [
    { path: 'README.md', content: packageReadmeTemplate },
    { path: 'index.html', content: indexTemplate },
    { path: 'package.json', content: packageJsonTemplate },
    { path: 'vite.config.js', content: exportedViteConfig },
    { path: 'src/main.jsx', content: mainTemplate },
    { path: 'src/styles.css', content: stylesTemplate },
    {
      path: 'src/App.jsx',
      content: replaceTemplateTokens(appTemplate, tokens),
    },
  ]
}

function replaceTemplateTokens(content: string, tokens: TemplateTokenMap) {
  return content
    .replaceAll('__SOUNDSCAPE_AUDIO__', tokens.__SOUNDSCAPE_AUDIO__)
    .replaceAll('__SOUNDSCAPE_DATA__', tokens.__SOUNDSCAPE_DATA__)
    .replaceAll('__SOUNDSCAPE_METADATA__', tokens.__SOUNDSCAPE_METADATA__)
}
