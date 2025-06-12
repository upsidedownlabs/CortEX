// src/lib/exgfilter.ts
// Second-order bandpass filter for EEG at 45 Hz cutoff, fixed 500 Hz sampling and 12-bit ADC

export class EXGFilter {
    // Biquad state
    private z1 = 0;
    private z2 = 0;
    private x1 = 0;
  
    // ADC normalization parameters
    private readonly bitsPoints: number;
    private readonly yScale: number;
  
    /**
     * @param resolutionBits ADC resolution in bits (e.g., 12 for 12-bit)
     */
    constructor(resolutionBits = 12) {
      this.bitsPoints = Math.pow(2, resolutionBits);
      this.yScale = 2 / this.bitsPoints;
    }
  
    /**
     * Process one raw ADC count sample: normalize, then bandpass filter.
     * @param rawCount raw ADC count (unsigned integer)
     * @returns filtered and scaled output in voltage units (±1V range)
     */
    process(rawCount: number): number {
      // Normalize: recenter and scale to -1..+1
      const normalized = (rawCount - this.bitsPoints / 2) * this.yScale;
  
      // Apply biquad difference equation for 45Hz bandpass
      const b1 = -0.51930341;
      const b2 =  0.21965398;
      const a0 =  0.17508764;
      const a1 =  0.35017529;
      const a2 =  0.17508764;
  
      // Intermediate state
      this.x1 = normalized - b1 * this.z1 - b2 * this.z2;
      // Output
      const output = a0 * this.x1 + a1 * this.z1 + a2 * this.z2;
      // Shift delays
      this.z2 = this.z1;
      this.z1 = this.x1;
  
      return output;
    }
  
    /**
     * Reset internal filter state (call when restarting stream)
     */
    reset(): void {
      this.z1 = 0;
      this.z2 = 0;
      this.x1 = 0;
    }
  }
  