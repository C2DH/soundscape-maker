import appTemplate from '../../package/src/App.tsx?raw'
import indexTemplate from '../../package/index.html?raw'
import packageReadmeTemplate from '../../package/README.md?raw'
import packageJsonTemplate from '../../package/package.json?raw'
import tsconfigTemplate from '../../package/tsconfig.json?raw'
import mainTemplate from '../../package/src/main.tsx?raw'
import stylesTemplate from '../../package/src/styles.css?raw'

// ─── HOW TO SHARE A COMPONENT FROM src/ INTO THE EXPORTED PACKAGE ───────────
//
// Example: sharing SoundScape (and its dependencies) with the package template.
//
// ── STEP 1 — Use it in the template app during development ───────────────────
//
//   In  package/src/App.jsx:
//
//     import SoundScape from '@main/components/SoundScape'
//
//   That's all you need while developing. No changes here yet.
//
// ── STEP 2 — Register it here so it gets copied into exported ZIPs ───────────
//
//   In  src/utils/packageTemplate.ts  (this file), add ?raw imports at the top:
//
//     import soundScapeTemplate from '../components/SoundScape.tsx?raw'
//     import storeTemplate      from '../store.ts?raw'
//     import easingTemplate     from '../easing.ts?raw'
//     import vertexGlsl         from '../shaders/soundscape/vertex.glsl?raw'
//     import fragmentGlsl       from '../shaders/soundscape/fragment.glsl?raw'
//
//   Then add each entry to the return array of getPackageTemplateFiles() below:
//
//     { path: 'src/components/SoundScape.tsx',        content: soundScapeTemplate },
//     { path: 'src/store.ts',                         content: storeTemplate },
//     { path: 'src/easing.ts',                        content: easingTemplate },
//     { path: 'src/shaders/soundscape/vertex.glsl',   content: vertexGlsl },
//     { path: 'src/shaders/soundscape/fragment.glsl', content: fragmentGlsl },
//
//   The exported vite.config maps @main → ./src inside the ZIP, so component
//   imports resolve correctly without any changes to the component source.
//
// ── STEP 3 — Validate both contexts ──────────────────────────────────────────
//
//   1. cd package && npm run dev                         ← dev alias works
//   2. Export ZIP → unzip → npm install → npm run dev   ← standalone works
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
    { path: 'tsconfig.json', content: tsconfigTemplate },
    { path: 'vite.config.js', content: exportedViteConfig },
    { path: 'src/main.tsx', content: mainTemplate },
    { path: 'src/styles.css', content: stylesTemplate },
    {
      path: 'src/App.tsx',
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
