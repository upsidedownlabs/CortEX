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
    const height = 8;
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, width, height, 'F');
    const fillWidth = (percentage / 100) * width;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, fillWidth, height, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`${percentage.toFixed(1)}%`, x + width + 5, y + 6);
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

    const meditationImprovement = getImprovementText(trends.goodMeditation);
    const focusImprovement = getImprovementText(trends.focusScore, 'score');
    const alphaImprovement = getImprovementText(trends.alpha * 100);
    const thetaImprovement = getImprovementText(trends.theta * 100);

    const trendLines = [
      `Meditation: ${meditationImprovement.text}`,
      `Focus: ${focusImprovement.text}`,
      `Alpha: ${alphaImprovement.text}`,
      `Theta: ${thetaImprovement.text}`,
    ];

    trendLines.forEach(line => {
      yPos = checkNewPage(yPos, 8);
      doc.text(line, 24, yPos);
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
  const consistencyText = "Consistency is key for meditation progress. This shows how many days in a row you've meditated and your total sessions.";
  const wrappedConsistency = doc.splitTextToSize(consistencyText, pageWidth - 40);
  doc.text(wrappedConsistency, 20, yPos);
  yPos += wrappedConsistency.length * 6;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  if (progressStats) {
    doc.text(`Current Streak: ${progressStats.currentStreak} days`, 20, yPos);
    yPos += 7;
    doc.text(`Total Sessions: ${progressStats.totalSessions}`, 20, yPos);
    yPos += 7;
  }

  // --- Improvement Explanation ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 20);
  doc.setFontSize(16);
  doc.setTextColor(52, 73, 94);
  doc.text("Improvement Analysis", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const improvementText = "Here you can see how your recent sessions compare to previous ones. Arrows show if you're improving (up), declining (down), or staying steady.";
  const wrappedImprovement = doc.splitTextToSize(improvementText, pageWidth - 40);
  doc.text(wrappedImprovement, 20, yPos);
  yPos += wrappedImprovement.length * 6;

  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  if (progressStats) {
    const getTrendText = (current: number, previous: number, label: string) => {
      const diff = current - previous;
      if (Math.abs(diff) < 0.5) return `${label}: No significant change compared to previous 5 sessions.`;
      return diff > 0
        ? `${label}: Improved by ${Math.abs(diff).toFixed(1)}% compared to previous 5 sessions.`
        : `${label}: Decreased by ${Math.abs(diff).toFixed(1)}% compared to previous 5 sessions.`;
    };
    doc.text(getTrendText(progressStats.recentAvg.goodMeditation, progressStats.previousAvg.goodMeditation, "Meditation Quality"), 20, yPos);
    yPos += 7;
    doc.text(getTrendText(progressStats.recentAvg.alpha * 100, progressStats.previousAvg.alpha * 100, "Mental Calmness"), 20, yPos);
    yPos += 7;
  }

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
  doc.text("Last 5 Session Summary", 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const tableText = "This table shows your last five meditation sessions, including the date, meditation quality, focus score, and your main mental state for each session.";
  const wrappedTable = doc.splitTextToSize(tableText, pageWidth - 40);
  doc.text(wrappedTable, 20, yPos);
  yPos += wrappedTable.length * 6;

  doc.setFontSize(10);
  doc.setTextColor(44, 62, 80);

  // Table headers
  const tableX = 20;
  const colWidths = [30, 30, 35, 35];
  const headers = ["Date", "Quality", "Focus Score", "State"];
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

  // Table rows
  const last5 = historyData.slice(-5).reverse();
  last5.forEach((session: any) => {
    let rowX = tableX;
    const sessionDate = session.sessionDate
      ? new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      : "";
    const quality = session.goodMeditationPct ? `${parseFloat(session.goodMeditationPct).toFixed(1)}%` : "";
    const focus = session.focusScore ? Number(session.focusScore).toFixed(2) : "";
    const state = session.mentalState || "";

    doc.text(sessionDate, rowX + 2, yPos + 6);
    rowX += colWidths[0];
    doc.text(quality, rowX + 2, yPos + 6);
    rowX += colWidths[1];
    doc.text(focus, rowX + 2, yPos + 6);
    rowX += colWidths[2];
    doc.text(state, rowX + 2, yPos + 6);

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

  // When saving session data
  try {
    const history = JSON.parse(localStorage.getItem("meditationHistory") || "[]");
    // Remove non-serializable fields
    const { convert, ...serializableSession } = sessionResults;
    // Add new session to the end
    history.push(serializableSession);
    // Keep only the last 5 sessions (FIFO)
    const updatedHistory = history.slice(-5);
    const dataStr = JSON.stringify(updatedHistory);
    if (dataStr.length > 5000000) {
      throw new Error("Session history is too large for localStorage.");
    }
    localStorage.setItem("meditationHistory", dataStr);
  } catch (e) {
    console.error("Error saving session data:", e);
    alert("Error saving session data. Please clear some storage or check your browser settings.");
  }

  // Update sessionDate for existing records
  const history = JSON.parse(localStorage.getItem("meditationHistory") || "[]");
  interface HistorySession {
    sessionDate?: string;
    timestamp?: number;
    [key: string]: any;
  }

  (history as HistorySession[]).forEach((s: HistorySession) => {
    if (!s.sessionDate && s.timestamp) {
      const d = new Date(s.timestamp);
      s.sessionDate = d.toISOString().split('T')[0];
    }
  });
  localStorage.setItem("meditationHistory", JSON.stringify(history));

  function getImprovementText(value: number, type: 'percentage' | 'score' = 'percentage') {
    if (Math.abs(value) < 0.1) return { text: "Stable", icon: "➖" };
    const isPositive = value > 0;
    const absValue = Math.abs(value);
    const text = type === 'percentage'
      ? `${isPositive ? '+' : '-'}${absValue.toFixed(1)}%`
      : `${isPositive ? '+' : '-'}${absValue.toFixed(2)}`;
    return {
      text,
      icon: isPositive ? "📈" : "📉"
    };
  }
};

