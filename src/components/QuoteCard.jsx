'use client';
import React, { useState, useEffect } from 'react';
import { getRandomQuote } from '../quote';
// Mock quote function for demo

const QuoteCard = ({ cardBg = 'bg-white', refreshInterval = 30000, darkMode = false }) => {
  const [currentQuote, setCurrentQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced color schemes
  const textPrimary = darkMode ? "text-zinc-400" : "text-stone-500";
  const textAccent = darkMode ? "text-amber-300" : "text-amber-600";
  const shadowColor = darkMode ? "shadow-2xl shadow-slate-900/50" : "shadow-2xl shadow-blue-900/10";
  const borderGlow = darkMode ? "border-slate-700/50" : "border-white/80";

  // Get a new random quote
  const refreshQuote = () => {
    setIsLoading(true);
    const newQuote = getRandomQuote();
    setCurrentQuote(newQuote);
    setIsLoading(false);
  };

  // Initialize with random quote
  useEffect(() => {
    refreshQuote();
  }, []);

  // Auto-refresh quote at specified interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refreshQuote, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  if (isLoading || !currentQuote) {
    return (
      <div className={`relative overflow-hidden rounded-3xl ${shadowColor} p-8 border ${borderGlow}  flex flex-col transition-all duration-500 h-full backdrop-blur-sm`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-pulse"></div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin text-blue-500"></div>
            <div className="text-gray-500 text-sm font-medium animate-pulse">Discovering wisdom...</div>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic text sizing based on quote length and screen size
  const getQuoteTextSize = () => {
    const quoteLength = currentQuote.text.length;
    if (quoteLength < 50) {
      return "text-sm sm:text-sm md:text-sm lg:text-sm xl:text-lg 2xl:text-2xl";
    } else if (quoteLength < 100) {
      return "text-sm sm:text-sm md:text-sm lg:text-sm xl:text-lg 2xl:text-2xl";
    } else if (quoteLength < 150) {
      return "text-sm sm:text-sm md:text-sm lg:text-sm xl:text-lg 2xl:text-xl";
    } else {
      return "text-sm sm:text-sm md:text-sm";
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl ${shadowColor} flex flex-col transition-all duration-500 h-full group backdrop-blur-sm`} style={{ padding: "10px" }}>
      {/* Header with enhanced styling */}
      <div className="relative z-10 ">
        <div className={`flex justify-center items-center`}>
          <div className={`px-6 py-2 rounded-full backdrop-blur-md`}>
            <div className={`text-md 2xl:text-2xl font-semibold tracking-wide ${textAccent} flex items-center space-x-2`}>
              <span>Daily Wisdom</span>
            </div>
          </div>
        </div>
      </div>
      {/* Quote content with enhanced typography */}
      <div className="relative z-10 flex-1 flex flex-col justify-center overflow-hidden w-full">
        <blockquote className={`${textPrimary} ${getQuoteTextSize()} leading-relaxed  overflow-hidden flex-1 flex items-center w-full font-light`}>
          <div className="w-full text-center relative">
            {/* Decorative quote marks */}
            <div className="relative">

              <div className="px-8 leading-relaxed font-medium">
                <span className="break-words hyphens-auto">{currentQuote.text}</span>
              </div>

            </div>
          </div>
        </blockquote>
        {/* Enhanced author attribution */}
        <footer className="relative z-10 w-full mb-8">
          <div className="flex justify-center">
            <div className={`px-6 py-3 rounded-2xl backdrop-blur-md  shadow-lg`}>
              <cite className={`${textAccent} text-md font-semibold not-italic flex items-center space-x-2 tracking-wide`}>
                <span>— {currentQuote.author}</span>
              </cite>
            </div>
          </div>
        </footer>
      </div>

    </div>
  );
};

export default QuoteCard;