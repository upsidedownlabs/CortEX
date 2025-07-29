import React from 'react';

interface DurationSelectorProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  disabled: boolean;
  darkMode: boolean;
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
  selectedDuration,
  onDurationChange,
  disabled,
  darkMode
}) => {
  const durations = [1, 10, 15, 30, 45, 60];
  const buttonbg = darkMode ? "bg-amber-300" : "bg-amber-600";
  const durationbtnBg = darkMode ? "bg-zinc-700/50" : "bg-stone-100/80";
  
  return (
    <div className="space-y-4 w-full max-w-md flex flex-col items-center">
      <h3 className={`text-center text-sm font-medium ${darkMode ? "text-zinc-300" : "text-zinc-700"}`}>
        Select Meditation Duration
      </h3>
      
      <div className="grid grid-cols-3 gap-3 w-[calc(100%-1rem)]">
        {durations.map((duration) => (
          <button
            key={duration}
            onClick={() => onDurationChange(duration)}
            disabled={disabled}
            className={`
              relative group flex flex-col items-center justify-center p-3 sm:p-4
              rounded-xl border transition-all duration-200
              ${selectedDuration === duration 
                ? `${buttonbg} border-amber-700/30 shadow-md transform scale-105` 
                : `${durationbtnBg} border-zinc-200 dark:border-zinc-700 `}
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className={`text-xl font-semibold mb-1 ${selectedDuration === duration 
              ? 'text-zinc-800/90' 
              : darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
              {duration}
            </span>
            <span className={`text-xs ${selectedDuration === duration 
              ? 'text-zinc-800/80' 
              : darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              min
            </span>
           
          </button>
        ))}
      </div>

    </div>
  );
};