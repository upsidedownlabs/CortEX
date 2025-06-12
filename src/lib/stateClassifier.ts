export type State =
  | "stressed"
  | "mild_stress"
  | "focused"
  | "relaxed"
  | "happy"
  | "neutral"
  | "no_data";

export function predictState({
  sdnn,
  rmssd,
  pnn50,
}: {
  sdnn: number;
  rmssd: number;
  pnn50: number;
}): State {
  // Invalid input
  if (
    typeof sdnn !== "number" ||
    isNaN(sdnn) ||
    typeof rmssd !== "number" ||
    isNaN(rmssd) ||
    typeof pnn50 !== "number" ||
    isNaN(pnn50)
  ) {
    return "no_data";
  }

  // Weak/no signal
  if (sdnn < 5 && rmssd < 5 && pnn50 < 10) return "no_data";

  // Confirmed stress: physiological suppression
  if (rmssd < 20 && sdnn < 30) return "stressed";

  // Mild stress / early anxiety detection
  if (
    (rmssd < 30 && sdnn < 50) ||
    (rmssd < 35 && pnn50 < 20)
  ) {
    return "mild_stress";
  }

  // Cognitive focus (not relaxed, not anxious)
  if (rmssd >= 20 && rmssd <= 50 && sdnn >= 30 && pnn50 < 30)
    return "focused";

  // Happy
  if (rmssd >= 30 && rmssd <= 70 && sdnn >= 30 && pnn50 > 50)
    return "happy";

  // Relaxed
  if (rmssd > 50 && sdnn > 50 && pnn50 > 40) return "relaxed";

  return "neutral";
}
