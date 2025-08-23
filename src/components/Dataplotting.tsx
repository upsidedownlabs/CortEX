// app/SignalVisualizer.tsx
"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useMotionValue } from "framer-motion";
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts';
import { Activity, Brain, Heart, Box, Moon, Sun } from 'lucide-react';
import { useBleStream } from '../components/Bledata';
import WebglPlotCanvas from '../components/WebglPlotCanvas';
import Contributors from './Contributors';
import { WebglPlotCanvasHandle } from "../components/WebglPlotCanvas";
import HRVPlotCanvas, { HRVPlotCanvasHandle } from '@/components/Hrvwebglplot'
import { StateIndicator, State } from "@/components/StateIndicator";
import MeditationWaveform from "../components/MeditationWaveform"; // Add this import
import { predictState } from "@/lib/stateClassifier";
import { MeditationSession } from '../components/MeditationSession';
import QuoteCard from './QuoteCard';
import Link from "next/link";

const CHANNEL_COLORS: Record<string, string> = {
    ch0: "#C29963", // EEG channel 0
    ch1: "#63A2C2", // EEG channel 1
    ch2: "#E4967E", // ECG channel 1
};

export default function SignalVisualizer() {
    const [darkMode, setDarkMode] = useState(false);
    const canvaseeg1Ref = useRef<WebglPlotCanvasHandle>(null);
    const canvaseeg2Ref = useRef<WebglPlotCanvasHandle>(null);
    const canvasecgRef = useRef<WebglPlotCanvasHandle>(null);
    const buf0Ref = useRef<number[]>([]);
    const buf1Ref = useRef<number[]>([]);
    const radarDataCh0Ref = useRef<{ subject: string; value: number }[]>([]);
    const radarDataCh1Ref = useRef<{ subject: string; value: number }[]>([]);
    const workerRef = useRef<Worker | null>(null);
    const dataProcessorWorkerRef = useRef<Worker | null>(null);
    // Animation state
    const [isBeating, setIsBeating] = useState(false);
    const [displayState, setDisplayState] = useState<State>("no_data");
    const stateWindowRef = useRef<{ state: State; timestamp: number }[]>([]);
    const lastStateUpdateRef = useRef<number>(0);
    const connectionStartRef = useRef<number | null>(null);
    const [sessionResults, setSessionResults] = useState<{
        duration: number;
        averages: {
            alpha: number;
            beta: number;
            theta: number;
            delta: number;
            symmetry: number;
        };
        mentalState: string;
        stateDescription: string;
        focusScore: string;
        symmetry: string;
        data: typeof sessionDataRef.current;
        dominantBands: Record<string, number>;
        mostFrequent: string;
        convert: (ticks: number) => string;
        avgSymmetry: string;
        formattedDuration: string;
        statePercentages: Record<string, string>;
        goodMeditationPct: string;
        weightedEEGScore: number;
        averageHRV: number;  
        averageBPM: number;   
    } | null>(null);
    // 1) Create refs for each display element
    const currentRef = useRef<HTMLDivElement>(null);
    const highRef = useRef<HTMLDivElement>(null);
    const lowRef = useRef<HTMLDivElement>(null);
    const avgRef = useRef<HTMLDivElement>(null);
    const bpmWorkerRef = useRef<Worker | null>(null);
    // new HRV refs
    const hrvRef = useRef<HTMLSpanElement>(null);
    const hrvHighRef = useRef<HTMLSpanElement>(null);
    const hrvLowRef = useRef<HTMLSpanElement>(null);
    const hrvAvgRef = useRef<HTMLSpanElement>(null);
    const hrvplotRef = useRef<HRVPlotCanvasHandle>(null);
    const leftMV = useMotionValue(0);
    const rightMV = useMotionValue(0);
    // onNewECG: buffer ECG and every 500 samples (1 s) send to BPM worker ---
    const ecgBufRef = useRef<number[]>([]);
    const [viewMode, setViewMode] = useState<"radar" | "meditation">("radar");
    const [selectedGoal, setSelectedGoal] = useState<"anxiety" | "meditation" | "sleep">("anxiety");
    const [showResults, setShowResults] = useState(false);
    const lastBPMRef = useRef<number | null>(null);
    const lastHRVRef = useRef<number | null>(null);

    const selectedGoalRef = useRef(selectedGoal);

    useEffect(() => {
        selectedGoalRef.current = selectedGoal;
    }, [selectedGoal]);

    const [calmScore, setCalmScore] = useState<number | null>(null);
    const sessionDataRef = useRef<{ timestamp: number; alpha: number; beta: number; theta: number; delta: number, symmetry: number }[]>([]);
    const isMeditatingRef = useRef(false); // Add this line to define isMeditatingRef
    const SAMPLE_RATE = 500;
    const FFT_SIZE = 256;

    const sampleCounterRef = useRef(0);

    // Create beating heart animation effect
    useEffect(() => {
        const interval = setInterval(() => {
            setIsBeating(true);
            setTimeout(() => setIsBeating(false), 200);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const datastream = useCallback((data: number[]) => {
        // Only send raw data to worker (no direct canvas updates)
        dataProcessorWorkerRef.current?.postMessage({
            command: "process",
            rawData: {
                counter: data[0],
                raw0: data[1], // EEG 1
                raw1: data[2], // EEG 2
                raw2: data[3], // ECG
            },
        });

    }, []);

    const { connected, connect, disconnect } = useBleStream(datastream);


    // inside your component, before the return:
    const bandData = [
        { subject: "Delta", value: 0 },
        { subject: "Theta", value: 0 },
        { subject: "Alpha", value: 0 },
        { subject: "Beta", value: 0 },
        { subject: "Gamma", value: 0 },
    ];
    // 2. Let the worker's onmessage handle ALL visualization updates
    useEffect(() => {
        const worker = new Worker(
            new URL("../webworker/dataProcessor.worker.ts", import.meta.url),
            { type: "module" }
        );
        worker.onmessage = (e) => {
            if (e.data.type === "processedData") {
                const { counter, eeg0, eeg1, ecg } = e.data.data;
                canvaseeg1Ref.current?.updateData([counter, eeg0, 1]);
                canvaseeg2Ref.current?.updateData([counter, eeg1, 2]);
                canvasecgRef.current?.updateData([counter, ecg, 3]);
                onNewSample(eeg0, eeg1); // For radar charts
            }

        };
        dataProcessorWorkerRef.current = worker;
        return () => worker.terminate();
    }, []);

    useEffect(() => {
        const w = new Worker(
            new URL("../webworker/bandPower.worker.ts", import.meta.url),
            { type: "module" }
        );

        w.onmessage = (
            e: MessageEvent<{
                smooth0: Record<string, number>;
                smooth1: Record<string, number>;
            }>
        ) => {
            const { smooth0, smooth1 } = e.data;

            // Radar data
            leftMV.set(smooth0.beta);
            rightMV.set(smooth1.beta);

            function capitalize(subject: string): string {
                return subject.charAt(0).toUpperCase() + subject.slice(1);
            }

            radarDataCh0Ref.current = Object.entries(smooth0).map(
                ([subject, value]) => ({ subject: capitalize(subject), value })
            );

            radarDataCh1Ref.current = Object.entries(smooth1).map(
                ([subject, value]) => ({ subject: capitalize(subject), value })
            );

            let score = 0;
            const goal = selectedGoalRef.current;

            if (goal === "anxiety") {
                score = (Number(smooth0.alpha) + Number(smooth1.alpha)) / (Number(smooth0.beta) + Number(smooth1.beta) + 0.001);
            } else if (goal === "meditation") {
                score = (smooth0.theta + smooth1.theta) / 2;
            } else if (goal === "sleep") {
                score = (smooth0.delta + smooth1.delta) / 2;
            }

            const currentData = {
                timestamp: Date.now(),
                alpha: (smooth0.alpha + smooth1.alpha) / 2,
                beta: (smooth0.beta + smooth1.beta) / 2,
                theta: (smooth0.theta + smooth1.theta) / 2,
                delta: (smooth0.delta + smooth1.delta) / 2,
                symmetry: Math.abs(smooth0.alpha - smooth1.alpha),
                bpm: lastBPMRef.current ?? null,
                hrv: lastHRVRef.current ?? null,
            };

            // ✅ Only record data if meditating
            if (isMeditatingRef.current) {
                sessionDataRef.current.push(currentData);
            }

            setCalmScore(score);
        };

        workerRef.current = w;

        return () => {
            w.terminate();
        };
    }, []);


    const onNewSample = useCallback((eeg0: number, eeg1: number) => {
        buf0Ref.current.push(eeg0);
        buf1Ref.current.push(eeg1);
        sampleCounterRef.current++;

        // Maintain a rolling buffer of 256 samples
        if (buf0Ref.current.length > FFT_SIZE) {
            buf0Ref.current.shift();
            buf1Ref.current.shift();
        }

        // Run FFT every 10 samples (≈ every 20ms at 500Hz)
        if (sampleCounterRef.current % 10 === 0 && buf0Ref.current.length === FFT_SIZE) {
            workerRef.current?.postMessage({
                eeg0: [...buf0Ref.current],
                eeg1: [...buf1Ref.current],
                sampleRate: SAMPLE_RATE,
                fftSize: FFT_SIZE,
            });
        }
    }, []);

    const onNewECG = useCallback((ecg: number) => {
        ecgBufRef.current.push(ecg);
        // keep last 4 s @500 Hz = 2500 samples
        if (ecgBufRef.current.length > 2500) {
            ecgBufRef.current.shift();
        }
        // every full second → 500 new samples
        if (ecgBufRef.current.length % 500 === 0) {
            bpmWorkerRef.current?.postMessage({
                ecgBuffer: [...ecgBufRef.current],
                sampleRate: 500,
            });
        }
    }, []);

    useEffect(() => {
        const worker = new Worker(
            new URL("../webworker/bpm.worker.ts", import.meta.url),
            { type: "module" }
        );

        const bpmWindow: number[] = [];
        const windowSize = 5;
        let displayedBPM: number | null = null;
        const maxChange = 2;

        worker.onmessage = (
            e: MessageEvent<{
                bpm: number | null;
                high: number | null;
                low: number | null;
                avg: number | null;
                peaks: number[];
                hrv: number | null;
                hrvHigh: number | null;
                hrvLow: number | null;
                hrvAvg: number | null;
                sdnn: number;      // true SDNN from worker
                rmssd: number;     // latest RMSSD from worker
                pnn50: number;     // pNN50 from worker
            }>
        ) => {
            const { bpm, high, low, avg, hrv, hrvHigh, hrvLow, hrvAvg, sdnn, rmssd, pnn50 } = e.data;


            if (hrv !== null && !isNaN(hrv)) {
                hrvplotRef.current?.updateHRV(hrv);
            }

            // Update BPM values
            if (bpm !== null) {
                bpmWindow.push(bpm);
                if (bpmWindow.length > windowSize) bpmWindow.shift();
                const avgBPM = bpmWindow.reduce((a, b) => a + b, 0) / bpmWindow.length;
                if (displayedBPM === null) displayedBPM = avgBPM;
                else {
                    const diff = avgBPM - displayedBPM;
                    displayedBPM += Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
                }
                if (currentRef.current) currentRef.current.textContent = `${Math.round(displayedBPM)}`;
            } else {
                bpmWindow.length = 0;
                displayedBPM = null;
                if (currentRef.current) currentRef.current.textContent = "--";
            }

            if (highRef.current) highRef.current.textContent = high !== null ? `${high}` : "--";
            if (lowRef.current) lowRef.current.textContent = low !== null ? `${low}` : "--";
            if (avgRef.current) avgRef.current.textContent = avg !== null ? `${avg}` : "--";

            // Update HRV values
            if (hrvRef.current) hrvRef.current.textContent = hrv !== null ? `${hrv}` : "--";
            if (hrvHighRef.current) hrvHighRef.current.textContent = hrvHigh !== null ? `${hrvHigh}` : "--";
            if (hrvLowRef.current) hrvLowRef.current.textContent = hrvLow !== null ? `${hrvLow}` : "--";
            if (hrvAvgRef.current) hrvAvgRef.current.textContent = hrvAvg !== null ? `${hrvAvg}` : "--";


            const currentState = predictState({ sdnn, rmssd, pnn50 });

            // State window management for 5-second updates
            const now = Date.now();

            // Initialize connection time
            if (connectionStartRef.current === null) {
                connectionStartRef.current = now;
                lastStateUpdateRef.current = now;
            }

            if (bpm !== null) lastBPMRef.current = bpm;
            if (hrv !== null) lastHRVRef.current = hrv;

            // Add current state to window
            stateWindowRef.current.push({
                state: currentState,
                timestamp: now
            });

            // Configuration - easy to change
            const STATE_UPDATE_INTERVAL = 5000; // 5 seconds in milliseconds
            const fiveSecondsAgo = now - STATE_UPDATE_INTERVAL;
            stateWindowRef.current = stateWindowRef.current.filter(
                item => item.timestamp >= fiveSecondsAgo
            );

            // Check if it's time to update display state (every 5 seconds)
            const timeSinceLastUpdate = now - lastStateUpdateRef.current;
            const timeSinceConnection = now - connectionStartRef.current;

            if (timeSinceConnection < STATE_UPDATE_INTERVAL) {
                // Show "no_data" for first 5 seconds
                setDisplayState("no_data");
            } else if (timeSinceLastUpdate >= STATE_UPDATE_INTERVAL) {
                // Update display state every 5 seconds
                if (stateWindowRef.current.length > 0) {
                    // Count frequency of each state in the last 5 seconds
                    const stateCounts: Record<string, number> = {};
                    stateWindowRef.current.forEach(item => {
                        stateCounts[item.state] = (stateCounts[item.state] || 0) + 1;
                    });

                    // Find the most dominant state
                    const dominantState = Object.entries(stateCounts).reduce((a, b) =>
                        a[1] > b[1] ? a : b
                    )[0] as State;

                    setDisplayState(dominantState);
                    lastStateUpdateRef.current = now;

                }
            }

        };


        bpmWorkerRef.current = worker;

        return () => {
            worker.terminate();
        };
    }, []);

    useEffect(() => {
        isMeditatingRef.current = viewMode === "meditation";
    }, [viewMode]);

    useEffect(() => {
        if (connected) {
            // Reset all state tracking when device connects
            connectionStartRef.current = Date.now();
            lastStateUpdateRef.current = Date.now();
            stateWindowRef.current = [];
            setDisplayState("no_data");
        } else {
            // Reset when device disconnects
            connectionStartRef.current = null;
            lastStateUpdateRef.current = 0;
            stateWindowRef.current = [];
            setDisplayState("no_data");
        }
    }, [connected]);


    // 5) Hook into your existing dataProcessor worker
    useEffect(() => {
        const dp = dataProcessorWorkerRef.current!;
        const handler = (e: MessageEvent) => {
            if (e.data.type === "processedData") {
                const { eeg0, eeg1, ecg } = e.data.data;
                onNewSample(eeg0, eeg1);
                onNewECG(ecg);
            }
        };
        dp.addEventListener("message", handler);
        return () => {
            dp.removeEventListener("message", handler);
        };
    }, [onNewSample, onNewECG]);


    const bgGradient = darkMode
        ? "bg-neutral-900"
        : "bg-stone-200";
    const cardBg = darkMode
        ? "bg-zinc-800/90 border-zinc-700/50"
        : "bg-white/95 border-stone-200";
    const statCardBg = darkMode ? "bg-zinc-700/50" : "bg-stone-100/80"; // Added statCardBg variable
    const primaryAccent = darkMode ? "text-amber-300" : "text-amber-600";
    const secondaryAccent = darkMode ? "text-rose-300" : "text-rose-500";
    const textPrimary = darkMode ? "text-stone-300" : "text-stone-800";
    const textSecondary = darkMode ? "text-stone-400" : "text-stone-500";
    const gridLines = darkMode ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
    const axisColor = darkMode ? "#71717a" : "#78716c";
    const iconBoxBg = darkMode ? "bg-amber-900/20" : "bg-amber-50";
    const heartIconBoxBg = darkMode ? "bg-rose-900/20" : "bg-rose-50";
    const labelText = darkMode ? "text-zinc-400" : "text-stone-500"; // Added for labels
    const buttonbg = darkMode ? "bg-amber-300" : "bg-amber-600";

    return (
        <div className={`flex flex-col h-screen w-full overflow-hidden text-sm sm:text-base md:text-lg lg:text-xl ${bgGradient} transition-colors duration-300`}>
            {/* Header - Fixed height */}
            <header className={`${darkMode
                ? 'bg-zinc-900/90 backdrop-blur-sm border-b border-amber-900/20'
                : 'bg-white/90 backdrop-blur-sm border-b border-amber-100'} 
                h-8 sm:h-9 md:h-10 lg:h-11 transition-colors duration-300 z-10 flex-shrink-0`}>
                <div className="w-full h-full flex justify-between items-center" style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
                    <div className="flex items-center space-x-3">
                        <Activity className={`${primaryAccent} w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7`} />
                        <h1 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-light tracking-tight">
                            <span className={`font-bold ${textPrimary}`}>Cort</span>
                            <span className={`${primaryAccent} font-bold ml-1`}>EX</span>
                        </h1>
                    </div>
                    <div className="flex items-center" style={{ gap: '1.25rem' }}>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`p-1.5 sm:p-2 md:p-2.5 rounded-xl transition-all duration-300 
                                ${darkMode ? ' text-zinc-200' : ' text-stone-700'} 
                                transform hover:scale-105 flex items-center justify-center cursor-pointer`}
                        >
                            {darkMode ?
                                <Sun className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" strokeWidth={2} /> :
                                <Moon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" strokeWidth={2} />
                            }
                        </button>
                        <div className="flex items-center cursor-pointer">
                            <Contributors darkMode={darkMode} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content - Flexible height */}
            <main className="flex-1 w-full overflow-hidden flex flex-col ">
                <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 h-full min-h-0 overflow-hidden w-full ">
                    {/* First Column - Device Info */}
                    <div className="lg:col-span-1 flex flex-col gap-2 h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-4">

                        {/* First card - device connection */}
                        <div className={`rounded-xl p-3 sm:p-4 md:p-6 border ${cardBg} flex flex-col items-center transition-colors duration-300 h-1/3 min-h-0 overflow-hidden`}>
                            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                                <div className={`p-2 sm:p-3 md:p-4 rounded-xl ${iconBoxBg} transition-colors duration-300`}>
                                    <Box className={`${primaryAccent} w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7`} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="w-full flex justify-center px-2 sm:px-3 md:px-4" style={{ paddingBottom: '0.75rem' }}>
                                <button
                                    onClick={connected ? disconnect : connect}
                                    className={`min-w-[120px] max-w-[160px] w-auto px-10 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base
                                     rounded-md font-semibold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap transform  cursor-pointer
                                     ${darkMode
                                            ? "bg-amber-300 text-zinc-800/90"
                                            : "bg-amber-600 text-white/90"
                                        }
                               ${buttonbg}`}
                                    style={{ padding: "0.3rem" }}
                                >
                                    <span className="font-bold ">
                                        {connected ? "Disconnect" : "Connect"}
                                    </span>
                                </button>
                            </div>

                        </div>


                        {/* second card - Meditation View (Last Session Preview with Modal) */}
                        <div
                            className={`rounded-xl p-3 sm:p-4 md:p-6 ${cardBg} flex flex-col transition-colors duration-300 min-h-0 h-1/3 overflow-hidden w-full `}
                        >
                            <div className="w-full flex justify-center mb-2 sm:mb-3 md:mb-4">
                                <h3 className={`text-sm sm:text-md md:text-lg lg:text-xl font-semibold  ${primaryAccent}`}>Meditation</h3>
                            </div>

                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <MeditationSession
                                    connected={connected}
                                    onStartSession={() => {
                                        sessionDataRef.current = [];
                                        isMeditatingRef.current = true;
                                    }}
                                    onEndSession={() => {
                                        isMeditatingRef.current = false;
                                    }}
                                    sessionData={sessionDataRef.current}
                                    darkMode={darkMode}
                                    sessionResults={sessionResults}
                                    setSessionResults={setSessionResults}
                                    setShowResults={setShowResults}
                                    renderSessionResults={(results) => (
                                        <>
                                            <div className="flex justify-center items-center h-full">
                                                <button
                                                    onClick={() => setSessionResults(null)}
                                                    className={`min-w-[120px] max-w-[160px] w-auto px-10 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base 
                            rounded-md transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap  transform hover:scale-105
                            ${darkMode ? "bg-amber-300  text-zinc-800/90  "
                                                            : "bg-amber-600  text-white/90"}  "}  cursor-pointer
                                 ${buttonbg}`}
                                                    style={{ padding: "0.3rem" }}
                                                >

                                                    Start New Session
                                                </button>
                                            </div>

                                            {showResults && (
                                                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                                                    <div className="w-full max-w-4xl mx-4 sm:mx-6 my-6 bg-white dark:bg-black rounded-xl max-h-[90vh] overflow-y-auto flex flex-col">
                                                        {/* Header with close button */}
                                                        <div className="relative flex items-center justify-center  top-0 z-10 mb-4 h-10 sm:h-14">
                                                            <h4 className="absolute left-1/2 -translate-x-1/2 text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#548687]">
                                                                Session Complete: Meditation Insights
                                                            </h4>
                                                            <button
                                                                onClick={() => setShowResults(false)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-lg sm:text-xl text-gray-600 dark:text-gray-300 hover:text-red-600 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                                                            >
                                                                Close
                                                            </button>
                                                        </div>


                                                        {/* Main content area */}
                                                        <div className="flex flex-col lg:flex-row p-4 sm:p-6 flex-1">
                                                            {/* Left Panel - Waveform Visualization */}
                                                            <div className="flex-1 min-w-0" style={{ margin: '10px' }}>
                                                                <MeditationWaveform
                                                                    data={sessionDataRef.current}
                                                                    sessionDuration={
                                                                        sessionDataRef.current.length > 1
                                                                            ? ((sessionDataRef.current.at(-1)!.timestamp! - sessionDataRef.current[0].timestamp!) / 60000)
                                                                            : 0
                                                                    }
                                                                    darkMode={darkMode}
                                                                />
                                                            </div>

                                                            {/* Right Panel - Session Results */}
                                                            <div className="flex-1 min-w-0  lg:pl-6 " style={{ margin: '10px 10px 10px 0' }}
                                                            >
                                                                <div className="flex flex-col gap-2 ">
                                                                    {/* Mental State Indicator */}
                                                                    <div className="text-center py-3 px-4 sm:py-4 sm:px-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800" style={{ padding: '6px' }}>
                                                                        <div className="text-sm sm:text-base md:text-lg font-bold text-[#FF352E] mb-2">
                                                                            {results.mostFrequent === 'alpha' ? '🧘 Deep Relaxation' :
                                                                                results.mostFrequent === 'theta' ? '🛌 Profound Meditation' :
                                                                                    results.mostFrequent === 'beta' ? '🎯 Active Focus' :
                                                                                        results.mostFrequent === 'delta' ? '💤 Restful State' : '⚪ Balanced State'}
                                                                        </div>
                                                                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                                                            Primary mental state during session
                                                                        </div>
                                                                    </div>

                                                                    {/* Summary Grid */}
                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                                        <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-800 text-center" style={{ padding: '6px' }}>
                                                                            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-2" >
                                                                                Dominant State
                                                                            </div>
                                                                            <div className="text-sm font-bold capitalize text-gray-800 dark:text-gray-200">
                                                                                {results.mostFrequent}
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-900/20 border border-blue-300 dark:border-blue-800 text-center" style={{ padding: '6px' }}>
                                                                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-2" >
                                                                                Session Duration
                                                                            </div>
                                                                            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                                {results.duration}
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-800 text-center" style={{ padding: '6px' }}>
                                                                            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase mb-2" >
                                                                                Brain Symmetry
                                                                            </div>
                                                                            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                                {Math.abs(Number(results.avgSymmetry)) < 0.1
                                                                                    ? 'Balanced'
                                                                                    : Number(results.avgSymmetry) > 0
                                                                                        ? 'Left Dominant'
                                                                                        : 'Right Dominant'}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Brainwave Analysis */}
                                                                    <div className="space-y-4">
                                                                        <h4 className="text-sm sm:text-base md:text-lg font-bold text-[#548687] dark:border-zinc-700 pb-2">
                                                                            🧘 Brainwave Analysis
                                                                        </h4>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {Object.entries(results.statePercentages).map(([state, pct]) => (
                                                                                <div
                                                                                    key={state}
                                                                                    className="flex justify-between items-center  px-3 py-5 sm:px-4 sm:py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
                                                                                    style={{ padding: '6px' }}
                                                                                >
                                                                                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{state}</span>
                                                                                    <span className="text-sm font-bold text-[#5FB9BA]">{pct}%</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className="p-3 rounded-xl bg-pink-100 dark:bg-pink-900/20 border border-pink-300 dark:border-pink-800 text-center">
                                                                            <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase mb-2">
                                                                                Average HRV
                                                                            </div>
                                                                            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                                {results.averageHRV ?? "--"} ms
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-center">
                                                                            <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">
                                                                                Average BPM
                                                                            </div>
                                                                            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                                                                {results.averageBPM ?? "--"}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Performance Indicator */}
                                                                    <div className="p-4 text-center rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-800" style={{ padding: '6px' }}>
                                                                        <div className="text-sm sm:text-base md:text-lg font-bold mb-2">
                                                                            {Number(results.goodMeditationPct) >= 75
                                                                                ? `🌟 Excellent Session!`
                                                                                : Number(results.goodMeditationPct) >= 50
                                                                                    ? `🌿 Great Progress!`
                                                                                    : `⚠️ Keep Practicing!`}
                                                                        </div>
                                                                        <div className="text-xs sm:text-sm">
                                                                            {Number(results.goodMeditationPct) >= 75
                                                                                ? `You spent ${Math.round(Number(results.goodMeditationPct))}% in a strong meditative state.`
                                                                                : Number(results.goodMeditationPct) >= 50
                                                                                    ? `You spent ${Math.round(Number(results.goodMeditationPct))}% in a good meditation state.`
                                                                                    : `You're building your meditation foundation. Keep going!`}
                                                                        </div>
                                                                    </div>

                                                                    {/* Session Insights */}
                                                                    <div className="p-4 rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 " style={{ padding: '10px' }}>
                                                                        <h5 className="text-sm sm:text-base md:text-lg font-bold text-yellow-800 dark:text-yellow-100 mb-3">
                                                                            📊 Session Insights
                                                                        </h5>
                                                                        <div className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-100 leading-relaxed space-y-3">
                                                                            {(() => {
                                                                                const alphaPct = results.statePercentages.Relaxed;
                                                                                const thetaPct = results.statePercentages["Meditation"];
                                                                                const betaPct = results.statePercentages.Focused;
                                                                                const dominantText =
                                                                                    results.mostFrequent === 'alpha'
                                                                                        ? 'a calm, relaxed state'
                                                                                        : results.mostFrequent === 'theta'
                                                                                            ? 'a deeply meditative state'
                                                                                            : results.mostFrequent === 'beta'
                                                                                                ? 'an alert or focused state'
                                                                                                : 'a restful, sleepy state'
                                                                                const symmetry =
                                                                                    Math.abs(Number(results.avgSymmetry)) < 0.05
                                                                                        ? 'showed balanced brain hemisphere activity'
                                                                                        : Number(results.avgSymmetry) > 0
                                                                                            ? `showed left hemisphere dominance (analytical thinking)`
                                                                                            : `showed right hemisphere dominance (creative thinking)`;
                                                                                const feedback =
                                                                                    Number(betaPct) > 30
                                                                                        ? 'Consider focusing on breath awareness to reduce mental chatter in future sessions.'
                                                                                        : Number(thetaPct) > 40
                                                                                            ? "Excellent deep meditation achieved! You're developing strong mindfulness skills."
                                                                                            : "Good foundation building. Regular practice will deepen your meditative states.";
                                                                                return (
                                                                                    <>
                                                                                        <p>
                                                                                            <strong>State Analysis:</strong> You maintained {dominantText} for {results.duration},
                                                                                            with {alphaPct}% relaxation and {thetaPct}% deep meditation activity.
                                                                                        </p>
                                                                                        <p>
                                                                                            <strong>Brain Balance:</strong> Your session {symmetry}.
                                                                                        </p>
                                                                                        <p>
                                                                                            <strong>Recommendation:</strong> {feedback}
                                                                                        </p>
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                />
                            </div>
                        </div>


                        {/* third card - device status */}
                        <div className={`rounded-xl    ${cardBg} flex flex-col transition-colors duration-300 h-1/3 min-h-0 overflow-hidden`}>

                            <div className="flex-1 flex flex-col overflow-hidden ">
                                {/* Waveform Visualization - takes remaining space */}
                                <div className="flex-1  overflow-hidden ">
                                    {/* Replace your third card with the Quote Card */}
                                    <QuoteCard
                                        cardBg={cardBg}
                                        refreshInterval={9000}
                                        darkMode={darkMode}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second Column (40%) - EEG */}
                    <div className="lg:col-span-2 flex flex-col gap-2  h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-4">

                        {/* EEG Row 1: Brain Image - Reduced height */}
                        <div className={`rounded-xl py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6 border ${cardBg} flex items-center justify-center transition-colors duration-300 flex-none`}
                            style={{ height: "70px" }}>
                            <div className="flex items-center w-full justify-center">
                                <div className={`p-1 sm:p-2 md:p-3 rounded-xl duration-300`} style={{ marginRight: '1rem' }}>
                                    <Brain className={`${primaryAccent} w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8`} />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h2 className={`text-sm sm:text-base md:text-lg lg:text-xl font-semibold ${textPrimary} leading-tight`}>
                                        Brain Activity
                                    </h2>
                                    <p className={`text-xs sm:text-sm md:text-base ${textSecondary} leading-tight`}>
                                        Electroencephalogram (EEG)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* EEG Row 2: Radar Charts */}
                        <div className={`rounded-xl p-2 sm:p-3 md:p-4 border ${cardBg} transition-all duration-300 h-2/5 min-h-0 overflow-hidden backdrop-blur-sm flex flex-col`}>

                            {/* Content Area */}
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <div className="flex flex-row h-full gap-2 p-1 sm:p-2">

                                    {/* Left Chart */}
                                    <div className="flex-1 flex flex-col h-full">
                                        <div className="rounded-xl p-2 sm:p-4 md:p-6 h-full">
                                            <div className="flex-1 min-h-0 overflow-hidden" style={{ height: 'calc(100% - 30px)' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart
                                                        data={radarDataCh0Ref.current.length ? radarDataCh0Ref.current : bandData}
                                                        cx="50%" cy="50%" outerRadius="65%"
                                                    >
                                                        <PolarGrid
                                                            strokeDasharray="2 3"
                                                            stroke={gridLines}
                                                            strokeOpacity={0.6}
                                                        />
                                                        <PolarAngleAxis
                                                            dataKey="subject"
                                                            tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                                                            className="text-xs sm:text-sm"
                                                        />
                                                        <PolarRadiusAxis
                                                            domain={[0, "auto"]}
                                                            tick={false}
                                                            axisLine={false}
                                                            tickLine={false}
                                                        />
                                                        <Radar
                                                            name="Ch0"
                                                            dataKey="value"
                                                            stroke={CHANNEL_COLORS.ch0}
                                                            strokeWidth={1.5}
                                                            fill={CHANNEL_COLORS.ch0}
                                                            fillOpacity={0.3}
                                                            dot={{ fill: CHANNEL_COLORS.ch0, strokeWidth: 1, r: 2 }}
                                                        />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="text-center ">
                                                <div className={`text-xs sm:text-sm md:text-base font-semibold ${primaryAccent}`}>
                                                    Left Hemisphere
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Chart */}
                                    <div className="flex-1 flex flex-col h-full">
                                        <div className="rounded-xl p-2 sm:p-4 md:p-6 h-full">
                                            <div className="flex-1 min-h-0 overflow-hidden" style={{ height: 'calc(100% - 30px)' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart
                                                        data={radarDataCh1Ref.current.length ? radarDataCh1Ref.current : bandData}
                                                        cx="50%" cy="50%" outerRadius="65%"
                                                    >
                                                        <PolarGrid
                                                            strokeDasharray="2 3"
                                                            stroke={gridLines}
                                                            strokeOpacity={0.6}
                                                        />
                                                        <PolarAngleAxis
                                                            dataKey="subject"
                                                            tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                                                            className="text-xs sm:text-sm"
                                                        />
                                                        <PolarRadiusAxis
                                                            domain={[0, "auto"]}
                                                            tick={false}
                                                            axisLine={false}
                                                            tickLine={false}
                                                        />
                                                        <Radar
                                                            name="Ch1"
                                                            dataKey="value"
                                                            stroke={CHANNEL_COLORS.ch1}
                                                            strokeWidth={1.5}
                                                            fill={CHANNEL_COLORS.ch1}
                                                            fillOpacity={0.3}
                                                            dot={{ fill: CHANNEL_COLORS.ch1, strokeWidth: 1, r: 2 }}
                                                        />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="text-center ">
                                                <div className={`text-xs sm:text-sm md:text-base font-semibold ${primaryAccent}`}>
                                                    Right Hemisphere
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EEG Row 3: EEG Charts - Remaining height */}
                        <div className="flex flex-col gap-2 h-flex-1 flex-1 min-h-0 overflow-hidden">
                            {/* Chart 1 */}
                            <div className={`h-1/2 min-h-0 rounded-xl overflow-hidden p-2 transition-colors duration-300 ${darkMode ? 'bg-zinc-800/90' : 'bg-white'}`}>
                                <WebglPlotCanvas
                                    ref={canvaseeg1Ref}
                                    channels={[0]} // EEG Channel 0
                                    colors={{ 0: CHANNEL_COLORS.ch0 }}
                                    gridnumber={50}
                                />
                            </div>
                            {/* Chart 2 */}
                            <div className={`h-1/2 min-h-0 rounded-xl overflow-hidden p-2 transition-colors duration-300 ${darkMode ? 'bg-zinc-800/90' : 'bg-white'}`}>
                                <WebglPlotCanvas
                                    ref={canvaseeg2Ref}
                                    channels={[1]} // EEG Channel 1
                                    colors={{ 1: CHANNEL_COLORS.ch1 }}
                                    gridnumber={50}
                                />
                            </div>

                        </div>
                    </div>

                    {/* Third Column (40%) - ECG */}
                    <div className="lg:col-span-2 flex flex-col gap-2  h-full min-h-0 overflow-hidden p-2 sm:p-3 md:p-4">

                        {/* ECG Row 1: Heart Image - Fixed height */}
                        <div className={`rounded-xl py-2 sm:py-3 md:py-4 px-3 sm:px-4 md:px-6 border ${cardBg} flex items-center justify-center transition-colors duration-300 flex-none`}
                            style={{ height: "70px" }}>
                            <div className="flex items-center w-full justify-center">
                                {connected && (
                                    <div className={`p-1 sm:p-2 md:p-3 rounded-full ${heartIconBoxBg} transition-all duration-300 ${isBeating ? 'scale-110' : 'scale-100'}`}
                                        style={{ marginRight: '1rem' }}>
                                        <Heart
                                            className={`${secondaryAccent} ${isBeating ? 'scale-110' : 'scale-100'} transition-all duration-200 w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8`}
                                            strokeWidth={1.5}
                                            fill={isBeating ? "currentColor" : "none"}
                                        />
                                    </div>
                                )}

                                <div className="flex flex-col justify-center">
                                    <h2 className={`text-sm sm:text-base md:text-lg lg:text-xl font-semibold ${textPrimary} leading-tight`}>
                                        Heart Activity
                                    </h2>
                                    <p className={`text-xs sm:text-sm md:text-base ${textSecondary} leading-tight`}>
                                        Electrocardiogram (ECG)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ECG Row 2: BPM + HRV Info - Clean & Spacious */}
                        <div className={`${cardBg} rounded-xl border transition-colors duration-300 h-2/5 min-h-0 overflow-hidden flex flex-col`} style={{ padding: '0.3rem' }}>
                            {/* ── Top Section: Heart Rate Stats ── */}
                            <div className="grid grid-cols-5 gap-2  flex-shrink-0 mb-3 " style={{ padding: '2px' }}>
                                {/* Current BPM - takes 2 columns */}
                                <div className="col-span-2 flex flex-col justify-center pr-1 sm:pr-2 md:pr-3">
                                    <div className="flex items-baseline gap-2">
                                        <span
                                            ref={currentRef}
                                            className={`text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold  ${secondaryAccent} leading-none`}
                                        >
                                            --
                                        </span>
                                        <span className={`text-md sm:text-sm md:text-md lg:text-lg ${labelText} leading-none`}>
                                            BPM
                                        </span>
                                    </div>
                                </div>

                                {/* Stats cards - takes 3 columns */}
                                <div className="col-span-3 grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                                    {/* Low stat */}
                                    <div className="flex flex-col items-center justify-center p-1 sm:p-2">
                                        <span className={`text-sm   ${labelText} mb-1 sm:mb-2 leading-none`}>
                                            LOW
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span
                                                ref={lowRef}
                                                className={`text-xs sm:text-sm md:text-base lg:text-lg font-semibold ${textPrimary} leading-none`}
                                            >
                                                --
                                            </span>
                                            <span className={`text-sm sm:text-sm md:text-lg  ${labelText} mb-1 sm:mb-2 leading-none`}>
                                                BPM
                                            </span>
                                        </div>
                                    </div>

                                    {/* Avg stat */}
                                    <div className="flex flex-col items-center justify-center p-1 sm:p-2">
                                        <span className={`text-sm  ${labelText} mb-1 sm:mb-2 leading-none`}>
                                            AVG
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span
                                                ref={avgRef}
                                                className={`text-xs sm:text-sm md:text-base lg:text-lg font-semibold ${textPrimary} leading-none`}
                                            >
                                                --
                                            </span>
                                            <span className={`text-sm sm:text-lg md:text-lg ${labelText} mb-1 sm:mb-2 leading-none`}>
                                                BPM
                                            </span>
                                        </div>
                                    </div>

                                    {/* High stat */}
                                    <div className="flex flex-col items-center justify-center p-1 sm:p-2">
                                        <span className={`text-sm s ${labelText} mb-1 sm:mb-2 leading-none`}>
                                            HIGH
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span
                                                ref={highRef}
                                                className={`text-lg sm:text-sm md:text-base lg:text-lg font-semibold ${textPrimary} leading-none`}
                                            >
                                                --
                                            </span>
                                            <span className={`text-lg sm:text-xs md:text-lg ${labelText} mb-1 sm:mb-2 leading-none`}>
                                                BPM
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* ── HRV Plot Section ── */}
                            <div className="flex-1 min-h-0 overflow-hidden w-full rounded-xl 
                            "style={{ padding: '0.2rem ' }}
                            >
                                <HRVPlotCanvas
                                    ref={hrvplotRef}
                                    numPoints={2000}
                                    color={darkMode ? '#f59e0b' : '#d97706'}
                                    darkMode={darkMode}
                                />
                            </div>
                            {/* ── HRV Stats Section - Smaller ── */}
                            <div className="grid grid-cols-4 gap-1 sm:gap-2 flex-shrink-0 mb-3" style={{ marginBottom: "1px" }}>

                                <div className={`flex flex-col items-center ${statCardBg} rounded-xl`} style={{ padding: '0.2rem ' }}>
                                    <span className={`text-xs ${labelText} mb-1`} style={{ fontSize: '16px' }}>
                                        LOW HRV
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span
                                            ref={hrvLowRef}
                                            className={`text-sm font-semibold ${textPrimary}`}
                                        >
                                            --
                                        </span>
                                        <span className={`ml-1 ${labelText}`} style={{ fontSize: '16px' }}>
                                            ms
                                        </span>
                                    </div>
                                </div>

                                <div className={`flex flex-col items-center ${statCardBg} rounded-lg`} style={{ padding: '0.2rem ' }}>
                                    <span className={`text-xs ${labelText} mb-1`} style={{ fontSize: '16px' }}>
                                        AVG HRV
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span
                                            ref={hrvAvgRef}
                                            className={`text-sm font-semibold ${primaryAccent}`}
                                        >
                                            --
                                        </span>
                                        <span className={`ml-1 ${labelText}`} style={{ fontSize: '16px' }}>
                                            ms
                                        </span>
                                    </div>
                                </div>

                                <div className={`flex flex-col items-center ${statCardBg} rounded-lg`} style={{ padding: '0.2rem ' }}>
                                    <span className={`text-xs ${labelText} mb-1`} style={{ fontSize: '16px' }}>
                                        HIGH HRV
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <span
                                            ref={hrvHighRef}
                                            className={`text-lg font-semibold ${textPrimary}`}
                                        >
                                            --
                                        </span>
                                        <span className={`ml-1 ${labelText}`} style={{ fontSize: '16px' }}>
                                            ms
                                        </span>
                                    </div>
                                </div>
                                <div className={`flex flex-col items-center ${darkMode ? "bg-zinc-700" : "bg-stone-200"
                                    } rounded-lg`} style={{ padding: '0.2rem ' }}>
                                    <span className={`text-xs ${primaryAccent} mb-1`} style={{ fontSize: '16px' }}>
                                        State
                                    </span>
                                    <div className="flex items-baseline gap-1">
                                        <div className="flex items-center" style={{ transform: 'scale(0.8)' }}>
                                            <StateIndicator state={displayState} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ECG Chart - Remaining height */}
                        <div className={`flex-1 min-h-0 rounded-xl overflow-hidden p-1 sm:p-2 md:p-3 transition-colors duration-300  ${darkMode ? 'bg-zinc-800/90' : 'bg-white'}`}>
                            <WebglPlotCanvas
                                ref={canvasecgRef}
                                channels={[2]} // ECG Channel 2
                                colors={{ 2: CHANNEL_COLORS.ch2 }}
                                gridnumber={100}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer - Fixed height */}
            <footer className={`h-[4%] py-1 ${darkMode ? "bg-zinc-900/90 border-t border-amber-900/20" : "bg-white/90 backdrop-blur-sm border-t border-amber-100"} 
                transition-colors duration-300 z-10 flex-shrink-0`}
                style={{ paddingLeft: '0.3125rem', paddingRight: '0.3125rem' }}>
                <div className="w-full h-full flex flex-col sm:flex-row justify-between items-center" style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
                    <div className={`${textSecondary} text-xs sm:text-sm md:text-base mb-1 sm:mb-0`}>
                        <span className="font-medium">CortEX</span> | &copy; {new Date().getFullYear()}{" "}
                        <Link href="https://upsidedownlabs.tech/" target="_blank">
                            Upside Down Labs
                        </Link>
                    </div>

                    {/* Optional: Add additional footer content on larger screens */}
                    <nav className={`sm:ml-auto flex gap-4 sm:gap-6 ${textSecondary} `}>
                        <Link
                            className="text-sm hover:underline underline-offset-4"
                            target="_blank"
                            href="https://docs.upsidedownlabs.tech/guides/index.html"
                        >
                            Guides
                        </Link>
                        <Link
                            className="text-sm hover:underline underline-offset-4"
                            href="https://linktr.ee/Upside_Down_Labs_Stores"
                            target="_blank"
                        >
                            Stores
                        </Link>
                    </nav>
                </div>
            </footer>
        </div>
    );
}