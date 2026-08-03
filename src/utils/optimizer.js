// src/utils/optimizer.js
const DAYS = ["MO", "TU", "WE", "TH", "FR"];

function hasOverlap(schedule) {
  for (let i = 0; i < schedule.length; i++) {
    for (let j = i + 1; j < schedule.length; j++) {
      for (let t1 of schedule[i].times) {
        for (let t2 of schedule[j].times) {
          if (t1.day === t2.day && t1.start < t2.end && t2.start < t1.end) return true;
        }
      }
    }
  }
  return false;
}

function calculateScore(schedule) {
  let score = 1000;
  const dailyClasses = {};
  DAYS.forEach(d => dailyClasses[d] = []);
  schedule.forEach(course => course.times.forEach(t => dailyClasses[t.day].push(t)));

  let freeDays = 0;
  DAYS.forEach(day => {
    const classes = dailyClasses[day];
    if (classes.length === 0) { freeDays++; return; }

    const earliest = Math.min(...classes.map(c => c.start));
    const latest = Math.max(...classes.map(c => c.end));
    const totalSpan = latest - earliest;
    const classTime = classes.reduce((sum, c) => sum + (c.end - c.start), 0);
    const gapTime = totalSpan - classTime;

    score -= gapTime * 10; 
    if (earliest < 9) score -= 20; 
  });
  
  score += freeDays * 150; 
  return score;
}

// NEW: Main function that respects user preferences
export function generateBestSchedules(coursesInCart, preferences) {
  const results = [];

  function backtrack(currentSchedule, courseIndex) {
    if (courseIndex === coursesInCart.length) {
      results.push({ schedule: [...currentSchedule], score: calculateScore(currentSchedule) });
      return;
    }
    
    const currentCourse = coursesInCart[courseIndex];
    const userPref = preferences[currentCourse.code] || 'AUTO';
    
    // Filter sections based on user choice
    let sectionsToTry = currentCourse.sections;
    if (userPref !== 'AUTO') {
      sectionsToTry = currentCourse.sections.filter(s => s.sectionId === userPref);
    }

    for (let section of sectionsToTry) {
      const newSchedule = [...currentSchedule, { ...section, code: currentCourse.code }];
      if (!hasOverlap(newSchedule)) {
        backtrack(newSchedule, courseIndex + 1);
      }
    }
  }

  backtrack([], 0);
  return results.sort((a, b) => b.score - a.score).slice(0, 3); 
}

// NEW: Function to find exactly what is causing the error
export function findConflictDetails(coursesInCart, preferences) {
  // We will check every pair of courses to see if they clash
  for (let i = 0; i < coursesInCart.length; i++) {
    for (let j = i + 1; j < coursesInCart.length; j++) {
      const courseA = coursesInCart[i];
      const courseB = coursesInCart[j];
      
      const sectionsA = preferences[courseA.code] === 'AUTO' ? courseA.sections : courseA.sections.filter(s => s.sectionId === preferences[courseA.code]);
      const sectionsB = preferences[courseB.code] === 'AUTO' ? courseB.sections : courseB.sections.filter(s => s.sectionId === preferences[courseB.code]);

      for (let secA of sectionsA) {
        for (let secB of sectionsB) {
          for (let t1 of secA.times) {
            for (let t2 of secB.times) {
              if (t1.day === t2.day && t1.start < t2.end && t2.start < t1.end) {
                // Found a clash!
                const dayName = t1.day;
                const timeStr = `${t1.start} - ${t2.end}`; // Simplified time for display
                return `Conflict between ${courseA.code} (${secA.sectionId}) and ${courseB.code} (${secB.sectionId}) on ${dayName}.`;
              }
            }
          }
        }
      }
    }
  }
  return "Unknown conflict. Please check your selections.";
}