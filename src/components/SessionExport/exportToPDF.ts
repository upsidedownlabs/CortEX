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
  averageHRV: number;    
  averageBPM: number;    
  sessionDate?: string;  
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

  // ===== STANDARDIZED TEXT SIZES =====
  const FONT_SIZES = {
    TITLE: 24,        // Main document title
    SECTION: 16,      // Section headers
    SUBSECTION: 14,   // Sub-section headers  
    BODY: 11,         // Regular body text
    SMALL: 9,         // Small text, legends, notes
    TINY: 8           // Very small text, footnotes
  };

  // Header
  doc.setFontSize(FONT_SIZES.TITLE);
  doc.setTextColor(52, 152, 219);
  doc.text("Your Meditation Journey", pageWidth / 2, 25, { align: "center" });

  doc.setFontSize(FONT_SIZES.BODY);
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(dateStr, pageWidth / 2, 35, { align: "center" });

  if (historyData.length > 0) {
    doc.setFontSize(FONT_SIZES.BODY);
    doc.setTextColor(46, 204, 113);
    const streakText = progressStats ? ` - ${progressStats.currentStreak} day streak!` : '';
  }

  let yPos = 60;

  // Session Summary Card
  doc.setFillColor(228, 229, 230);
  doc.rect(15, yPos - 5, pageWidth - 30, 55, 'F');
  doc.setFontSize(FONT_SIZES.SUBSECTION);
  doc.setTextColor(44, 62, 80);
  doc.text("Today's Session Summary", 20, yPos + 5);

  yPos += 15;
  doc.setFontSize(FONT_SIZES.BODY);
  doc.setTextColor(60, 60, 60);
  doc.text("Meditation Quality:", 20, yPos);
  const quality = parseFloat(sessionResults.goodMeditationPct);
  drawProgressIndicator(20, yPos + 5, 120, quality, [46, 204, 113]);

  yPos += 20;
  doc.setFontSize(FONT_SIZES.BODY);
  doc.setTextColor(60, 60, 60);
  doc.text(`Duration: ${sessionResults.formattedDuration} | State: ${sessionResults.mentalState} | Focus Score: ${sessionResults.focusScore}`, 20, yPos);

  yPos += 25;

  // --- Detailed Session Overview ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 40);
  doc.setFontSize(FONT_SIZES.SECTION);
  doc.setTextColor(52, 73, 94);
  doc.text("Session Overview", 20, yPos);
  yPos += 8;
  doc.setFontSize(FONT_SIZES.SMALL);
  doc.setTextColor(100, 100, 100);
  const overviewText = "This section summarizes when your session happened, how long it lasted, and your overall mental state and focus during meditation.";
  const wrappedOverview = doc.splitTextToSize(overviewText, pageWidth - 40);
  doc.text(wrappedOverview, 20, yPos);
  yPos += wrappedOverview.length * 6;

  doc.setFontSize(FONT_SIZES.BODY);
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
    doc.setFontSize(FONT_SIZES.SECTION);
    doc.setTextColor(52, 73, 94);
    doc.text("Recent Progress Trends", 20, yPos);
    yPos += 8;
    doc.setFontSize(FONT_SIZES.SMALL);
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
    doc.setFontSize(FONT_SIZES.BODY);
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

  // --- Brainwave Analysis ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 30);
  doc.setFontSize(FONT_SIZES.SECTION);
  doc.setTextColor(52, 73, 94);
  doc.text("Brainwave Analysis", 20, yPos);
  yPos += 8;
  doc.setFontSize(FONT_SIZES.SMALL);
  doc.setTextColor(100, 100, 100);
  const averagesText = "These measurements show your brain's electrical activity during meditation. Each wave type indicates different mental states:";
  const wrappedAverages = doc.splitTextToSize(averagesText, pageWidth - 40);
  doc.text(wrappedAverages, 20, yPos);
  yPos += wrappedAverages.length * 6 + 5;

  // Calculate percentages for better understanding
  const totalPower = sessionResults.averages.alpha + sessionResults.averages.beta + 
                     sessionResults.averages.theta + sessionResults.averages.delta;

  const brainwaveData = [
    {
      name: "Alpha (Relaxation)",
      value: sessionResults.averages.alpha,
      percentage: ((sessionResults.averages.alpha / totalPower) * 100),
      description: "Calm, relaxed awareness",
      ideal: "Higher values indicate peaceful, stress-free meditation",
      color: [46, 204, 113] as [number, number, number]
    },
    {
      name: "Beta (Mental Activity)", 
      value: sessionResults.averages.beta,
      percentage: ((sessionResults.averages.beta / totalPower) * 100),
      description: "Active thinking, alertness",
      ideal: "Lower values during meditation are better",
      color: [231, 76, 60] as [number, number, number]
    },
    {
      name: "Theta (Deep Meditation)",
      value: sessionResults.averages.theta, 
      percentage: ((sessionResults.averages.theta / totalPower) * 100),
      description: "Creative insights, deep focus",
      ideal: "Higher values indicate profound meditative states",
      color: [142, 68, 173] as [number, number, number]
    },
    {
      name: "Delta (Deep Rest)",
      value: sessionResults.averages.delta,
      percentage: ((sessionResults.averages.delta / totalPower) * 100), 
      description: "Deep sleep, unconscious states",
      ideal: "Moderate levels are normal, very high suggests drowsiness",
      color: [52, 152, 219] as [number, number, number]
    }
  ];

  // Check if we need a new page for the brainwave section
  yPos = checkNewPage(yPos, 120);

  // Define layout positions - side by side 
  const leftColumnX = 20;
  const leftColumnWidth = 100;
  const rightColumnX = leftColumnX + leftColumnWidth + 15; // 15px gap
  const pieChartCenterX = rightColumnX + 25; 
  const pieChartCenterY = yPos + 25; 
  const pieChartRadius = 25;

  // Function to draw pie chart 
  const drawPieChart = (centerX: number, centerY: number, radius: number, data: any[]) => {
    let currentAngle = 0;
    
    data.forEach((segment, index) => {
      const angle = (segment.percentage / 100) * 2 * Math.PI;
      
      // Set fill color
      doc.setFillColor(segment.color[0], segment.color[1], segment.color[2]);
      
      // Calculate points for the pie slice
      const startX = centerX + Math.cos(currentAngle) * radius;
      const startY = centerY + Math.sin(currentAngle) * radius;
      const endX = centerX + Math.cos(currentAngle + angle) * radius;
      const endY = centerY + Math.sin(currentAngle + angle) * radius;
      
      // Draw the pie slice using triangle approach for better compatibility
      if (angle > 0.01) { // Only draw if slice is visible
        // Create path for pie slice
        const steps = Math.max(3, Math.floor(angle * 20)); // More steps for smoother curves
        const angleStep = angle / steps;
        
        // Start path at center
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1);
        
        // Draw filled polygon for pie slice
        const points: [number, number][] = [];
        points.push([centerX, centerY]); // Center point
        
        for (let i = 0; i <= steps; i++) {
          const stepAngle = currentAngle + (i * angleStep);
          const x = centerX + Math.cos(stepAngle) * radius;
          const y = centerY + Math.sin(stepAngle) * radius;
          points.push([x, y]);
        }
        
        // Draw the filled shape
        doc.setFillColor(segment.color[0], segment.color[1], segment.color[2]);
        // Use lines to create the pie slice
        doc.lines(points.slice(1).map((point, i) => {
          if (i === 0) return [point[0] - centerX, point[1] - centerY];
          return [point[0] - points[i][0], point[1] - points[i][1]];
        }), centerX, centerY, [1, 1], 'F');
        
        // Draw border
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1);
        doc.line(centerX, centerY, startX, startY);
        doc.line(centerX, centerY, endX, endY);
      }
      
      currentAngle += angle;
    });
    
    // Draw outer circle border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.circle(centerX, centerY, radius, 'S');
  };

  // Add chart title ABOVE pie chart 
  doc.setFontSize(FONT_SIZES.BODY);
  doc.setTextColor(44, 62, 80);
  

  // Draw pie chart on the right side
  drawPieChart(pieChartCenterX, pieChartCenterY, pieChartRadius, brainwaveData);

  // Add legend below the pie chart 
  let legendY = pieChartCenterY + pieChartRadius + 8; // Reduced gap
  doc.setFontSize(FONT_SIZES.SMALL);
  
  brainwaveData.forEach((wave, index) => {
    // Draw color box 
    doc.setFillColor(wave.color[0], wave.color[1], wave.color[2]);
    doc.rect(pieChartCenterX - 20, legendY - 3, 4, 4, 'F'); 
    
    // Draw border around color box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(pieChartCenterX - 20, legendY - 3, 4, 4, 'S'); 
    
    // Add label
    doc.setTextColor(60, 60, 60);
    const waveLabel = wave.name.split(' (')[0];
    doc.text(`${waveLabel}`, pieChartCenterX - 14, legendY); 
    doc.text(`${wave.percentage.toFixed(1)}%`, pieChartCenterX + 15, legendY); 
    
    legendY += 7;
  });

  // Display brainwave data on the left side 
  let leftYPos = yPos + 5; // Start at same level as pie chart title
  
  brainwaveData.forEach((wave, index) => {
    // Main wave line: "Alpha (Relaxation): 0.088 (10.3% of total activity)"
    doc.setFontSize(FONT_SIZES.BODY);
    doc.setTextColor(44, 62, 80);
    
    // Split text if it's too long for the left column
    const mainText = `${wave.name}: ${wave.value.toFixed(3)} (${wave.percentage.toFixed(1)}% of total activity)`;
    const wrappedMainText = doc.splitTextToSize(mainText, leftColumnWidth);
    doc.text(wrappedMainText, leftColumnX, leftYPos);
    leftYPos += wrappedMainText.length * 6 + 2;
    
    // Description bullet point
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(80, 80, 80);
    const descriptionText = `• ${wave.description}`;
    const wrappedDescription = doc.splitTextToSize(descriptionText, leftColumnWidth);
    doc.text(wrappedDescription, leftColumnX, leftYPos);
    leftYPos += wrappedDescription.length * 5 + 1;
    
    // Ideal/interpretation bullet point
    doc.setTextColor(120, 120, 120);
    const idealText = `• ${wave.ideal}`;
    const wrappedIdeal = doc.splitTextToSize(idealText, leftColumnWidth);
    doc.text(wrappedIdeal, leftColumnX, leftYPos);
    leftYPos += wrappedIdeal.length * 5 + 8;
  });

  // Update yPos to move past both columns
  yPos = Math.max(leftYPos, legendY + 10);

  // Overall interpretation
  yPos += 5;
  yPos = checkNewPage(yPos, 25);
  doc.setFontSize(FONT_SIZES.SUBSECTION);
  doc.setTextColor(52, 73, 94);
  doc.text("Session Interpretation", 20, yPos);
  yPos += 10;

  doc.setFontSize(FONT_SIZES.BODY);
  doc.setTextColor(60, 60, 60);

  // Determine dominant wave and provide interpretation
  const dominantWave = brainwaveData.reduce((prev, current) => 
    prev.percentage > current.percentage ? prev : current
  );

  let interpretation = "";
  if (dominantWave.name.includes("Beta")) {
    interpretation = `Your mind was quite active during this session (${dominantWave.percentage.toFixed(1)}% Beta waves). This suggests active thinking rather than deep relaxation. Try focusing more on your breath to quiet mental chatter.`;
  } else if (dominantWave.name.includes("Alpha")) {
    interpretation = `Excellent! You achieved a relaxed state (${dominantWave.percentage.toFixed(1)}% Alpha waves). This indicates calm, peaceful meditation with reduced stress and anxiety.`;
  } else if (dominantWave.name.includes("Theta")) {
    interpretation = `Wonderful! You reached a deep meditative state (${dominantWave.percentage.toFixed(1)}% Theta waves). This suggests profound focus, creativity, and spiritual connection.`;
  } else if (dominantWave.name.includes("Delta")) {
    interpretation = `You were very relaxed, possibly drowsy (${dominantWave.percentage.toFixed(1)}% Delta waves). Consider meditating when more alert, or try sitting rather than lying down.`;
  }

  const wrappedInterpretation = doc.splitTextToSize(interpretation, pageWidth - 40);
  doc.text(wrappedInterpretation, 20, yPos);
  yPos += wrappedInterpretation.length * 6 + 5;

  // Symmetry explanation
  doc.setFontSize(FONT_SIZES.BODY);
  doc.setTextColor(60, 60, 60);
  const symmetryValue = sessionResults.averages.symmetry;
  let symmetryText = "";

  if (Math.abs(symmetryValue) < 0.05) {
    symmetryText = `Brain Symmetry: Balanced (${symmetryValue.toFixed(3)}) - Your left and right brain hemispheres were working in harmony.`;
  } else if (symmetryValue > 0.05) {
    symmetryText = `Brain Symmetry: Left-dominant (${symmetryValue.toFixed(3)}) - Your left hemisphere (logical, analytical) was more active.`;
  } else {
    symmetryText = `Brain Symmetry: Right-dominant (${symmetryValue.toFixed(3)}) - Your right hemisphere (creative, intuitive) was more active.`;
  }

  const wrappedSymmetry = doc.splitTextToSize(symmetryText, pageWidth - 40);
  doc.text(wrappedSymmetry, 20, yPos);
  yPos += wrappedSymmetry.length * 6;

  yPos += 15;

  // --- Practice Consistency ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 20);
  doc.setFontSize(FONT_SIZES.SECTION);
  doc.setTextColor(52, 73, 94);
  doc.text("Practice Consistency", 20, yPos);
  yPos += 8;

  doc.setFontSize(FONT_SIZES.SMALL);
  doc.setTextColor(100, 100, 100);
  const consistencyText = "Here's how consistent you've been with your meditation practice recently.";
  const wrappedConsistency = doc.splitTextToSize(consistencyText, pageWidth - 40);
  doc.text(wrappedConsistency, 20, yPos);
  yPos += wrappedConsistency.length * 6;

  doc.setFontSize(FONT_SIZES.BODY);
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

    // SIMPLIFIED AND USER-FRIENDLY STATS
    
    // Total sessions completed
    yPos = checkNewPage(yPos, 8);
    doc.text(`Total Sessions Completed: ${accurateStats.totalTrackedSessions}`, 20, yPos);
    yPos += 8;

    // Current streak (simplified)
    yPos = checkNewPage(yPos, 8);
    const streakText = accurateStats.recentStreak === 1 
      ? "Current Streak: 1 day - Keep it going!"
      : accurateStats.recentStreak > 1 
        ? `Current Streak: ${accurateStats.recentStreak} days - Fantastic!`
        : "Current Streak: 0 days - Start a new streak today!";
    doc.text(streakText, 20, yPos);
    yPos += 8;

    // Practice frequency (simplified)
    yPos = checkNewPage(yPos, 8);
    let frequencyText = "";
    if (accurateStats.frequency >= 1) {
      frequencyText = `Practice Frequency: Daily (${accurateStats.frequency.toFixed(1)} sessions per day)`;
    } else if (accurateStats.frequency >= 0.5) {
      frequencyText = `Practice Frequency: Regular (${(accurateStats.frequency * 7).toFixed(1)} sessions per week)`;
    } else {
      frequencyText = `Practice Frequency: Occasional (${(accurateStats.frequency * 7).toFixed(1)} sessions per week)`;
    }
    doc.text(frequencyText, 20, yPos);
    yPos += 8;

    // Recent activity (last week)
    yPos = checkNewPage(yPos, 8);
    const activityText = accurateStats.recentActivity === 1 
      ? "This Week: 1 session" 
      : `This Week: ${accurateStats.recentActivity} sessions`;
    doc.text(activityText, 20, yPos);
    yPos += 8;

    // Days practiced (simplified)
    yPos = checkNewPage(yPos, 8);
    const daysText = accurateStats.uniqueRecentDays === 1 
      ? "Days Practiced: 1 day" 
      : `Days Practiced: ${accurateStats.uniqueRecentDays} different days`;
    doc.text(daysText, 20, yPos);
    yPos += 10;

    // Encouraging message based on consistency
    yPos = checkNewPage(yPos, 15);
    doc.setFontSize(FONT_SIZES.SMALL);
    doc.setTextColor(60, 60, 60); // Changed from green (46, 204, 113) to dark gray/black
    
    let encouragement = "";
    if (accurateStats.recentStreak >= 7) {
      encouragement = "Amazing! You're on a fantastic streak. Meditation is becoming a strong habit!";
    } else if (accurateStats.recentStreak >= 3) {
      encouragement = "Great job! You're building a solid meditation routine. Keep it up!";
    } else if (accurateStats.recentStreak >= 1) {
      encouragement = "Good start! Try to meditate again tomorrow to build your streak."; // Fixed - completely clean line
    } else if (accurateStats.totalTrackedSessions >= 3) {
      encouragement = "You're making progress! Try to meditate more regularly for better results.";
    } else {
      encouragement = "Every session counts! Regular practice will help you see greater benefits.";
    }
    
    const wrappedEncouragement = doc.splitTextToSize(encouragement, pageWidth - 40);
    doc.text(wrappedEncouragement, 20, yPos);
    yPos += wrappedEncouragement.length * 6;

  } else {
    // First session encouragement (SIMPLIFIED)
    yPos += 5;
    yPos = checkNewPage(yPos, 25);
    doc.setFontSize(FONT_SIZES.SUBSECTION);
    doc.setTextColor(46, 204, 113);
    doc.text("Welcome to Your Meditation Journey!", 20, yPos);
    yPos += 10;

    doc.setFontSize(FONT_SIZES.BODY);
    doc.setTextColor(60, 60, 60);
    doc.text("This is your first session! Come back tomorrow to start building a streak.", 20, yPos);
    yPos += 8;
    doc.text("Tip: Even 5 minutes daily can make a big difference!", 20, yPos);
  }

  yPos += 5; // Add some space before next section

 
  // --- Recommendations ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 30);
  doc.setFontSize(FONT_SIZES.SECTION);
  doc.setTextColor(52, 73, 94);
  doc.text("Recommendations", 20, yPos);
  yPos += 8;
  doc.setFontSize(FONT_SIZES.SMALL);
  doc.setTextColor(100, 100, 100);
  const recommendationsText = "Based on your results, here are some tips to help you improve your meditation practice.";
  const wrappedRecommendations = doc.splitTextToSize(recommendationsText, pageWidth - 40);
  doc.text(wrappedRecommendations, 20, yPos);
  yPos += wrappedRecommendations.length * 6;

  doc.setFontSize(FONT_SIZES.BODY);
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

  // --- Session Summary Table ---
  yPos += 10; // Add margin before heading
  yPos = checkNewPage(yPos, 30);
  doc.setFontSize(FONT_SIZES.SECTION);
  doc.setTextColor(52, 73, 94);
  doc.text("Last Few Session Summary", 20, yPos);
  yPos += 8;
  doc.setFontSize(FONT_SIZES.SMALL);
  doc.setTextColor(100, 100, 100);
  const tableText = "This table shows your last few meditation sessions, including the date, meditation quality, score, and your main mental state for each session.";
  const wrappedTable = doc.splitTextToSize(tableText, pageWidth - 40);
  doc.text(wrappedTable, 20, yPos);
  yPos += wrappedTable.length * 6;

  doc.setFontSize(FONT_SIZES.SMALL);
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
  doc.setFontSize(FONT_SIZES.SMALL);
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

