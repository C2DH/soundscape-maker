import { create } from 'zustand'
import * as THREE from 'three'

interface ThemeState {
  colors: Record<string, string>
  threeColors: Record<string, THREE.Color>
  setColor: (name: string, value: string) => void
  refreshFromCSS: () => void
  getColorVec3: (name: string) => THREE.Vector3 | undefined
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  colors: {
    '--color-primary': 'rgb(126,90,197)',
    '--light': 'rgb(249,241,228)',
    '--dark': 'rgb(28,14,50)',
    '--accent': 'rgb(255,222,124)',
    '--accent-3d': 'rgb(255,133,239)',
    '--accent-3d-time': 'rgb(95,255,242)',
  },
  threeColors: {
    '--color-primary': new THREE.Color('rgb(126,90,197)'),
    '--light': new THREE.Color('rgb(249,241,228)'),
    '--dark': new THREE.Color('rgb(28,14,50)'),
    '--accent': new THREE.Color('rgb(255,222,124)'),
    '--accent-3d': new THREE.Color('rgb(255,133,239)'),
    '--accent-3d-time': new THREE.Color('rgb(95,255,242)'),
  },
  setColor: (name, value) => {
    const color = new THREE.Color(value)
    set((state) => ({
      colors: { ...state.colors, [name]: value },
      threeColors: { ...state.threeColors, [name]: color },
    }))
  },
  refreshFromCSS: () => {
    const root = getComputedStyle(document.documentElement)
    const primaryRgb = root.getPropertyValue('--color-primary').trim()
    const lightRgb = root.getPropertyValue('--light').trim()
    const darkRgb = root.getPropertyValue('--dark').trim()
    const accentRgb = root.getPropertyValue('--accent').trim()
    const accent3dRgb = root.getPropertyValue('--accent-3d').trim()
    const accent3dTimeRgb = root.getPropertyValue('--accent-3d-time').trim()
    const alpha = root.getPropertyValue('--alpha')?.trim() || '1'
    set(() => ({
      colors: {
        '--color-primary': `rgba(${primaryRgb}, ${alpha})`,
        '--light': `rgba(${lightRgb}, ${alpha})`,
        '--dark': `rgba(${darkRgb}, ${alpha})`,
        '--accent': `rgba(${accentRgb}, ${alpha})`,
        '--accent-3d': `rgba(${accent3dRgb}, ${alpha})`,
        '--accent-3d-time': `rgba(${accent3dTimeRgb}, ${alpha})`,
      },
      threeColors: {
        '--color-primary': new THREE.Color(`rgb(${primaryRgb})`),
        '--light': new THREE.Color(`rgb(${lightRgb})`),
        '--dark': new THREE.Color(`rgb(${darkRgb})`),
        '--accent': new THREE.Color(`rgb(${accentRgb})`),
        '--accent-3d': new THREE.Color(`rgb(${accent3dRgb})`),
        '--accent-3d-time': new THREE.Color(`rgb(${accent3dTimeRgb})`),
      },
    }))
  },
  getColorVec3: (name) => {
    const color = get().threeColors[name]
    return color ? new THREE.Vector3(color.r, color.g, color.b) : undefined
  },
}))

