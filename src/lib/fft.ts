// src/lib/fft.ts
export class FFT {
    size: number;
    cosTable: Float32Array;
    sinTable: Float32Array;
    constructor(size: number) {
      this.size = size;
      this.cosTable = new Float32Array(size/2);
      this.sinTable = new Float32Array(size/2);
      for (let i = 0; i < size/2; i++) {
        this.cosTable[i] = Math.cos(-2 * Math.PI * i / size);
        this.sinTable[i] = Math.sin(-2 * Math.PI * i / size);
      }
    }
    fft(real: Float32Array, imag: Float32Array) {
      const n = this.size;
      let j = 0;
      for (let i = 0; i < n - 1; i++) {
        if (i < j) {
          [real[i], real[j]] = [real[j], real[i]];
          [imag[i], imag[j]] = [imag[j], imag[i]];
        }
        let k = n/2;
        while (k <= j) { j -= k; k/=2; }
        j += k;
      }
      for (let len = 2; len <= n; len *= 2) {
        const half = len/2;
        for (let i = 0; i < n; i += len) {
          for (let j = i, k = 0; j < i+half; j++, k++) {
            const tRe =  real[j+half] * this.cosTable[k] - imag[j+half] * this.sinTable[k];
            const tIm =  real[j+half] * this.sinTable[k] + imag[j+half] * this.cosTable[k];
            real[j+half] = real[j] - tRe;
            imag[j+half] = imag[j] - tIm;
            real[j] += tRe;
            imag[j] += tIm;
          }
        }
      }
    }
    computeMagnitudes(input: Float32Array): Float32Array {
      const real = new Float32Array(this.size);
      const imag = new Float32Array(this.size);
      real.set(input);
      this.fft(real, imag);
      const mags = new Float32Array(this.size/2);
      for (let i = 0; i < mags.length; i++) {
        mags[i] = Math.hypot(real[i], imag[i]) / (this.size/2);
      }
      return mags;
    }
  }
  
  