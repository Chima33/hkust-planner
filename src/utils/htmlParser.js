export function parseHKUSTTable(htmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const rows = doc.querySelectorAll('table tr');
  const courses = [];
  let currentCourse = null;

  rows.forEach((row, index) => {
    const cells = row.querySelectorAll('td, th');
    const text = Array.from(cells).map(cell => cell.textContent.trim());
    
    // Detect course header (e.g., "LIFS 3110- Biotechnological...")
    const courseMatch = text[0]?.match(/^([A-Z]+\s+\d+)\s*-\s*(.+?)\s*\((\d+)\s*units?\)/i);
    
    if (courseMatch) {
      if (currentCourse) {
        courses.push(currentCourse);
      }
      currentCourse = {
        code: courseMatch[1].trim(),
        name: courseMatch[2].trim(),
        credits: parseInt(courseMatch[3]),
        instructor: '',
        sections: []
      };
    } else if (currentCourse && text.length >= 4) {
      // Parse section row
      const sectionId = text[0];
      const dateTime = text[1];
      const room = text[2];
      const instructor = text[3];
      
      if (sectionId && dateTime) {
        // Parse date/time
        const times = parseDateTime(dateTime);
        
        // Find or create section
        let section = currentCourse.sections.find(s => s.sectionId === sectionId);
        if (!section) {
          section = { sectionId, times: [], room: '' };
          currentCourse.sections.push(section);
        }
        
        if (times.length > 0) {
          section.times = times;
          section.room = room;
        }
        
        if (instructor && instructor !== 'TBA') {
          currentCourse.instructor = instructor.split('\n')[0];
        }
      }
    }
  });
  
  if (currentCourse) {
    courses.push(currentCourse);
  }
  
  return courses;
}

function parseDateTime(dateTimeStr) {
  const times = [];
  const dayMap = {
    'Mo': 'MO', 'Tu': 'TU', 'We': 'WE', 'Th': 'TH', 'Fr': 'FR',
    'Monday': 'MO', 'Tuesday': 'TU', 'Wednesday': 'WE', 
    'Thursday': 'TH', 'Friday': 'FR'
  };
  
  // Match patterns like "MoWe 12:00PM-01:20PM" or "Tu 02:00PM-05:50PM"
  const regex = /([A-Za-z]{2,})(?:([A-Za-z]{2}))?\s+(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)/g;
  let match;
  
  while ((match = regex.exec(dateTimeStr)) !== null) {
    const day1 = dayMap[match[1]];
    const day2 = match[2] ? dayMap[match[2]] : null;
    const startTime = convertTime(match[3]);
    const endTime = convertTime(match[4]);
    
    if (day1) {
      times.push({ day: day1, start: startTime, end: endTime });
    }
    if (day2) {
      times.push({ day: day2, start: startTime, end: endTime });
    }
  }
  
  return times;
}

function convertTime(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})([AP]M)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours + (minutes / 60);
}