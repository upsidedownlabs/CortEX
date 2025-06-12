// components/MeditationSession.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useBleStream } from '../components/Bledata';

export const MeditationSession = ({
    onStartSession,
    connected,
    setShowResults,
    onEndSession,
    sessionData,
    sessionResults,
    setSessionResults,
    darkMode,
    renderSessionResults
}: {
    onStartSession: () => void;
    onEndSession: () => void;
    sessionData: { timestamp: number; alpha: number; beta: number; theta: number; delta: number; symmetry: number }[];
    darkMode: boolean;
    connected: boolean;
    setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
    sessionResults?: {
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
        data: {
            timestamp: number;
            alpha: number;
            beta: number;
            theta: number;
            delta: number;
            symmetry: number;
        }[];
        dominantBands: Record<string, number>;
        mostFrequent: string;
        convert: (ticks: number) => string;
        avgSymmetry: string;
        formattedDuration: string;
        statePercentages: Record<string, string>;
        goodMeditationPct: string;
        weightedEEGScore: number;
    } | null;

    setSessionResults: React.Dispatch<React.SetStateAction<{
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
        data: {
            timestamp: number;
            alpha: number;
            beta: number;
            theta: number;
            delta: number;
            symmetry: number;
        }[];
        dominantBands: Record<string, number>;
        mostFrequent: string;
        convert: (ticks: number) => string;
        avgSymmetry: string;
        formattedDuration: string;
        statePercentages: Record<string, string>;
        goodMeditationPct: string;
        weightedEEGScore: number;
    } | null>>;

    renderSessionResults?: (results: {
        dominantBands: Record<string, number>;
        mostFrequent: string;
        convert: (ticks: number) => string;
        avgSymmetry: string;
        duration: string;
        averages: {
            alpha: number;
            beta: number;
            theta: number;
            delta: number;
            symmetry: number;
        };
        focusScore: string;
        statePercentages: Record<string, string>;
        goodMeditationPct: string;
    }) => React.ReactNode;
}) => {
    const [isMeditating, setIsMeditating] = useState(false);
    const [duration, setDuration] = useState(3);
    const [timeLeft, setTimeLeft] = useState(0);
    const sessionStartTime = useRef<number | null>(null);
    const selectedGoalRef = useRef<string>('meditation');
    const buttonbg = darkMode ? "bg-amber-300" : "bg-amber-600";
    const durationbtnBg = darkMode ? "bg-zinc-700/50" : "bg-stone-100/80";

    const startMeditation = () => {
        setIsMeditating(true);
        setTimeLeft(duration * 60);
        sessionStartTime.current = Date.now();
        onStartSession();
    };

    const stopMeditation = () => {
        setIsMeditating(false);
        const frozenData = sessionData.filter(d => sessionStartTime.current && d.timestamp >= sessionStartTime.current);
        analyzeSession(frozenData);
        onEndSession();
    };

    const analyzeSession = (data: typeof sessionData) => {
        if (!data.length) return;

        const sessionDurationMs = data[data.length - 1].timestamp - data[0].timestamp;
        const sessionDuration = sessionDurationMs > 60000
            ? `${Math.round(sessionDurationMs / 60000)} min`
            : `${Math.round(sessionDurationMs / 1000)} sec`;

        const convert = (ticks: number) => ((ticks * 0.5) / 60).toFixed(2);

        const avgSymmetry = (
            data.reduce((sum, d) => sum + (d.symmetry ?? 0), 0) / data.length
        ).toFixed(3);

        const averages = {
            alpha: data.reduce((sum, d) => sum + d.alpha, 0) / data.length,
            beta: data.reduce((sum, d) => sum + d.beta, 0) / data.length,
            theta: data.reduce((sum, d) => sum + d.theta, 0) / data.length,
            delta: data.reduce((sum, d) => sum + d.delta, 0) / data.length,
            symmetry: data.reduce((sum, d) => sum + d.symmetry, 0) / data.length,
        };

        const totalPower = averages.alpha + averages.beta + averages.theta + averages.delta;

        const statePercentages = {
            Relaxed: ((averages.alpha / totalPower) * 100).toFixed(1),
            Focused: ((averages.beta / totalPower) * 100).toFixed(1),
            "Meditation": ((averages.theta / totalPower) * 100).toFixed(1),
            Drowsy: ((averages.delta / totalPower) * 100).toFixed(1),
        };

        const goodMeditationPct = (
            ((averages.alpha + averages.theta) / totalPower) * 100
        ).toFixed(1);

        const mostFrequent = Object.entries(averages)
            .filter(([key]) => key !== "symmetry")
            .sort((a, b) => b[1] - a[1])[0][0];

        let mentalState = '';
        let stateDescription = '';

        if (mostFrequent === 'alpha') {
            mentalState = 'Relaxed';
            stateDescription = 'Your mind was in a calm and relaxed state, ideal for meditation.';
        } else if (mostFrequent === 'beta') {
            mentalState = 'Focused';
            stateDescription = 'Your mind was highly alert or active. Try to slow down your breath to enter a calmer state.';
        } else if (mostFrequent === 'theta') {
            mentalState = 'Meditation';
            stateDescription = 'You entered a deeply meditative state—excellent work.';
        } else if (mostFrequent === 'delta') {
            mentalState = 'Drowsy';
            stateDescription = 'Your brain was in a very slow-wave state, indicating deep rest or sleepiness.';
        }

        const EEG_WEIGHTS: Record<string, Partial<Record<'alpha' | 'theta' | 'beta' | 'delta', number>>> = {
            meditation: { alpha: 0.4, theta: 0.6 },
            relaxation: { alpha: 0.7, theta: 0.3 },
            focus: { beta: 0.8, alpha: 0.2 },
            sleep: { delta: 1.0 },
        };

        const goal = selectedGoalRef.current;
        const goalWeights = EEG_WEIGHTS[goal] || {};
        const weightedEEGScore = Object.entries(goalWeights).reduce(
            (sum, [band, weight]) => sum + (weight ?? 0) * (averages[band as keyof typeof averages] || 0),
            0
        );
        const focusScore = ((averages.alpha + averages.theta) / (averages.beta + 0.001)).toFixed(2);

        setSessionResults({
            duration: sessionDurationMs / 1000,
            averages,
            mentalState,
            stateDescription,
            focusScore,
            symmetry: averages.symmetry > 0 ? 'Left hemisphere dominant' :
                averages.symmetry < 0 ? 'Right hemisphere dominant' : 'Balanced',
            data,
            dominantBands: {
                alpha: Math.round(averages.alpha * 1000),
                beta: Math.round(averages.beta * 1000),
                theta: Math.round(averages.theta * 1000),
                delta: Math.round(averages.delta * 1000),
            },
            mostFrequent,
            convert,
            avgSymmetry: avgSymmetry,
            formattedDuration: sessionDuration,
            statePercentages,
            goodMeditationPct,
            weightedEEGScore,
        });
    };

    useEffect(() => {
        if (!isMeditating || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    stopMeditation();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isMeditating, timeLeft]);

    const progressPercentage = isMeditating ? ((duration * 60 - timeLeft) / (duration * 60)) * 100 : 0;

    const textPrimary = darkMode ? "text-stone-100" : "text-stone-800";
    const accent = darkMode ? "text-blue-400" : "text-blue-600";

    return (
        <div className="h-full w-full min-h-0 overflow-hidden relative flex flex-col">
            {!isMeditating ? (
                !sessionResults ? (
                    // Start Session UI - Responsive container
                    <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 animate-in fade-in duration-300">
                        {/* Main Content - Uses remaining space */}
                        <div className="flex-1 flex flex-col justify-center space-y-4 sm:space-y-6 md:space-y-8 min-h-0">
                            {/* Duration Selection */}
                            <div className="space-y-2 px-6 " style={{ padding: '10px 40px 10px 40px' }}>
                                {/* Duration Buttons - Responsive grid */}
                                <div className="grid grid-cols-2 rounded-md overflow-hidden border border-[0.1px] dark:border-zinc-400 w-full lg:h-[4rem] xl:h-[4rem] 2xl:h-[6rem] max-w-sm text-[10px] sm:text-xs">
                                    {[3, 5, 10, 15].map((val) => (
                                        <div
                                            key={val}
                                            className="border border-t-0 border-l-0 border-r  last:border-b-0"
                                        >
                                            <button
                                                onClick={() => setDuration(val)}
                                                disabled={!connected}
                                                className={`w-full h-full px-2 py-1 sm:px-2.5 sm:py-1.5 font-semibold 
                    ${duration === val
                                                        ? `${buttonbg} text-zinc-800/90 `
                                                        : `${durationbtnBg} ${darkMode ? "text-gray-200" : "text-black"}`}
                    ${!connected ? 'opacity-40 cursor-not-allowed' : ' cursor-pointer'}
                `}
                                            >
                                                <div className="flex flex-col items-center leading-tight space-y-0.5">
                                                    <span className="text-[1.5rem] ">{val} min</span>
                                                </div>
                                            </button>
                                        </div>
                                    ))}
                                </div>



                            </div>
                        </div>

                        <div className="flex justify-center pt-2 pb-4 sm:pb-2 px-2" style={{ paddingBottom: '0.75rem' }}>
                            <button
                                disabled={!connected}
                                onClick={startMeditation}
                                className={`  min-w-[120px] max-w-[160px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base 
                               rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap  transform   text-zinc-800/90 text-black
                           ${connected
                                        ? `${buttonbg} cursor-pointer `
                                        : 'bg-[#E4967E] opacity-50 text-white cursor-not-allowed'
                                    }
                                 `}
                            >
                                <span className="relative z-10 truncate">Begin Session</span>
                            </button>
                        </div>

                    </div>
                ) : (
                    // Session Results UI - Responsive layout
                    <div className="flex-1 flex flex-col animate-in fade-in duration-500 p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
                        {/* Results Header */}
                        <div className="text-center space-y-2 sm:space-y-3 flex-shrink-0">
                            <h3 className={`text-base sm:text-lg md:text-xl font-bold ${textPrimary}`}>
                                Session Complete
                            </h3>
                        </div>

                        {/* Results Content - Takes remaining space with scroll */}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            {renderSessionResults && renderSessionResults({
                                dominantBands: sessionResults.dominantBands,
                                mostFrequent: sessionResults.mostFrequent,
                                convert: sessionResults.convert,
                                avgSymmetry: sessionResults.avgSymmetry,
                                duration: sessionResults.formattedDuration,
                                averages: sessionResults.averages,
                                focusScore: sessionResults.focusScore,
                                statePercentages: sessionResults.statePercentages,
                                goodMeditationPct: sessionResults.goodMeditationPct
                            })}
                        </div>

                        {/* New Session Button - Responsive sizing */}
                        <div className="flex justify-center " style={{ paddingBottom: '0.75rem' }}>
                            <button
                                onClick={() => setShowResults(true)}
                                className={`
                                  min-w-[120px] max-w-[160px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base 
                            rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm transform 
    text-black cursor-pointer  ${buttonbg}
                                `}
                            >

                                <span className="relative z-10 truncate"> View Results</span>
                            </button>
                        </div>
                    </div>
                )
            ) : (
                // Active Meditation UI - Responsive circular timer
                <div className="flex-1 flex flex-col justify-center items-center text-center animate-in fade-in duration-300 p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 md:space-y-5">
                    {/* Responsive Timer Circle */}

                    <div className="relative w-full h-full mx-auto">

                        {/* Responsive Timer Display */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`text-center ${accent}`}>
                                <div className="text-lg sm:text-lg md:text-lg lg:text-2xl font-bold font-mono leading-tight">
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="text-xs sm:text-sm md:text-2xl opacity-70 mt-1">
                                    remaining
                                </div>
                            </div>
                        </div>
                        {/* Enhanced Progress Circle - Responsive stroke */}
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke={darkMode ? "#548687" : "#548687"}
                                strokeWidth="1"
                                fill="none"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="38"
                                stroke={darkMode ? "#548687" : "#548687"}
                                strokeWidth="2"
                                fill="none"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="38"
                                stroke="url(#progressGradient)"
                                strokeWidth="3"
                                fill="none"
                                strokeDasharray={Math.PI * 2 * 46}
                                strokeDashoffset={(Math.PI * 2 * 46 * (1 - progressPercentage / 100))}
                                className="transition-all duration-1000 ease-linear"
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={darkMode ? "#60a5fa" : "#3b82f6"} />
                                    <stop offset="100%" stopColor={darkMode ? "#34d399" : "#10b981"} />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>


                    {/* Responsive End Session Button */}
                    <button
                        onClick={stopMeditation}
                        className={`  min-w-[120px] max-w-[160px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base 
                            rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm transform 
        text-black  cursor-pointer
                                ${buttonbg}
                                 
                              `}
                        style={{ marginBottom: '0.75rem' }}
                    >

                        <svg className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                        </svg>
                        <span className="relative z-10 truncate">End Session</span>
                    </button>
                </div>
            )}

            <style jsx>{`
                @keyframes breathe {
                    0%, 100% { 
                        transform: scale(1); 
                        opacity: 0.8; 
                    }
                    50% { 
                        transform: scale(1.05); 
                        opacity: 0.4; 
                    }
                }
            `}</style>
        </div>
    );
};