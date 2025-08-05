// components/MeditationSession.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { exportToPDF, SessionResultsType } from './SessionExport/exportToPDF';
import { DurationSelector } from './DurationSelector';

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
    sessionData: { timestamp: number; alpha: number; beta: number; theta: number; delta: number; symmetry: number; bpm?: number; hrv?: number }[];
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
         averageHRV: number;    // ✅ new
         averageBPM: number;    // ✅ new
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
         averageHRV: number;    // ✅ new
  averageBPM: number;    // ✅ new
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
         averageHRV: number;      // ✅ add this
  averageBPM: number;      // ✅ and this
    }) => React.ReactNode;
}) => {
    const [isMeditating, setIsMeditating] = useState(false);
    const [duration, setDuration] = useState(3);
    const [timeLeft, setTimeLeft] = useState(0);
    const sessionStartTime = useRef<number | null>(null);
    const selectedGoalRef = useRef<string>('meditation');
    const buttonbg = darkMode ? "bg-amber-300" : "bg-amber-600";
    const durationbtnBg = darkMode ? "bg-zinc-700/50" : "bg-stone-100/80";

    // Add this ref at the top with other refs
const sessionSavedRef = useRef<boolean>(false);

    const startMeditation = () => {
        setIsMeditating(true);
        setTimeLeft(duration * 60);
        sessionStartTime.current = Date.now();
        sessionSavedRef.current = false; // Reset the flag for new session
        onStartSession();
    };

    const stopMeditation = () => {
        // Only allow stopping when timer reaches zero
        if (timeLeft > 0) return;

        setIsMeditating(false);
        const frozenData = sessionData.filter(d => sessionStartTime.current && d.timestamp >= sessionStartTime.current);
        analyzeSession(frozenData);
        onEndSession();
    };

    const analyzeSession = (data: typeof sessionData) => {
        if (!data.length) return;
        
        // Prevent duplicate analysis
        if (sessionResults) {
            console.log('Session already analyzed, skipping');
            return;
        }

        // Calculate actual session duration based on elapsed time
        const actualDurationMs = sessionStartTime.current ? Date.now() - sessionStartTime.current : 0;
        const actualDurationMinutes = Math.max(0.1, actualDurationMs / (1000 * 60)); // Minimum 0.1 minutes
        const sessionDuration = `${actualDurationMinutes.toFixed(1)} min`;

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
            stateDescription = 'Your mind was in an active, alert state with high cognitive engagement. This is natural for beginners. For deeper meditation, try gently directing attention to your breath without forcing changes.';
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
        
          const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const bpmValues = data.map(d => d.bpm).filter(n => n !== undefined && n !== null) as number[];
const hrvValues = data.map(d => d.hrv).filter(n => n !== undefined && n !== null) as number[];

const averageHRV = Math.round(avg(hrvValues));
const averageBPM = Math.round(avg(bpmValues));

       setSessionResults({
    duration: actualDurationMs / 1000,
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
    avgSymmetry,
    formattedDuration: sessionDuration,
    statePercentages,
    goodMeditationPct,
    weightedEEGScore,
    averageHRV,
    averageBPM
});


    };

    useEffect(() => {
        // Handle automatic session completion when timer reaches zero
        if (isMeditating && timeLeft === 0) {
            stopMeditation(); // Use the same function for consistency
        }
    }, [isMeditating, timeLeft]);

    useEffect(() => {
        // Handle countdown timer
        if (!isMeditating || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
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

    const downloadSessionResults = (format: 'json' | 'csv' | 'pdf') => {
        if (!sessionResults) return;

        // Prepare common data for all formats
        const sessionDate = new Date().toISOString().split('T')[0];
        const filename = `meditation-session-${sessionDate}`;

        switch (format) {
            case 'json':
                downloadJSON(filename);
                break;
            case 'csv':
                downloadCSV(filename);
                break;
            case 'pdf':
                downloadPDF(filename);
                break;
        }
    };

    const downloadJSON = (filename: string) => {
        const downloadData = {
            sessionDate: new Date().toISOString(),
            duration: sessionResults?.formattedDuration,
            mentalState: sessionResults?.mentalState,
            stateDescription: sessionResults?.stateDescription,
            brainwaveAverages: {
                alpha: sessionResults?.averages.alpha,
                beta: sessionResults?.averages.beta,
                theta: sessionResults?.averages.theta,
                delta: sessionResults?.averages.delta,
                symmetry: sessionResults?.averages.symmetry
            },
            dominantBand: sessionResults?.mostFrequent,
            focusScore: sessionResults?.focusScore,
            statePercentages: sessionResults?.statePercentages,
            goodMeditationPercentage: sessionResults?.goodMeditationPct,
            brainSymmetry: sessionResults?.symmetry
        };

        const dataStr = JSON.stringify(downloadData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.download = `${filename}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadCSV = (filename: string) => {
        // CSV header
        let csvContent = "Metric,Value\n";

        // Add session data rows
        csvContent += `Date,${new Date().toISOString()}\n`;
        csvContent += `Duration,${sessionResults?.formattedDuration}\n`;
        csvContent += `Mental State,${sessionResults?.mentalState}\n`;
        csvContent += `Focus Score,${sessionResults?.focusScore}\n`;
        csvContent += `Dominant Brainwave,${sessionResults?.mostFrequent}\n`;
        csvContent += `Brain Symmetry,${sessionResults?.symmetry}\n\n`;

        // Add brainwave averages
        csvContent += "Brainwave Averages,Value\n";
        csvContent += `Alpha,${sessionResults?.averages.alpha.toFixed(4)}\n`;
        csvContent += `Beta,${sessionResults?.averages.beta.toFixed(4)}\n`;
        csvContent += `Theta,${sessionResults?.averages.theta.toFixed(4)}\n`;
        csvContent += `Delta,${sessionResults?.averages.delta.toFixed(4)}\n\n`;

        // Add state percentages
        csvContent += "Mental State,Percentage\n";
        for (const [state, percentage] of Object.entries(sessionResults?.statePercentages || {})) {
            csvContent += `${state},${percentage}%\n`;
        }

        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.download = `${filename}.csv`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const downloadPDF = (filename: string) => {
        if (!sessionResults) return;
        
        // Create a deep copy to prevent any reference issues
        const sessionResultsCopy = JSON.parse(JSON.stringify(sessionResults));
        exportToPDF(filename, sessionResultsCopy);
    };

    // Add this ref to manage data collection interval
    const dataCollectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isMeditating) {
            // Clear any ongoing data collection
            if (dataCollectionIntervalRef.current) {
                clearInterval(dataCollectionIntervalRef.current);
                dataCollectionIntervalRef.current = null;
            }
        }
    }, [isMeditating]);

    // Add this helper function
    const formatPhaseDuration = (durationInSeconds: number) => {
        const minutes = Math.floor(durationInSeconds / 60);
        const seconds = Math.round(durationInSeconds % 60);
        return `${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`;
    };

    // Modified useEffect to prevent duplicate saves with additional safeguards
    useEffect(() => {
        if (sessionResults && !sessionSavedRef.current) {
            const historyKey = "meditationHistory";
            const previousData = JSON.parse(localStorage.getItem(historyKey) || "[]");
            
            // Create a unique session ID based on timestamp and session start time
            const sessionId = `session_${sessionStartTime.current}_${Math.round(sessionResults.duration)}`;
            
            // Check if this exact session already exists
            const existingSession = previousData.find((session: any) => 
                session.sessionId === sessionId ||
                (session.timestamp === Date.now() && 
                 session.formattedDuration === sessionResults.formattedDuration &&
                 session.goodMeditationPct === sessionResults.goodMeditationPct)
            );
            
            if (existingSession) {
                console.log('Session already saved, skipping duplicate save');
                sessionSavedRef.current = true;
                return;
            }
            
            sessionSavedRef.current = true; // Mark as saved BEFORE the save operation
            
            const lightweightEntry = {
                sessionDate: new Date().toISOString().split('T')[0],
                sessionTime: new Date().toLocaleTimeString(),
                sessionId: sessionId,
                timestamp: Date.now(),
                
                formattedDuration: sessionResults.formattedDuration,
                goodMeditationPct: sessionResults.goodMeditationPct,
                focusScore: sessionResults.focusScore,
                mentalState: sessionResults.mentalState,
                averages: {
                    alpha: sessionResults.averages.alpha,
                    beta: sessionResults.averages.beta,
                    theta: sessionResults.averages.theta,
                    delta: sessionResults.averages.delta,
                    symmetry: sessionResults.averages.symmetry
                },
                averageHRV: sessionResults.averageHRV,
                averageBPM: sessionResults.averageBPM
            };

            const updatedHistory = [...previousData, lightweightEntry].slice(-5);

            try {
                localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
                console.log(`Lightweight session saved! Total sessions: ${updatedHistory.length}`);
                console.log('Storage size:', JSON.stringify(updatedHistory).length, 'characters');
            } catch (e) {
                console.error('Storage failed:', e);
                try {
                    localStorage.setItem(historyKey, JSON.stringify([lightweightEntry]));
                } catch (e2) {
                    console.error('Critical storage failure:', e2);
                }
            }
        }
    }, [sessionResults]);

    // Helper function to get progress trends
    const getProgressTrends = () => {
        const historyKey = "meditationHistory";
        const history = JSON.parse(localStorage.getItem(historyKey) || "[]");

        if (history.length < 2) return null;

        const recent = history.slice(-5); // Last 5 sessions
        const previous = history.slice(-10, -5); // Previous 5 sessions

        if (previous.length === 0) return null;

        const calculateAverage = (sessions: any[], key: string) => {
            return sessions.reduce((sum, session) => {
                if (key === 'goodMeditationPct') {
                    return sum + parseFloat(session[key]);
                }
                if (key === 'focusScore') {
                    return sum + parseFloat(session[key]);
                }
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    return sum + session[parent][child];
                }
                return sum + session[key];
            }, 0) / sessions.length;
        };

        const trends = {
            alpha: calculateAverage(recent, 'averages.alpha') - calculateAverage(previous, 'averages.alpha'),
            theta: calculateAverage(recent, 'averages.theta') - calculateAverage(previous, 'averages.theta'),
            beta: calculateAverage(recent, 'averages.beta') - calculateAverage(previous, 'averages.beta'),
            symmetry: calculateAverage(recent, 'averages.symmetry') - calculateAverage(previous, 'averages.symmetry'),
            goodMeditation: calculateAverage(recent, 'goodMeditationPct') - calculateAverage(previous, 'goodMeditationPct'),
            focusScore: calculateAverage(recent, 'focusScore') - calculateAverage(previous, 'focusScore'),
        };

        return trends;
    };

    // Function to get session statistics
    const getSessionStats = () => {
        const historyKey = "meditationHistory";
        const history = JSON.parse(localStorage.getItem(historyKey) || "[]");

        const today = new Date().toISOString().split('T')[0];

        const todaySessions = history.filter((session: any) => session.sessionDate === today).length;
        const totalSessions = history.length;

        // Calculate current streak (consecutive days with sessions)
        let streak = 0;
        const uniqueDates = [...new Set(history.map((s: any) => s.sessionDate))].sort().reverse();

        for (let i = 0; i < uniqueDates.length; i++) {
            const date = uniqueDates[i];
            const daysDiff = Math.floor((new Date().getTime() - new Date(date as string).getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === i) {
                streak++;
            } else {
                break;
            }
        }

        // Weekly and monthly stats
        const last7Days = history.filter((session: any) => {
            const sessionDate = new Date(session.timestamp);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return sessionDate >= weekAgo;
        }).length;

        const last30Days = history.filter((session: any) => {
            const sessionDate = new Date(session.timestamp);
            const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return sessionDate >= monthAgo;
        }).length;

        return {
            todaySessions,
            totalSessions,
            streak,
            last7Days,
            last30Days,
            averageSessionsPerWeek: (last30Days / 4.3).toFixed(1)
        };
    };

    // Function to get improvement percentage for display
    const getImprovementText = (value: number, type: 'percentage' | 'score' = 'percentage') => {
        if (Math.abs(value) < 0.1) return { text: "Stable", icon: "➖", color: "text-blue-500" };

        const isPositive = value > 0;
        const absValue = Math.abs(value);
        const text = type === 'percentage'
            ? `${isPositive ? '+' : '-'}${absValue.toFixed(1)}%`
            : `${isPositive ? '+' : '-'}${absValue.toFixed(2)}`;

        return {
            text,
            icon: isPositive ? "📈" : "📉",
            color: isPositive ? "text-green-500" : "text-red-500"
        };
    };

    return (
        <div className="h-full w-full min-h-0 overflow-hidden relative flex flex-col">
            {!isMeditating ? (
                !sessionResults ? (
                    // Start Session UI - Responsive container
                    <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 animate-in fade-in duration-300">
                        {/* Main Content - Uses remaining space */}
                        <div className="flex-1 flex flex-col justify-center items-center space-y-4 sm:space-y-6 md:space-y-8 min-h-0">
                            {/* Duration Selection - Now using modular component */}
                            <DurationSelector
                                selectedDuration={duration}
                                onDurationChange={setDuration}
                                disabled={!connected}
                                darkMode={darkMode}
                            />
                        </div>

                        <div className="flex justify-center pt-2 pb-4 sm:pb-2 px-2" style={{ paddingBottom: '0.75rem' }}>
                            <button
                                disabled={!connected}
                                onClick={startMeditation}
                                className={`min-w-[120px] max-w-[180px] w-auto px-4 py-4 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base
       rounded-md transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap transform text-white
        shadow-sm ${darkMode ? "bg-amber-300  text-zinc-800/90  "
                                        : "bg-amber-600  text-white/90"}  "}
       ${connected
                                        ? `${buttonbg} cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95`
                                        : 'bg-[#E4967E] opacity-50 text-white cursor-not-allowed'
                                    }`}
                            >

                                <span className="relative z-10 truncate font-medium">Begin Session</span>
                            </button>
                        </div>

                    </div>
                ) : (
                    // Enhanced Session Results UI with Progress Tracking
                    <div className="flex-1 flex flex-col animate-in fade-in duration-500 p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
                        {/* Results Header with Progress Stats */}
                        <div className="text-center space-y-2 sm:space-y-3 flex-shrink-0">


                            {/* Progress Stats */}
                            {(() => {
                                const stats = getSessionStats();
                                const trends = getProgressTrends();

                                return (
                                    <div className="space-y-2">
                                        {/* Main Stats Row */}


                                        {/* Trend Analysis */}
                                        {trends && (
                                            <div className="bg-opacity-50 rounded-lg p-3 space-y-2"
                                                style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                                                <div className={`text-xs font-semibold ${textPrimary}`}>Recent Progress Trends:</div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {(() => {
                                                        const meditationImprovement = getImprovementText(trends.goodMeditation);
                                                        const focusImprovement = getImprovementText(trends.focusScore, 'score');
                                                        const alphaImprovement = getImprovementText(trends.alpha * 100);
                                                        const thetaImprovement = getImprovementText(trends.theta * 100);

                                                        return (
                                                            <>
                                                                <div className="flex items-center justify-between">
                                                                    <span>🧘 Meditation:</span>
                                                                    <span className={`flex items-center gap-1 ${meditationImprovement.color}`}>
                                                                        {meditationImprovement.icon} {meditationImprovement.text}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span>🎯 Focus:</span>
                                                                    <span className={`flex items-center gap-1 ${focusImprovement.color}`}>
                                                                        {focusImprovement.icon} {focusImprovement.text}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span>🌊 Alpha:</span>
                                                                    <span className={`flex items-center gap-1 ${alphaImprovement.color}`}>
                                                                        {alphaImprovement.icon} {alphaImprovement.text}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span>🎵 Theta:</span>
                                                                    <span className={`flex items-center gap-1 ${thetaImprovement.color}`}>
                                                                        {thetaImprovement.icon} {thetaImprovement.text}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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
                                goodMeditationPct: sessionResults.goodMeditationPct,
                                averageHRV: sessionResults.averageHRV,
                                averageBPM: sessionResults.averageBPM,
                            })}
                        </div>

                        {/* Enhanced Action Buttons with Progress Tracking */}
                        <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 gap-2 sm:gap-3" style={{ paddingBottom: '0.75rem', padding: '0.75rem' }}>
                            <button
                                onClick={() => setShowResults(true)}
                                className={`w-full sm:min-w-[120px] sm:max-w-[180px] sm:w-auto px-4 py-3 sm:px-5 sm:py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-4
            text-sm sm:text-xs md:text-sm lg:text-base xl:text-lg
            rounded-md transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap transform
            shadow-sm ${darkMode ? "bg-amber-300 text-zinc-800/90" : "bg-amber-600 text-white/90"}
            ${buttonbg} cursor-pointer  active:scale-95
            `}
                            >
                                <span className="relative z-10 truncate font-medium">View Results</span>
                            </button>

                            <button
                                onClick={() => downloadSessionResults('pdf')}
                                className={`w-full sm:min-w-[130px] sm:max-w-[180px] sm:w-auto px-4 py-3 sm:px-5 sm:py-2.5 md:px-6 md:py-3 lg:px-8 lg:py-4
            text-sm sm:text-xs md:text-sm lg:text-base xl:text-lg
            rounded-md transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap transform
            shadow-sm cursor-pointer active:scale-95
            ${darkMode ? "bg-emerald-500 text-zinc-800/90" : "bg-emerald-600 text-white/90"}
            `}
                            >
                               
                                    
                                <span className="relative z-10 truncate font-medium">Download PDF</span>
                            </button>
                        </div>
                    </div>
                )
            ) : (
                // Active Meditation UI - Modified to allow ending anytime
                <div className="flex-1 flex flex-col justify-center items-center text-center animate-in fade-in duration-300 p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 md:space-y-5">
                    {/* Responsive Timer Circle */}

                    <div className="relative w-full h-full mx-auto">

                        {/* Responsive Timer Display */}
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <div className={`text-center ${accent}`}>
                                <div className="text-lg sm:text-lg md:text-lg lg:text-2xl font-bold font-mono leading-tight">
                                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="text-md  md:text-lg  opacity-70 mt-1">
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


                    {/* Modified End Session Button - Only enabled when timer reaches zero */}
                    <button
                        onClick={stopMeditation}
                        disabled={timeLeft > 0}
                        className={`min-w-[120px] max-w-[160px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base 
                        rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm transform 
                        ${timeLeft > 0
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                                : `${buttonbg} text-black cursor-pointer hover:scale-105`
                            }`}
                        style={{ marginBottom: '0.75rem' }}
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                        </svg>
                        <span className="relative z-10 truncate">
                            {timeLeft > 0 ? 'Session in Progress' : 'End Session'}
                        </span>
                    </button>

                    {/* Modified status message */}
                    <div className={`text-xs text-center mt-2 ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>
                        {timeLeft > 0 ? "Session must be completed - no early stopping allowed" : "Session completed!"}
                    </div>
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