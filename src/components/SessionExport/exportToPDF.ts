import jsPDF from 'jspdf';

export type SessionResultsType = {
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
  sessionDate?: string;  // ✅ fix: add optional sessionDate
};

export const exportToPDF = (filename: string, sessionResults: SessionResultsType) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const checkNewPage = (yPos: number, requiredSpace: number = 20) => {
    if (yPos + requiredSpace > pageHeight - 30) {
      doc.addPage();
      return 20;
    }
    return yPos;
  };

  // Pie chart drawing function
  const drawPieChart = (
    x: number,
    y: number,
    radius: number,
    data: Array<{ label: string; value: number; color: [number, number, number] }>
  ) => {
    let currentAngle = -Math.PI / 2;
    const total = data.reduce((sum, item) => sum + item.value, 0);

    data.forEach(item => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const startX = x + Math.cos(currentAngle) * radius;
      const startY = y + Math.sin(currentAngle) * radius;
      const endX = x + Math.cos(currentAngle + sliceAngle) * radius;
      const endY = y + Math.sin(currentAngle + sliceAngle) * radius;

      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      // Draw pie slice using lines and ellipse
      doc.moveTo(x, y);
      doc.lineTo(startX, startY);

      // Approximate arc with small lines
      const steps = 30;
      for (let j = 0; j <= steps; j++) {
        const angle = currentAngle + (sliceAngle * j) / steps;
        const arcX = x + Math.cos(angle) * radius;
        const arcY = y + Math.sin(angle) * radius;
        doc.lineTo(arcX, arcY);
      }

      doc.lineTo(x, y);
      doc.fill();

      currentAngle += sliceAngle;
    });
  };

  const drawLineChart = (x: number, y: number, width: number, height: number, data: number[], labels: string[]) => {
    if (data.length < 2) return;

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    const stepX = width / (data.length - 1);

    // Draw grid lines
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    for (let i = 0; i <= 4; i++) {
      const gridY = y + (height / 4) * i;
      doc.line(x, gridY, x + width, gridY);
    }

    // Draw the line
    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(2);

    for (let i = 0; i < data.length - 1; i++) {
      const x1 = x + (i * stepX);
      const y1 = y + height - ((data[i] - minValue) / range) * height;
      const x2 = x + ((i + 1) * stepX);
      const y2 = y + height - ((data[i + 1] - minValue) / range) * height;

      doc.line(x1, y1, x2, y2);

      // Draw data points
      doc.setFillColor(52, 152, 219);
      doc.circle(x1, y1, 1.5, 'F');
    }

    // Draw last point
    const lastX = x + ((data.length - 1) * stepX);
    const lastY = y + height - ((data[data.length - 1] - minValue) / range) * height;
    doc.circle(lastX, lastY, 1.5, 'F');

    // Draw axes
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(1);
    doc.line(x, y + height, x + width, y + height); // X-axis
    doc.line(x, y, x, y + height); // Y-axis

    // Add labels
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    labels.forEach((label, index) => {
      if (index % Math.ceil(labels.length / 5) === 0) {
        const labelX = x + (index * stepX);
        doc.text(label, labelX, y + height + 10, { align: 'center' });
      }
    });
  };

  const drawProgressIndicator = (x: number, y: number, width: number, percentage: number, color: [number, number, number]) => {
    const height = 6; // Reduced height
    // Draw background
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, width, height, 'F');
    // Draw progress
    const fillWidth = (percentage / 100) * width;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, fillWidth, height, 'F');
    // Add border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height, 'S');
  };

  // Get historical data for progress tracking
  const historyData = JSON.parse(localStorage.getItem("meditationHistory") || "[]");

  function getProgressTrends(history: any[]) {
    if (history.length < 2) return null;
    const recent = history.slice(-1);
    const previous = history.slice(-2, -1);
    if (previous.length === 0) return null;

    const calculateAverage = (sessions: any[], key: string) => {
      return sessions.reduce((sum, session) => {
        if (key === 'goodMeditationPct') return sum + parseFloat(session[key]);
        if (key === 'focusScore') return sum + parseFloat(session[key]);
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          return sum + session[parent][child];
        }
        return sum + session[key];
      }, 0) / sessions.length;
    };

    return {
      goodMeditation: calculateAverage(recent, 'goodMeditationPct') - calculateAverage(previous, 'goodMeditationPct'),
      focusScore: calculateAverage(recent, 'focusScore') - calculateAverage(previous, 'focusScore'),
      alpha: calculateAverage(recent, 'averages.alpha') - calculateAverage(previous, 'averages.alpha'),
      theta: calculateAverage(recent, 'averages.theta') - calculateAverage(previous, 'averages.theta'),
    };
  }

  // Calculate progress statistics
  const getProgressStats = () => {
    if (historyData.length < 2) return null;
    const recent = historyData.slice(-5);
    const previous = historyData.slice(-10, -5);
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

    // Calculate streak
    const uniqueDates = [...new Set(historyData.map((s: any) => s.sessionDate))].sort().reverse();
    let streak = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      const date = uniqueDates[i];
      const daysDiff = Math.floor((new Date().getTime() - new Date(String(date)).getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalSessions: historyData.length,
      currentStreak: streak,
      recentAvg: {
        alpha: calculateAverage(recent, 'averages.alpha'),
        theta: calculateAverage(recent, 'averages.theta'),
        beta: calculateAverage(recent, 'averages.beta'),
        goodMeditation: calculateAverage(recent, 'goodMeditationPct'),
        focusScore: calculateAverage(recent, 'focusScore'),
      },
      previousAvg: {
        alpha: calculateAverage(previous, 'averages.alpha'),
        theta: calculateAverage(previous, 'averages.theta'),
        beta: calculateAverage(previous, 'averages.beta'),
        goodMeditation: calculateAverage(previous, 'goodMeditationPct'),
        focusScore: calculateAverage(previous, 'focusScore'),
      }
    };
  };

  const progressStats = getProgressStats();
  const progressTrends = getProgressTrends(historyData);

  // Header
  doc.setFontSize(24);
  doc.setTextColor(52, 152, 219);
  doc.text("Your Meditation Journey", pageWidth / 2, 25, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(dateStr, pageWidth / 2, 35, { align: "center" });

  if (historyData.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(46, 204, 113);
    const streakText = progressStats ? ` - ${progressStats.currentStreak} day streak!` : '';

  }

  let yPos = 60;

  // Session Summary Card
  doc.setFillColor(228, 229, 230);
  doc.rect(15, yPos - 5, pageWidth - 30, 55, 'F');
  doc.setFontSize(18);
  doc.setTextColor(44, 62, 80);
  doc.text("Today's Session Summary", 20, yPos + 5);

  yPos += 15;
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text("Meditation Quality:", 20, yPos);
  const quality = parseFloat(sessionResults.goodMeditationPct);
  drawProgressIndicator(20, yPos + 5, 120, quality, [46, 204, 113]);

  yPos += 20;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Duration: ${sessionResults.formattedDuration} | State: ${sessionResults.mentalState} | Focus Score: ${sessionResults.focusScore}`, 20, yPos);

  yPos += 25;

  // --- Detailed Session Overview ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 40);
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text("Session Overview", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const overviewText = "This section summarizes when your session happened, how long it lasted, and your overall mental state and focus during meditation.";
  const wrappedOverview = doc.splitTextToSize(overviewText, pageWidth - 40);
  doc.text(wrappedOverview, 20, yPos);
  yPos += wrappedOverview.length * 6;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);

  const sessionStart = sessionResults.data?.[0]?.timestamp
    ? new Date(sessionResults.data[0].timestamp).toLocaleTimeString()
    : "N/A";
  const sessionEnd = sessionResults.data?.[sessionResults.data.length - 1]?.timestamp
    ? new Date(sessionResults.data[sessionResults.data.length - 1].timestamp).toLocaleTimeString()
    : "N/A";

  doc.text(`Date: ${dateStr}`, 20, yPos);
  yPos += 7;
  doc.text(`Start Time: ${sessionStart}`, 20, yPos);
  yPos += 7;
  doc.text(`End Time: ${sessionEnd}`, 20, yPos);
  yPos += 7;
  doc.text(`Duration: ${sessionResults.formattedDuration}`, 20, yPos);
  yPos += 7;
  const mentalStateText = `Mental State: ${sessionResults.mentalState}`;
  const wrappedMentalState = doc.splitTextToSize(mentalStateText, pageWidth - 40);
  doc.text(wrappedMentalState, 20, yPos);
  yPos += wrappedMentalState.length * 6;
  doc.text(`Focus Score: ${sessionResults.focusScore}`, 20, yPos);
  yPos += 7;
  doc.text(`Meditation Quality: ${sessionResults.goodMeditationPct}%`, 20, yPos);
  yPos += 7;

  // Add HRV and BPM information to Session Overview
  doc.text(`Average HRV: ${sessionResults.averageHRV ?? '--'} ms`, 20, yPos);
  yPos += 7;
  doc.text(`Average BPM: ${sessionResults.averageBPM ?? '--'}`, 20, yPos);

  yPos += 15;

  // --- Recent Progress Trends ---
  yPos += 10; // Add margin before heading
  const trends = getProgressTrends(historyData);
  if (trends) {
    yPos = checkNewPage(yPos, 25);
    doc.setFontSize(16);
    doc.setTextColor(52, 73, 94);
    doc.text("Recent Progress Trends", 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const trendsText = "This shows how your recent session compares to your previous session. Positive values indicate improvement.";
    const wrappedTrends = doc.splitTextToSize(trendsText, pageWidth - 40);
    doc.text(wrappedTrends, 20, yPos);
    yPos += wrappedTrends.length * 6;

    const meditationImprovement = getImprovementText(trends.goodMeditation);
    const focusImprovement = getImprovementText(trends.focusScore, 'score');
    const alphaImprovement = getImprovementText(trends.alpha * 100);
    const thetaImprovement = getImprovementText(trends.theta * 100);

    // Set consistent styling for trend lines
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);

    const trendLines = [
      `Meditation Quality: ${meditationImprovement.text}`,
      `Focus Score: ${focusImprovement.text}`,
      `Alpha Waves: ${alphaImprovement.text}`,
      `Theta Waves: ${thetaImprovement.text}`,
    ];

    trendLines.forEach(line => {
      yPos = checkNewPage(yPos, 8);
      doc.text(line, 20, yPos);
      yPos += 7;
    });
  }

  // --- Session Averages ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 30);
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text("Session Averages", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const averagesText = "These are the average levels of different brainwave types detected during your session. Higher Alpha means more relaxation, Beta means focus, Theta means deep meditation, and Delta means drowsiness.";
  const wrappedAverages = doc.splitTextToSize(averagesText, pageWidth - 40);
  doc.text(wrappedAverages, 20, yPos);
  yPos += wrappedAverages.length * 6;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Alpha (Relaxation): ${sessionResults.averages.alpha.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.text(`Beta (Focus): ${sessionResults.averages.beta.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.text(`Theta (Meditation): ${sessionResults.averages.theta.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.text(`Delta (Drowsiness): ${sessionResults.averages.delta.toFixed(2)}`, 20, yPos);
  yPos += 7;
  doc.text(`Symmetry: ${sessionResults.averages.symmetry.toFixed(2)}`, 20, yPos);
  yPos += 15;

  // --- Streak and Consistency ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 20);
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text("Practice Consistency", 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const consistencyText = "We track your 5 most recent sessions using a rolling window. When you complete a 6th session, the oldest is automatically replaced. This gives you focused insights into your current meditation habits.";
  const wrappedConsistency = doc.splitTextToSize(consistencyText, pageWidth - 40);
  doc.text(wrappedConsistency, 20, yPos);
  yPos += wrappedConsistency.length * 6;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);

  // Calculate accurate streak and statistics for rolling 5 sessions
  const calculateAccurateStats = () => {
    if (historyData.length === 0) return null;

    // Working with rolling window of 5 sessions (FIFO approach)
    const recentSessions = historyData; // Already limited to 5 in localStorage

    // Get unique dates from current sessions and sort them
    const sessionDates = recentSessions
      .map((session: any) => {
        if (session.sessionDate) {
          return session.sessionDate;
        } else if (session.timestamp) {
          return new Date(session.timestamp).toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
      })
      .filter((date: string, index: number, arr: string[]) => arr.indexOf(date) === index) // Remove duplicates
      .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime()); // Sort newest first

    // Calculate streak from current rolling window
    let recentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check consecutive days in current window
    if (sessionDates.includes(today)) {
      recentStreak = 1;
      let checkDate = new Date(today);

      for (let i = 1; i < sessionDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        if (sessionDates.includes(checkDateStr)) {
          recentStreak++;
        } else {
          break;
        }
      }
    } else if (sessionDates.includes(yesterday)) {
      recentStreak = 1;
      let checkDate = new Date(yesterday);

      for (let i = 1; i < sessionDates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkDateStr = checkDate.toISOString().split('T')[0];

        if (sessionDates.includes(checkDateStr)) {
          recentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate activity in last 7 days from current window
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = recentSessions.filter((session: any) => {
      const sessionDate = new Date(session.sessionDate || session.timestamp);
      return sessionDate >= oneWeekAgo;
    }).length;

    // Calculate session frequency (sessions per day over the date range)
    const oldestSession = recentSessions[0];
    const newestSession = recentSessions[recentSessions.length - 1];
    let daySpan = 1;

    if (oldestSession && newestSession) {
      const oldestDate = new Date(oldestSession.sessionDate || oldestSession.timestamp);
      const newestDate = new Date(newestSession.sessionDate || newestSession.timestamp);
      daySpan = Math.max(1, Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    const frequency = recentSessions.length / daySpan;

    return {
      totalTrackedSessions: recentSessions.length,
      maxTrackingSessions: 5,
      uniqueRecentDays: sessionDates.length,
      recentStreak,
      recentActivity,
      frequency: frequency,
      daySpan: daySpan,
      isRollingWindow: recentSessions.length === 5
    };
  };

  const accurateStats = calculateAccurateStats();

  if (accurateStats && accurateStats.totalTrackedSessions > 0) {
    yPos += 5;

    // Sessions in rolling window
    yPos = checkNewPage(yPos, 20);
    const windowStatus = accurateStats.isRollingWindow ? "(Rolling Window)" : "(Building History)";
    doc.text(`Sessions Tracked: ${accurateStats.totalTrackedSessions} of ${accurateStats.maxTrackingSessions} ${windowStatus}`, 20, yPos);
    yPos += 8;

    if (!accurateStats.isRollingWindow) {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Complete ${5 - accurateStats.totalTrackedSessions} more sessions to fill the tracking window`, 20, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Your next session will replace the oldest session in the window`, 20, yPos);
      yPos += 8;
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
    }

    // Recent streak within current window
    yPos = checkNewPage(yPos, 15);
    doc.text(`Current Streak: ${accurateStats.recentStreak} day${accurateStats.recentStreak !== 1 ? 's' : ''}`, 20, yPos);
    yPos += 8;
    const streakColor: [number, number, number] = accurateStats.recentStreak >= 3 ? [46, 204, 113] :
      accurateStats.recentStreak >= 2 ? [241, 196, 15] : [52, 152, 219];
    const streakPercentage = Math.min((accurateStats.recentStreak / 5) * 100, 100);
    drawProgressIndicator(20, yPos - 2, 100, streakPercentage, streakColor);
    yPos += 15;

    // Unique practice days in window
    yPos = checkNewPage(yPos, 15);
    doc.text(`Unique Practice Days: ${accurateStats.uniqueRecentDays} of ${accurateStats.totalTrackedSessions}`, 20, yPos);
    yPos += 8;
    const uniquePercentage = (accurateStats.uniqueRecentDays / Math.max(accurateStats.totalTrackedSessions, 1)) * 100;
    const uniqueColor: [number, number, number] = uniquePercentage >= 80 ? [46, 204, 113] :
      uniquePercentage >= 60 ? [241, 196, 15] : [231, 76, 60];
    drawProgressIndicator(20, yPos - 2, 100, uniquePercentage, uniqueColor);
    yPos += 15;

    // Session frequency
    yPos = checkNewPage(yPos, 16);
    doc.text(`Session Frequency: ${accurateStats.frequency.toFixed(1)} sessions/day over ${accurateStats.daySpan} days`, 20, yPos);
    yPos += 8;
    doc.text(`Recent Activity (7 days): ${accurateStats.recentActivity} sessions`, 20, yPos);
    yPos += 15;

    // Consistency rating based on rolling window
    yPos = checkNewPage(yPos, 30);
  


    // Add note about FIFO approach
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const fifoNote = accurateStats.isRollingWindow
      ? "Note: This analysis uses your 5 most recent sessions. Older sessions are automatically archived as you continue practicing."
      : "Note: Complete more sessions to get fuller consistency insights from your rolling 5-session window.";
    const wrappedFifo = doc.splitTextToSize(fifoNote, pageWidth - 40);
    doc.text(wrappedFifo, 20, yPos);

  } else {
    // First session encouragement
    yPos += 5;
    yPos = checkNewPage(yPos, 40);
    doc.setFontSize(12);
    doc.setTextColor(46, 204, 113);
    doc.text("*** Welcome to Your Meditation Journey! ***", 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const welcomeText = "This is your first recorded session! We'll track your next 5 sessions in a rolling window. Each new session will give you better insights into your meditation habits.";
    const wrappedWelcome = doc.splitTextToSize(welcomeText, pageWidth - 40);
    doc.text(wrappedWelcome, 20, yPos);
    yPos += wrappedWelcome.length * 6;

    yPos += 8;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("TIP: Your 5 most recent sessions will always be tracked for focused insights!", 20, yPos);
  }

  yPos += 15; // Add some space before next section

 
  // --- Recommendations ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 30);
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text("Recommendations", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const recommendationsText = "Based on your results, here are some tips to help you improve your meditation practice.";
  const wrappedRecommendations = doc.splitTextToSize(recommendationsText, pageWidth - 40);
  doc.text(wrappedRecommendations, 20, yPos);
  yPos += wrappedRecommendations.length * 6;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  const recommendations = quality >= 60
    ? [
      "- Extend your session by a few minutes for deeper practice.",
      "- Try new breathing or mindfulness techniques.",
      "- Maintain your streak for lasting benefits."
    ]
    : [
      "- Practice regularly, even short sessions help.",
      "- Use guided meditations for support.",
      "- Find a quiet, comfortable space."
    ];
  recommendations.forEach(rec => {
    yPos = checkNewPage(yPos, 8);
    doc.text(rec, 20, yPos);
    yPos += 7;
  });

  // --- Last 5 Session Summary Table ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 30);
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text("Last Few Session Summary", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const tableText = "This table shows your last few meditation sessions, including the date, meditation quality, score, and your main mental state for each session.";
  const wrappedTable = doc.splitTextToSize(tableText, pageWidth - 40);
  doc.text(wrappedTable, 20, yPos);
  yPos += wrappedTable.length * 6;

  doc.setFontSize(10);
  doc.setTextColor(44, 62, 80);

  // Enhanced function to re-analyze mental state from stored averages
  const reAnalyzeMentalState = (averages: any) => {
    if (!averages || typeof averages !== 'object') return 'Unknown';
    
    const totalPower = averages.alpha + averages.beta + averages.theta + averages.delta;
    if (totalPower === 0) return 'Unknown';
    
    // Calculate percentages for decision making
    const alphaPercent = (averages.alpha / totalPower) * 100;
    const betaPercent = (averages.beta / totalPower) * 100;
    const thetaPercent = (averages.theta / totalPower) * 100;
    const deltaPercent = (averages.delta / totalPower) * 100;

    // Enhanced mental state determination logic (same as MeditationSession.tsx)
    if (deltaPercent > 40) {
      return 'Drowsy';
    } else if (thetaPercent > 35 && alphaPercent > 25) {
      return 'Deep Meditation';
    } else if (thetaPercent > 30) {
      return 'Meditative';
    } else if (alphaPercent > 35) {
      return 'Relaxed';
    } else if (alphaPercent > 25 && betaPercent < 40) {
      return 'Relaxed Focus';
    } else if (betaPercent > 45) {
      return 'Highly Focused';
    } else if (betaPercent > 35) {
      return 'Focused';
    } else {
      // Fallback based on dominant wave
      const dominantWave = (Object.entries(averages) as [string, number][])
        .filter(([key]) => key !== "symmetry")
        .sort((a, b) => b[1] - a[1])[0][0];
      
      switch (dominantWave) {
        case 'alpha': return 'Relaxed';
        case 'beta': return 'Focused';
        case 'theta': return 'Meditative';
        case 'delta': return 'Drowsy';
        default: return 'Balanced';
      }
    }
  };

  // Table headers
  const tableX = 20;
  const colWidths = [30, 30, 35, 45]; // Made state column wider
  const headers = ["Date", "Quality", "Score", "State"];
  let colX = tableX;
  headers.forEach((header, i) => {
    doc.text(header, colX + 2, yPos);
    colX += colWidths[i];
  });
  yPos += 6;

  // Draw header line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(tableX, yPos, tableX + colWidths.reduce((a, b) => a + b, 0), yPos);

  // Table rows - Enhanced with re-analyzed mental states
  const last5 = historyData.slice(-5);
  last5.forEach((session: any) => {
    let rowX = tableX;

    // Ensure session has a date
    let sessionDate = "";
    if (session.sessionDate) {
      sessionDate = new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    } else if (session.timestamp) {
      sessionDate = new Date(session.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    } else {
      sessionDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }

    const quality = session.goodMeditationPct ? `${parseFloat(session.goodMeditationPct).toFixed(1)}%` : "";
    const focus = session.focusScore ? Number(session.focusScore).toFixed(2) : "";
    
    // Re-analyze mental state from stored averages if available, otherwise use stored state
    let state = "";
    if (session.averages && typeof session.averages === 'object') {
      state = reAnalyzeMentalState(session.averages);
    } else {
      state = session.mentalState || "Unknown";
    }

    doc.text(sessionDate, rowX + 2, yPos + 6);
    rowX += colWidths[0];
    doc.text(quality, rowX + 2, yPos + 6);
    rowX += colWidths[1];
    doc.text(focus, rowX + 2, yPos + 6);
    rowX += colWidths[2];
    
    // Truncate state if too long to fit in column
    const maxStateLength = 12;
    const displayState = state.length > maxStateLength ? state.substring(0, maxStateLength - 2) + ".." : state;
    doc.text(displayState, rowX + 2, yPos + 6);

    yPos += 8;
  });



  // --- Footer ---
  const finalYPos = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text("CortEX Meditation - Personal Meditation Analytics", pageWidth / 2, finalYPos, { align: "center" });

  const pageCount = doc.getNumberOfPages();
  if (pageCount > 1) {
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`${i}/${pageCount}`, pageWidth - 20, finalYPos);
    }
  }

  doc.save(`${filename}.pdf`);

  // ❌ REMOVE ALL THIS CODE - DON'T SAVE TO LOCALSTORAGE FROM PDF EXPORT
  // The session should already be saved in MeditationSession.tsx
  console.log("PDF exported successfully");

  function getImprovementText(value: number, type: 'percentage' | 'score' = 'percentage') {
    if (Math.abs(value) < 0.1) return { text: "Stable", icon: "=" };
    const isPositive = value > 0;
    const absValue = Math.abs(value);
    const text = type === 'percentage'
      ? `${isPositive ? '+' : '-'}${absValue.toFixed(1)}%`
      : `${isPositive ? '+' : '-'}${absValue.toFixed(2)}`;
    return {
      text,
      icon: isPositive ? "↑" : "↓"
    };
  }
};

