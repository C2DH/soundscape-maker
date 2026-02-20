declare module 'fft-js' {
  interface FFTUtil {
    fftMag(phasors: ArrayLike<{ re: number; im: number }>): number[]
  }

  interface FFTModule {
    fft(input: ArrayLike<number>): Array<{ re: number; im: number }>
    util: FFTUtil
  }

  const fft: FFTModule
  export default fft
}

