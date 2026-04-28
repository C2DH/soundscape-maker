import { create } from 'zustand'

interface AudioState {
  currentTime: number
  duration: number
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setCurrentTimeAndDuration: (time: number, duration: number) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  currentTime: 0,
  duration: 0,
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setCurrentTimeAndDuration: (time, duration) =>
    set({ currentTime: time, duration }),
}))
