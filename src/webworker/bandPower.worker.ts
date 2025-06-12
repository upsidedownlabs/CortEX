import { FFT } from '@/lib/fft';

// Frequency band definitions (Hz)
const BANDS: Record<string, [number, number]> = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 12],
  beta:  [12, 30],
  gamma: [30, 45],
};

// Sliding-window smoother
class BandSmoother {
  private bufferSize: number;
  private buffers: Record<string, number[]>;
  private sums: Record<string, number>;
  private idx = 0;

  constructor(bufferSize: number) {
    this.bufferSize = bufferSize;
    this.buffers = {};
    this.sums = {};
    for (const band of Object.keys(BANDS)) {
      this.buffers[band] = new Array(bufferSize).fill(0);
      this.sums[band] = 0;
    }
  }

  updateAll(vals: Record<string, number>) {
    for (const band of Object.keys(vals)) {
      const old = this.buffers[band][this.idx];
      this.sums[band] -= old;
      this.sums[band] += vals[band];
      this.buffers[band][this.idx] = vals[band];
    }
    this.idx = (this.idx + 1) % this.bufferSize;
  }

  getAll(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const band of Object.keys(this.sums)) {
      out[band] = this.sums[band] / this.bufferSize;
    }
    return out;
  }
}

// Updated band-power calculation (with improved bin selection)
function calculateBandPower(
  mags: Float32Array,
  [f1, f2]: [number, number],
  sampleRate = 500,
  fftSize = 256
): number {
  const res = sampleRate / fftSize;
  const start = Math.max(1, Math.ceil(f1 / res)); // more precise
  const end = Math.min(mags.length - 1, Math.floor(f2 / res));
  if (end < start) return 0;
  let power = 0;
  for (let i = start; i <= end; i++) {
    power += mags[i] * mags[i];
  }
  return power;
}

// Create smoothers per channel
const smoother0 = new BandSmoother(128);
const smoother1 = new BandSmoother(128);

self.onmessage = (e: MessageEvent<{
  eeg0: number[];
  eeg1: number[];
  sampleRate: number;
  fftSize: number;
}>) => {
  const { eeg0, eeg1, sampleRate, fftSize } = e.data;

  // Run FFT
  const fft0 = new FFT(fftSize);
  const fft1 = new FFT(fftSize);
  const mags0 = fft0.computeMagnitudes(new Float32Array(eeg0));
  const mags1 = fft1.computeMagnitudes(new Float32Array(eeg1));

  // Calculate absolute power per band
  const raw0: Record<string, number> = {};
  const raw1: Record<string, number> = {};
  for (const [band, range] of Object.entries(BANDS)) {
    raw0[band] = calculateBandPower(mags0, range, sampleRate, fftSize);
    raw1[band] = calculateBandPower(mags1, range, sampleRate, fftSize);
  }

  // Normalize to relative power
  const total0 = Object.values(raw0).reduce((a, b) => a + b, 0);
  const total1 = Object.values(raw1).reduce((a, b) => a + b, 0);

  const rel0: Record<string, number> = {};
  const rel1: Record<string, number> = {};
  for (const band of Object.keys(BANDS)) {
    rel0[band] = total0 > 0 ? raw0[band] / total0 : 0;
    rel1[band] = total1 > 0 ? raw1[band] / total1 : 0;
  }

  // Update smoothers
  smoother0.updateAll(rel0);
  smoother1.updateAll(rel1);

  const smooth0 = smoother0.getAll();
  const smooth1 = smoother1.getAll();

  // Send back smoothed relative band powers
  self.postMessage({
    smooth0,
    smooth1,
   
  });
};
