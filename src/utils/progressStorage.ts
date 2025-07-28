export interface StoredSession {
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
  goodMeditationPct: string;
  weightedEEGScore: number;
  timestamp: number;
  sessionDate: string;
  sessionTime: string;
  sessionId: string;
  formattedDuration: string;
  statePercentages: Record<string, string>;
}

const STORAGE_KEY = "meditationHistory";
const MAX_SESSIONS = 100;

export class ProgressStorage {
  static saveSession(sessionResults: any): void {
    const previousData = this.getAllSessions();
    
    const newEntry: StoredSession = {
      ...sessionResults,
      timestamp: Date.now(),
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: new Date().toLocaleTimeString(),
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const updatedHistory = [...previousData, newEntry].slice(-MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  }

  static getAllSessions(): StoredSession[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  }

  static getSessionCount(): number {
    return this.getAllSessions().length;
  }

  static getTodaySessionCount(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.getAllSessions().filter(session => session.sessionDate === today).length;
  }

  static getCurrentStreak(): number {
    const history = this.getAllSessions();
    const uniqueDates = [...new Set(history.map(s => s.sessionDate))].sort().reverse();
    
    let streak = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      const date = uniqueDates[i];
      const daysDiff = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  static getWeeklyStats(): { thisWeek: number; lastWeek: number } {
    const history = this.getAllSessions();
    const now = new Date();
    
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeek = history.filter(s => new Date(s.timestamp) >= thisWeekStart).length;
    const lastWeek = history.filter(s => {
      const sessionDate = new Date(s.timestamp);
      return sessionDate >= lastWeekStart && sessionDate < thisWeekStart;
    }).length;
    
    return { thisWeek, lastWeek };
  }

  static exportData(): string {
    return JSON.stringify(this.getAllSessions(), null, 2);
  }

  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(-MAX_SESSIONS)));
      return true;
    } catch {
      return false;
    }
  }
}