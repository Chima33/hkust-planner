import React, { useState, useRef } from 'react';
import { Search, Plus, Trash2, Calendar, AlertCircle, Clock, MapPin, User, Upload, Download, FileImage, FileText, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import coursesData from './data/courses.json'; 
import { generateBestSchedules, findConflictDetails } from './utils/optimizer';

const PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-500' },
  { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-500' },
  { bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-500' },
  { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-500' },
  { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-500' },
  { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-500' },
];

const getCourseStyle = (code) => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

// Helper to convert "14:30" to 14.5
const convertTimeToDecimal = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
};

export default function App() {
  // Initialize courses from JSON, but allow adding more
  const [allCourses, setAllCourses] = useState(coursesData);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedSchedules, setGeneratedSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [preferences, setPreferences] = useState({});
  
  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const timetableRef = useRef(null);

  // New Course Form State
  const [newCourse, setNewCourse] = useState({
    code: '', name: '', credits: 3, instructor: '',
    sections: [{ sectionId: '', times: [{ day: 'MO', start: '09:00', end: '10:20', room: '' }] }]
  });

  const filteredCourses = allCourses.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (course) => {
    if (!cart.find(c => c.code === course.code)) {
      setCart([...cart, course]);
      setPreferences({ ...preferences, [course.code]: 'AUTO' });
      setErrorMsg('');
    }
  };

  const removeFromCart = (code) => {
    setCart(cart.filter(c => c.code !== code));
    setErrorMsg('');
  };

  const handlePreferenceChange = (code, value) => {
    setPreferences({ ...preferences, [code]: value });
    setErrorMsg('');
  };

  const handleGenerate = () => {
    const best = generateBestSchedules(cart, preferences);
    if (best.length === 0) {
      const conflictDetails = findConflictDetails(cart, preferences);
      setErrorMsg(`Schedule Conflict: ${conflictDetails}`);
      setGeneratedSchedules([]);
    } else {
      setErrorMsg('');
      setGeneratedSchedules(best);
      setActiveTab(0);
    }
  };

  // --- Add Course Logic ---
  const handleAddSection = () => {
    setNewCourse({ ...newCourse, sections: [...newCourse.sections, { sectionId: '', times: [{ day: 'MO', start: '09:00', end: '10:20', room: '' }] }] });
  };

  const handleAddTimeSlot = (sectionIndex) => {
    const updatedSections = [...newCourse.sections];
    updatedSections[sectionIndex].times.push({ day: 'MO', start: '09:00', end: '10:20', room: '' });
    setNewCourse({ ...newCourse, sections: updatedSections });
  };

  const updateSectionId = (index, value) => {
    const updatedSections = [...newCourse.sections];
    updatedSections[index].sectionId = value;
    setNewCourse({ ...newCourse, sections: updatedSections });
  };

  const updateTimeSlot = (sectionIndex, timeIndex, field, value) => {
    const updatedSections = [...newCourse.sections];
    updatedSections[sectionIndex].times[timeIndex][field] = value;
    setNewCourse({ ...newCourse, sections: updatedSections });
  };

  const removeTimeSlot = (sectionIndex, timeIndex) => {
    const updatedSections = [...newCourse.sections];
    updatedSections[sectionIndex].times.splice(timeIndex, 1);
    setNewCourse({ ...newCourse, sections: updatedSections });
  };

  const submitNewCourse = () => {
    if (!newCourse.code || !newCourse.name) {
      alert("Please fill in Course Code and Name.");
      return;
    }

    // Format times to decimal
    const formattedSections = newCourse.sections.map(sec => ({
      sectionId: sec.sectionId || 'L1',
      times: sec.times.map(t => ({
        day: t.day,
        start: convertTimeToDecimal(t.start),
        end: convertTimeToDecimal(t.end),
        room: t.room
      }))
    }));

    const courseToAdd = {
      code: newCourse.code.toUpperCase(),
      name: newCourse.name,
      credits: parseInt(newCourse.credits) || 3,
      instructor: newCourse.instructor || 'TBA',
      sections: formattedSections
    };

    setAllCourses([...allCourses, courseToAdd]);
    setShowAddModal(false);
    setNewCourse({ code: '', name: '', credits: 3, instructor: '', sections: [{ sectionId: '', times: [{ day: 'MO', start: '09:00', end: '10:20', room: '' }] }] });
    alert("Course added successfully! You can now search for it.");
  };

  // --- Export Logic ---
  const exportAsPNG = async () => {
    const element = timetableRef.current;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `hkust-timetable-option-${activeTab + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportAsPDF = async () => {
    const element = timetableRef.current;
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape A4
    const imgWidth = 270;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    pdf.addImage(imgData, 'PNG', 15, 15, imgWidth, imgHeight);
    pdf.save(`hkust-timetable-option-${activeTab + 1}.pdf`);
  };

  const timeSlots = [];
  for (let i = 0; i <= 24; i++) timeSlots.push(8 + i * 0.5);

  const formatTime = (decimalTime) => {
    const h = Math.floor(decimalTime);
    const m = Math.round((decimalTime % 1) * 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-lg shadow-md">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">HKUST Planner</h1>
              <p className="text-xs text-slate-500 font-medium">Fall 2026 • Timetable Optimizer</p>
            </div>
          </div>
          {cart.length > 0 && (
            <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {cart.reduce((sum, c) => sum + c.credits, 0)} Credits Selected
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 mb-6 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Conflict Detected</p>
              <p className="text-sm mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Search & Add */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" /> Course Catalog
              </h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by code or name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <button 
                onClick={() => setShowAddModal(true)}
                className="w-full mb-6 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100"
              >
                <Plus className="w-4 h-4" /> Add New Course Manually
              </button>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {filteredCourses.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No courses found.</p>
                ) : (
                  filteredCourses.map(course => {
                    const isAdded = cart.find(c => c.code === course.code);
                    return (
                      <div key={course.code} className="group bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 p-3 rounded-xl transition-all duration-200 hover:shadow-md">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{course.code}</span>
                            <span className="text-xs text-slate-500 ml-2">{course.credits} Units</span>
                          </div>
                          <button 
                            onClick={() => addToCart(course)}
                            disabled={isAdded}
                            className={`p-1.5 rounded-lg transition-all ${isAdded ? 'bg-green-100 text-green-600 cursor-default' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                          >
                            {isAdded ? <Plus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{course.name}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Cart & Preferences */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" /> My Schedule
                </h2>
                {cart.length > 0 && (
                  <button 
                    onClick={() => { setCart([]); setPreferences({}); setErrorMsg(''); }} 
                    className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Your schedule is empty</p>
                  <p className="text-xs text-slate-400 mt-1">Add courses from the catalog to get started.</p>
                </div>
              ) : (
                <ul className="space-y-3 mb-6">
                  {cart.map(course => {
                    const style = getCourseStyle(course.code);
                    const uniqueRooms = [...new Set(course.sections.flatMap(s => s.times.map(t => t.room)))].join(', ');
                    return (
                      <li key={course.code} className={`bg-slate-50 p-4 rounded-xl border-l-4 ${style.border} border-y border-r border-slate-200`}>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-900">{course.code}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{course.credits} UNITS</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-snug">{course.name}</p>
                          </div>
                          <button onClick={() => removeFromCart(course.code)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5"><User className="w-3 h-3" /> {course.instructor || 'TBA'}</div>
                          <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {uniqueRooms}</div>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                          <Clock className="w-4 h-4 text-slate-400 ml-1" />
                          <select 
                            value={preferences[course.code] || 'AUTO'}
                            onChange={(e) => handlePreferenceChange(course.code, e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="AUTO">Auto-Optimize (Best Fit)</option>
                            {course.sections.map(sec => {
                              const timeStr = sec.times.map(t => `${t.day} ${formatTime(t.start)}-${formatTime(t.end)}`).join(', ');
                              return <option key={sec.sectionId} value={sec.sectionId}>{sec.sectionId} — {timeStr}</option>;
                            })}
                          </select>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              
              <button 
                onClick={handleGenerate}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3.5 rounded-xl font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-400 shadow-lg shadow-indigo-500/20 disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" /> Generate Optimized Timetable
              </button>
            </div>

            {/* Timetable Display */}
            {generatedSchedules.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <h2 className="text-lg font-semibold text-slate-900">Generated Options</h2>
                  <div className="flex gap-2 flex-wrap">
                    {generatedSchedules.map((sched, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveTab(idx)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === idx ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        Option {idx + 1}
                      </button>
                    ))}
                  </div>
                  {/* Export Buttons */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={exportAsPNG} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                      <FileImage className="w-4 h-4" /> PNG
                    </button>
                    <button onClick={exportAsPDF} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4" ref={timetableRef}>
                  <div className="grid grid-cols-6 gap-0 text-center text-xs min-w-[850px]">
                    <div className="font-semibold text-slate-400 py-3 text-[10px] uppercase tracking-wider">Time</div>
                    {["MO", "TU", "WE", "TH", "FR"].map(d => (
                      <div key={d} className="font-bold text-slate-700 py-3 border-b border-slate-200">{d}</div>
                    ))}
                    {timeSlots.map((hour, index) => (
                      <React.Fragment key={hour}>
                        <div className={`text-right pr-3 text-slate-400 font-medium text-[10px] ${index % 2 === 0 ? 'py-1' : 'h-10 flex items-end justify-end pb-1'}`}>
                          {index % 2 === 0 ? formatTime(hour) : ''}
                        </div>
                        {["MO", "TU", "WE", "TH", "FR"].map(day => {
                          const classesHere = generatedSchedules[activeTab].schedule.filter(c => c.times.some(t => t.day === day && t.start <= hour && t.end > hour));
                          const isStart = classesHere.some(c => c.times.find(t => t.day === day && t.start === hour));
                          return (
                            <div key={`${day}-${hour}`} className={`h-10 border-t border-slate-100 relative ${index % 2 === 0 ? 'border-slate-200' : ''}`}>
                              {isStart && classesHere.map(c => {
                                const t = c.times.find(t => t.day === day && t.start === hour);
                                const height = (t.end - t.start) * 5;
                                const style = getCourseStyle(c.code);
                                return (
                                  <div key={c.code} className={`absolute inset-x-1 ${style.bg} ${style.text} border-l-4 ${style.border} p-1.5 rounded-md shadow-sm overflow-hidden flex flex-col justify-center transition-transform hover:scale-[1.02]`} style={{ height: `${height}rem`, zIndex: 10 }}>
                                    <div className="font-bold text-[11px] leading-tight truncate">{c.code}</div>
                                    <div className="text-[9px] leading-tight opacity-80 truncate">{t.room}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Add New Course</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Course Code *</label>
                  <input type="text" value={newCourse.code} onChange={(e) => setNewCourse({...newCourse, code: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. COMP 102" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Credits</label>
                  <input type="number" value={newCourse.credits} onChange={(e) => setNewCourse({...newCourse, credits: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Course Name *</label>
                <input type="text" value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Introduction to Computer Science" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Instructor</label>
                <input type="text" value={newCourse.instructor} onChange={(e) => setNewCourse({...newCourse, instructor: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. Prof. Smith" />
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-slate-800">Sections (Lectures/Tutorials)</h4>
                  <button onClick={handleAddSection} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg hover:bg-indigo-100">+ Add Section</button>
                </div>
                
                {newCourse.sections.map((section, sIdx) => (
                  <div key={sIdx} className="bg-slate-50 p-4 rounded-xl mb-3 border border-slate-200">
                    <div className="flex gap-4 mb-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Section ID</label>
                        <input type="text" value={section.sectionId} onChange={(e) => updateSectionId(sIdx, e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="e.g. L1 or T1" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-slate-700">Time Slots</label>
                        <button onClick={() => handleAddTimeSlot(sIdx)} className="text-xs text-indigo-600 hover:text-indigo-800">+ Add Time</button>
                      </div>
                      {section.times.map((time, tIdx) => (
                        <div key={tIdx} className="grid grid-cols-5 gap-2 items-end bg-white p-2 rounded-lg border border-slate-200">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Day</label>
                            <select value={time.day} onChange={(e) => updateTimeSlot(sIdx, tIdx, 'day', e.target.value)} className="w-full p-1 border rounded text-xs">
                              {['MO','TU','WE','TH','FR'].map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Start</label>
                            <input type="time" value={time.start} onChange={(e) => updateTimeSlot(sIdx, tIdx, 'start', e.target.value)} className="w-full p-1 border rounded text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">End</label>
                            <input type="time" value={time.end} onChange={(e) => updateTimeSlot(sIdx, tIdx, 'end', e.target.value)} className="w-full p-1 border rounded text-xs" />
                          </div>
                          <div className="col-span-1">
                            <label className="block text-[10px] text-slate-500 mb-1">Room</label>
                            <input type="text" value={time.room} onChange={(e) => updateTimeSlot(sIdx, tIdx, 'room', e.target.value)} className="w-full p-1 border rounded text-xs" placeholder="Rm 1234" />
                          </div>
                          <div className="flex justify-center">
                            <button onClick={() => removeTimeSlot(sIdx, tIdx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
              <button onClick={submitNewCourse} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">Save Course</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}