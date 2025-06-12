// webworker/dataProcessor.worker.ts
import { EXGFilter, Notch } from '@/lib/filters';


// Initialize filters and FFT
const notchFilters = Array.from({ length: 3 }, () => new Notch());
const exgFilters = Array.from({ length: 3 }, () => new EXGFilter());

// Configure filters
notchFilters.forEach((filter) => filter.setbits(500));
exgFilters.forEach((filter) => filter.setbits("12", 500));


function processRawData(rawData: {
  counter: number;
  raw0: number;
  raw1: number;
  raw2: number;
}) {
  // Apply filters to all channels
  const processed = {
    eeg0: notchFilters[0].process(exgFilters[0].process(rawData.raw0, 3), 1),
    eeg1: notchFilters[1].process(exgFilters[1].process(rawData.raw1, 3), 1),
    ecg: notchFilters[2].process(exgFilters[2].process(rawData.raw2, 1), 1),
    counter: rawData.counter
  };

  
  return {
    ...processed,
   
  };
}

self.onmessage = (e) => {
  if (e.data.command === 'process') {
    const result = processRawData(e.data.rawData);
    self.postMessage({
      type: 'processedData',
      data: {
        counter: result.counter,
        eeg0: result.eeg0,
        eeg1: result.eeg1,
        ecg: result.ecg,
      
      }
    });
  }
};