"use client";
// components/StateIndicator.tsx
import React from "react";
 
const icons = {
  stressed: "😰",
  relaxed: "😌",
  happy: "😄",
  focused: "🧠",
  neutral: "😐",
  mild_stress: "😟",
  no_data: "⏳"
};

const colors = {
  stressed: " text-red-500",
  relaxed: " text-blue-500",
  happy: " text-green-500",
  focused: " text-yellow-500",
  neutral: " text-cyan-500",
  mild_stress: " text-orange-500",
  no_data: " text-white animate-pulse"
};

export type State = keyof typeof icons;

export function StateIndicator({ state }: { state: State }) {
  const displayText = state === "no_data" ? "Analyzing..." : state.replace("_", " ");
  
  return (
    <div className={`px-2 rounded-lg flex items-center space-x-2 ${colors[state]}`}>
      <span className="">{icons[state]}</span>
      <span className="font-semibold capitalize text-[0.5em] sm:text-[0.6em] md:text-[0.8em] ">
  {displayText}
</span>
    </div>
  );
}

