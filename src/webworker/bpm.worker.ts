// src/webworker/bpm.worker.ts

export type BPMRequest = {
    ecgBuffer: number[];
    sampleRate: number;
};

export type BPMResponse = {
    bpm: number | null;        // smoothed “current” BPM or null
    high: number | null;       // max BPM in buffer or null
    low: number | null;        // min BPM in buffer or null
    avg: number | null;        // average BPM in buffer or null
    peaks: number[];           // indices of detected R‐peaks
    // HRV metrics
    hrv: number | null;        // latest RR interval in ms
    hrvHigh: number | null;    // max RR interval in ms
    hrvLow: number | null;     // min RR interval in ms
    hrvAvg: number | null;     // average RR interval in ms
    sdnn: number | null;       // standard deviation of NN intervals
    rmssd: number | null;      // root-mean-square of successive differences
    pnn50: number | null;      // percentage of differences > 50 ms
};

const computeBPMStats = (
    signal: number[],
    sampleRate: number
): BPMResponse => {
    const peaks: number[] = [];
    const len = signal.length;
    if (len < 3) {
        return {
            bpm: null, high: null, low: null, avg: null, peaks,
            hrv: null, hrvHigh: null, hrvLow: null, hrvAvg: null,
            sdnn: null, rmssd: null, pnn50: null
        };
    }

    // Detect R-peaks
    const maxVal = Math.max(...signal);
    const threshold = maxVal * 0.5;
    const refractory = Math.floor(sampleRate * 0.2);
    let lastPeak = -refractory;
    for (let i = 1; i < len - 1; i++) {
        if (signal[i] > threshold && signal[i] > signal[i - 1] && signal[i] > signal[i + 1] && i - lastPeak > refractory) {
            peaks.push(i);
            lastPeak = i;
        }
    }

    const bpms: number[] = [];
    const rrIntervals: number[] = [];
    for (let j = 1; j < peaks.length; j++) {
        const dt = (peaks[j] - peaks[j - 1]) / sampleRate;
        const bpmVal = 60 / dt;
        if (bpmVal >= 40 && bpmVal <= 200) {
            bpms.push(bpmVal);
            rrIntervals.push(dt * 1000); // RR interval in ms
        }
    }

    if (!bpms.length) {
        return {
            bpm: null, high: null, low: null, avg: null, peaks,
            hrv: null, hrvHigh: null, hrvLow: null, hrvAvg: null,
            sdnn: null, rmssd: null, pnn50: null
        };
    }

    // BPM stats
    const sumBpm = bpms.reduce((a, b) => a + b, 0);
    const avgBpm = sumBpm / bpms.length;
    const highBpm = Math.max(...bpms);
    const lowBpm = Math.min(...bpms);
    const bpm = Math.round(avgBpm);

    // RR stats
    const sumRR = rrIntervals.reduce((a, b) => a + b, 0);
    const avgRR = sumRR / rrIntervals.length;
    const highRR = Math.max(...rrIntervals);
    const lowRR = Math.min(...rrIntervals);
    const latestHrv = Math.round(rrIntervals[rrIntervals.length - 1]);

    // HRV metrics
    let sdnn: number | null = null;
    let rmssd: number | null = null;
    let pnn50: number | null = null;

    if (rrIntervals.length > 1) {
        const meanRR = avgRR;

        // // SDNN
        // const variance = rrIntervals.reduce((sum, val) => sum + Math.pow(val - meanRR, 2), 0) / (rrIntervals.length - 1);
        // sdnn = Math.sqrt(variance);
        /** 
 * Given an array of successive RR intervals (in ms), 
 * compute standard deviation (SDNN). 
 */
        function computeSDNN(rrIntervals: number[]): number {
            const n = rrIntervals.length;
            if (n < 2) return 0;
          
            const mean = rrIntervals.reduce((a, b) => a + b, 0) / n;
            const sumSq = rrIntervals
              .map(x => (x - mean) ** 2)
              .reduce((a, b) => a + b, 0);
          
            // Use (n - 1) for an unbiased estimate
            const variance = sumSq / (n - 1);
            return Math.sqrt(variance);
          }
          
 sdnn = computeSDNN(rrIntervals);  

        // RMSSD and pNN50
        const diffs: number[] = [];
        for (let i = 1; i < rrIntervals.length; i++) {
            diffs.push(rrIntervals[i] - rrIntervals[i - 1]);
        }

        const squaredDiffs = diffs.map(d => d * d);
        rmssd = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / diffs.length);

        const nn50Count = diffs.filter(d => Math.abs(d) > 50).length;
        pnn50 = (nn50Count / diffs.length) * 100;
    }

    return {
        bpm,
        high: Math.round(highBpm),
        low: Math.round(lowBpm),
        avg: Math.round(avgBpm),
        peaks,
        hrv: latestHrv,
        hrvHigh: Math.round(highRR),
        hrvLow: Math.round(lowRR),
        hrvAvg: Math.round(avgRR),
        sdnn: sdnn !== null ? Math.round(sdnn) : null,
        rmssd: rmssd !== null ? Math.round(rmssd) : null,
        pnn50: pnn50 !== null ? Math.round(pnn50) : null
    };
};

self.onmessage = (e: MessageEvent<BPMRequest>) => {
    const { ecgBuffer, sampleRate } = e.data;
    const resp = computeBPMStats(ecgBuffer, sampleRate);
    (self as any).postMessage(resp);
};
