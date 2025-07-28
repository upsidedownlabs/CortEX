// components/MeditationSession.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useBleStream } from '../components/Bledata';
import jsPDF from 'jspdf';
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
        // Only allow stopping if the timer has reached zero
        if (timeLeft <= 0) {
            setIsMeditating(false);
            const frozenData = sessionData.filter(d => sessionStartTime.current && d.timestamp >= sessionStartTime.current);
            analyzeSession(frozenData);
            onEndSession();
        }
    };

    const analyzeSession = (data: typeof sessionData) => {
        if (!data.length) return;

        // Use the actual selected duration instead of calculating from timestamps
        const sessionDurationMs = duration * 60 * 1000;
        const sessionDuration = `${duration} min`; // Ensure 'duration' is the user-selected value

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

        setSessionResults({
            duration: duration * 60, // Set to exact selected duration in seconds
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
        // Handle automatic session completion when timer reaches zero
        if (isMeditating && timeLeft === 0) {
            setIsMeditating(false);
            const frozenData = sessionData.filter(d => sessionStartTime.current && d.timestamp >= sessionStartTime.current);
            analyzeSession(frozenData);
            onEndSession();
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
        
        // Create PDF document
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Add title and date
        doc.setFontSize(22);
        doc.setTextColor(44, 62, 80); // Dark blue header
        doc.text("Meditation Session Report", pageWidth / 2, 20, { align: "center" });
        
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100); // Gray text
        const dateStr = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        doc.text(dateStr, pageWidth / 2, 30, { align: "center" });
        
        // Add session overview
        doc.setFontSize(16);
        doc.setTextColor(52, 73, 94); // Dark blue-gray
        doc.text("Session Overview", 20, 45);
        
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        let yPos = 55;
        
        // Session details
        const details = [
            ["Duration", sessionResults.formattedDuration],
            ["Primary Mental State", sessionResults.mentalState],
            ["Focus Score", sessionResults.focusScore],
            ["Brain Symmetry", sessionResults.symmetry],
            ["Dominant Brainwave", sessionResults.mostFrequent]
        ];
        
        details.forEach(([key, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${key}:`, 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), 80, yPos);
            yPos += 8;
        });
        
        // Add description
        yPos += 5;
        doc.setFontSize(16);
        doc.setTextColor(52, 73, 94);
        doc.text("Session Insights", 20, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        // Handle multi-line text for description
        const description = sessionResults.stateDescription;
        const splitDescription = doc.splitTextToSize(description, pageWidth - 40);
        doc.text(splitDescription, 20, yPos);
        yPos += splitDescription.length * 7 + 10;
        
        // Add brainwave data
        doc.setFontSize(16);
        doc.setTextColor(52, 73, 94);
        doc.text("Brainwave Activity", 20, yPos);
        yPos += 10;
        
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        // Brainwave table headers
        doc.setFont('helvetica', 'bold');
        doc.text("Brainwave", 20, yPos);
        doc.text("Value", 80, yPos);
        doc.text("% of Total", 120, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        
        // Brainwave table rows
        const brainwaves = [
            ["Alpha", sessionResults.averages.alpha.toFixed(4), sessionResults.statePercentages.Relaxed],
            ["Beta", sessionResults.averages.beta.toFixed(4), sessionResults.statePercentages.Focused],
            ["Theta", sessionResults.averages.theta.toFixed(4), sessionResults.statePercentages.Meditation],
            ["Delta", sessionResults.averages.delta.toFixed(4), sessionResults.statePercentages.Drowsy]
        ];
        
        brainwaves.forEach(([name, value, percentage]) => {
            doc.text(name, 20, yPos);
            doc.text(String(value), 80, yPos);
            doc.text(`${percentage}%`, 120, yPos);
            yPos += 7;
        });
        
        // Add footer
        yPos = doc.internal.pageSize.getHeight() - 20;
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("CortEX Meditation - Brain Activity Report", pageWidth / 2, yPos, { align: "center" });
        
        // Save the PDF
        doc.save(`${filename}.pdf`);
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
                                className={`  min-w-[120px] max-w-[160px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base l̥
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
                        <div className="flex justify-center space-x-3" style={{ paddingBottom: '0.75rem' }}>
                            <button
                                onClick={() => setShowResults(true)}
                                className={`
                                  min-w-[120px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm 
                                  rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm
                                  text-black cursor-pointer ${buttonbg}
                                `}
                            >
                                <span className="relative z-10 truncate">View Results</span>
                            </button>
                            
                            <div className="relative group">
    <button
      onClick={() => downloadSessionResults('pdf')}
      className={`
        min-w-[120px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm 
        rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm
        text-black cursor-pointer ${darkMode ? "bg-emerald-500" : "bg-emerald-600"}
      `}
    >
      <svg 
        className="w-4 h-4 relative z-10 flex-shrink-0" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span className="relative z-10 truncate">Download PDF</span>
    </button>
    
    <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-zinc-800 shadow-lg rounded-md overflow-hidden z-10">
      <button 
        onClick={() => downloadSessionResults('pdf')}
        className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
      >
        PDF Format
      </button>
      <button 
        onClick={() => downloadSessionResults('json')}
        className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
      >
        JSON Format
      </button>
      <button 
        onClick={() => downloadSessionResults('csv')}
        className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
      >
        CSV Format
      </button>
    </div>
  </div>
                        </div>
                    </div>
                )
            ) : (
                // Active Meditation UI - Responsive circular timer
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


                    {/* Responsive End Session Button */}
                    <button
                        disabled={timeLeft > 0}
                        onClick={stopMeditation}
                        className={`min-w-[120px] max-w-[160px] w-auto px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 text-xs sm:text-sm md:text-base 
        rounded-xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap shadow-sm transform 
        ${timeLeft > 0 
            ? 'opacity-50 cursor-not-allowed bg-gray-400 text-gray-700' 
            : `${buttonbg} text-black cursor-pointer`
        }`}
                        style={{ marginBottom: '0.75rem' }}
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                        </svg>
                        <span className="relative z-10 truncate">
        {timeLeft > 0 ? "Wait for completion" : "End Session"}
    </span>
                    </button>

                    {/* Add this below the timer display */}
                    {timeLeft > 0 && (
    <div className={`text-xs text-center mt-2 ${darkMode ? "text-zinc-400" : "text-zinc-600"}`}>
        Session must be completed in full
    </div>
)}

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