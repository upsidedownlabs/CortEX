'use client'
import React, { useRef, useEffect,useState } from 'react';
import { Award } from 'lucide-react';

interface EEGSample {
  timestamp?: number;
  alpha: number;
  beta: number;
  theta: number;
  delta?: number;
}

interface Props {
  data: EEGSample[];
  sessionDuration: number;
  darkMode?: boolean;
  className?: string;
}

const MeditationAnalysis: React.FC<Props> = ({
  data,
  sessionDuration,
  darkMode = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const calculateMetrics = () => {
    if (!data.length) return {
      avgAlpha: 0,
      avgBeta: 0,
      avgTheta: 0,
      avgDelta: 0,
      deepestTheta: 0,
      consistency: 0,
      flowState: 0,
      statePercentages: {
        Relaxed: 0,
        Focused: 0,
        'Deep Meditation': 0,
        Drowsy: 0
      },
      mostFrequent: 'Relaxed',
      phases: []
    };

    // Calculate averages
    const avgAlpha = data.reduce((sum, s) => sum + s.alpha, 0) / data.length;
    const avgBeta = data.reduce((sum, s) => sum + s.beta, 0) / data.length;
    const avgTheta = data.reduce((sum, s) => sum + s.theta, 0) / data.length;
    const avgDelta = data.reduce((sum, s) => sum + (s.delta ?? 0), 0) / data.length;

    // Consistent state classification logic
    const classifyState = (alpha: number, beta: number, theta: number, delta: number) => {
      const values = { alpha, beta, theta, delta };
      const maxKey = Object.keys(values).reduce((a, b) => values[a as keyof typeof values] > values[b as keyof typeof values] ? a : b);

      switch (maxKey) {
        case 'alpha': return 'Relaxed';
        case 'beta': return 'Focused';
        case 'theta': return 'Deep Meditation';
        case 'delta': return 'Drowsy';
        default: return 'Relaxed';
      }
    };

    // Calculate state percentages for entire session
    const stateCounts = { Relaxed: 0, Focused: 0, 'Deep Meditation': 0, Drowsy: 0 };

    data.forEach(sample => {
      const state = classifyState(sample.alpha, sample.beta, sample.theta, sample.delta ?? 0);
      stateCounts[state]++;
    });

    const totalSamples = data.length;
    const statePercentages = {
      Relaxed: Math.round((stateCounts.Relaxed / totalSamples) * 100),
      Focused: Math.round((stateCounts.Focused / totalSamples) * 100),
      'Meditation': Math.round((stateCounts['Deep Meditation'] / totalSamples) * 100),
      Drowsy: Math.round((stateCounts.Drowsy / totalSamples) * 100)
    };

    // Most frequent state
    const mostFrequent = Object.entries(stateCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    // Create exactly 12 phases
    const phases: Array<{
      phase: string;
      alpha: number;
      theta: number;
      beta: number;
      delta: number;
      stateHeights: { relaxed: number; focused: number; deep: number; drowsy: number };
    }> = [];

    const numPhases = 12;
    const phaseLength = Math.ceil(data.length / numPhases);

    for (let i = 0; i < numPhases; i++) {
      const startIdx = i * phaseLength;
      const endIdx = Math.min(startIdx + phaseLength, data.length);
      const segment = data.slice(startIdx, endIdx);

      if (segment.length === 0) continue;

      const avgA = segment.reduce((sum, s) => sum + s.alpha, 0) / segment.length;
      const avgB = segment.reduce((sum, s) => sum + s.beta, 0) / segment.length;
      const avgT = segment.reduce((sum, s) => sum + s.theta, 0) / segment.length;
      const avgD = segment.reduce((sum, s) => sum + (s.delta ?? 0), 0) / segment.length;

      // Determine dominant phase
      const phaseName = classifyState(avgA, avgB, avgT, avgD).toLowerCase().replace(' ', '');

      // Calculate heights for stacked bars (normalize to 0-1 range)
      const total = avgA + avgB + avgT + avgD;
      const stateHeights = {
        relaxed: total > 0 ? avgA / total : 0,
        focused: total > 0 ? avgB / total : 0,
        deep: total > 0 ? avgT / total : 0,
        drowsy: total > 0 ? avgD / total : 0
      };

      phases.push({
        phase: phaseName,
        alpha: avgA,
        theta: avgT,
        beta: avgB,
        delta: avgD,
        stateHeights
      });
    }

    return {
      avgAlpha,
      avgBeta,
      avgTheta,
      avgDelta,
      statePercentages,
      mostFrequent,
      phases
    };
  };


  const metrics = calculateMetrics();
  const meditationScore = Math.min(100, Math.round((metrics.flowState ?? 0) * 100));

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Set up resize observer to handle container size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width, height });
    });

    resizeObserver.observe(canvas.parentElement!);

    return () => resizeObserver.disconnect();
  }, []);
  // Replace the useEffect canvas rendering with this:
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !data.length || canvasSize.width === 0) return;

    // Get device pixel ratio for crisp rendering on high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas resolution to match display size
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    
    // Scale the context to account for the higher resolution
    ctx.scale(dpr, dpr);

    const width = canvasSize.width;
    const height = canvasSize.height;
    const padding = 20;
    const barWidth = (width - padding * 2) / 12; // Fixed 12 phases
    const maxBarHeight = height - padding * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background solid color
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(0, 0, width, height);

    const stateColors = {
      relaxed: '#34d399',
      focused: '#f97316',
      deep: '#6366f1',
      drowsy: '#9ca3af'
    };

    metrics.phases.forEach((phase, i) => {
      const x = padding + i * barWidth;
      const baseY = height - padding;

      // Draw stacked horizontal bars
      let currentY = baseY;
      const states = ['drowsy', 'deep', 'focused', 'relaxed'] as const;

      states.forEach((state, stateIndex) => {
        const stateHeight = phase.stateHeights[state] * maxBarHeight * 0.8;

        if (stateHeight > 2) {
          ctx.fillStyle = stateColors[state];
          ctx.beginPath();
          ctx.roundRect(x + 2, currentY - stateHeight, barWidth - 4, stateHeight, 2);
          ctx.fill();

          currentY -= stateHeight;
        }
      });
    });

    // Time labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    
    let actualSessionDurationSeconds: number;
    if (data.length > 1 && data[0].timestamp && data[data.length - 1].timestamp) {
      actualSessionDurationSeconds = (data[data.length - 1].timestamp! - data[0].timestamp!) / 1000;
    } else {
      actualSessionDurationSeconds = sessionDuration * 60;
    }

    const timePerPhase = actualSessionDurationSeconds / 12;

    for (let i = 0; i <= 12; i += 3) {
      const x = padding + (width - padding * 2) * (i / 12);
      const timeInSeconds = Math.round(timePerPhase * i);

      let timeLabel: string;
      if (timeInSeconds < 60) {
        timeLabel = `${timeInSeconds}s`;
      } else {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        timeLabel = seconds === 0 ? `${minutes}m` : `${minutes}m${seconds}s`;
      }

      ctx.fillText(timeLabel, x, height - 5);
    }
  }, [data, metrics.phases, sessionDuration, canvasSize]);


  const getPhaseColor = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'relaxed': return 'bg-emerald-400';  // closest to mint green (#34d399)
      case 'focused': return 'bg-orange-500';   // close to vibrant orange (#f97316)
      case 'meditation': return 'bg-indigo-500';// close to electric blue (#6366f1)
      case 'drowsy': return 'bg-gray-400';      // close to cool gray (#9ca3af)
      default: return 'bg-slate-500';
    }
  };



  return (
    <div className={`w-full  h-full  bg-slate-800 rounded-sm overflow-hidden shadow-2xl ${className}`}>
 <div className="p-6" style={{ padding: '10px' }}>
        {/* Phases Canvas */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2" style={{ padding: '10px' }}>
            <span className="text-sm text-slate-400">Session Phases</span>
            <span className="text-xs text-slate-500">{metrics.phases.length} phases detected</span>
          </div>
          <div className="w-full h-[120px]">
            <canvas 
              ref={canvasRef} 
              className="w-full h-full rounded-xl"
              style={{
                width: '100%',
                height: '100%',
                display: 'block' // Removes extra space below canvas
              }}
            />
          </div>
        </div>
        {/* Meditation Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 h-20">

          {Object.entries(metrics.statePercentages).map(([state, pct]) => (
            <div key={state} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getPhaseColor(state)}`}></div>
              <div className="text-xs text-slate-300">{state}</div>
            </div>

          ))}
        </div>

        {/* Session Insights */}
        <div className="mt-6 p-4 bg-emerald-900/20 rounded-xl border border-emerald-800/30" style={{ padding: '10px' }}>
          <div className="flex items-center space-x-2 mb-2">
            <Award className="w-4 h-10 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Session Insights</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {meditationScore >= 80
              ? "Outstanding session! You maintained deep meditative states with excellent mind control."
              : meditationScore >= 60
                ? "Good progress! Your relaxation response is developing well. Try extending session time."
                : "Keep practicing! Focus on breathing techniques to improve alpha wave consistency."}
          </p>
        </div>

      </div>
    </div>
  );
};

export default MeditationAnalysis;