// Notch filter class to remove 50 Hz powerline noise
 export  class NotchFilter {
    // Internal state for two cascaded biquad sections
    private s11 = 0; // section1 delay-1
    private s12 = 0; // section1 delay-2
    private s21 = 0; // section2 delay-1
    private s22 = 0; // section2 delay-2
  
    /**
     * Process one sample through a 48–52 Hz notch @ 500 Hz sampling.
     * @param x input sample
     * @returns filtered output
     */
    process(x: number): number {
      let w: number, y: number;
  
      // — First biquad (48–52 Hz notch)
      // w[n] = x[n] − b1·w[n−1] − b2·w[n−2]
      // y[n] = a0·w[n] + a1·w[n−1] + a2·w[n−2]
      w = x - (-1.56858163) * this.s11 - (0.96424138) * this.s12;
      y = (0.96508099) * w + (-1.56202714) * this.s11 + (0.96508099) * this.s12;
      this.s12 = this.s11;
      this.s11 = w;
  
      // — Second biquad (same notch)
      x = y;  // cascade
      w = x - (-1.61100358) * this.s21 - (0.96592171) * this.s22;
      y = (1.0)         * w + (-1.61854514) * this.s21 + (1.0)         * this.s22;
      this.s22 = this.s21;
      this.s21 = w;
  
      return y;
    }
  
    /** Reset internal delays (e.g. when starting a new stream) */
    reset(): void {
      this.s11 = this.s12 = this.s21 = this.s22 = 0;
    }
  }