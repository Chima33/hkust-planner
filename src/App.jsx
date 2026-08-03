import React, { useState } from 'react';
import { Search, Plus, Trash2, Calendar, AlertCircle, Clock, MapPin, User, Upload } from 'lucide-react';
import coursesData from './data/courses.json'; 
import { generateBestSchedules, findConflictDetails } from './utils/optimizer';
import { parseHKUSTTable } from './utils/htmlParser'; // NEW IMPORT

const PALETTE = [
  { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-500', btn: 'bg-blue-500 hover:bg-blue-600' },
  { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-500', btn: 'bg-emerald-500 hover:bg-emerald-600' },
  { bg: 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-500', btn: 'bg-violet-500 hover:bg-violet-600' },
  { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-500', btn: 'bg-amber-500 hover:bg-amber-600' },
  { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-500', btn: 'bg-rose-500 hover:bg-rose-600' },
  { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-500', btn: 'bg-cyan-500 hover:bg-cyan-600' },
];

const getCourseStyle = (code) => {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export default function App() {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatedSchedules, setGeneratedSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [preferences, setPreferences] = useState({});
  
  // NEW: State for the HTML Parser Modal
  const [showParser, setShowParser] = useState(false);
  const [htmlInput, setHtmlInput] = useState('');
  const [parseMsg, setParseMsg] = useState('');

  const filteredCourses = coursesData.filter(c => 
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

  // NEW: Handle the bulk import
  const handleBulkImport = () => {
    try {
      const parsed = parseHKUSTTable(htmlInput);
      if (parsed.length === 0) {
        setParseMsg('No courses found. Make sure you copied the HTML table correctly.');
      } else {
        setParseMsg(`Success! Parsed ${parsed.length} courses. (Note: To use them, you would need to save them to your courses.json file).`);
      }
    } catch (error) {
      setParseMsg('Error parsing HTML. Please check the format.');
    }
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

              {/* NEW: Bulk Import Button */}
              <button 
                onClick={() => { setShowParser(true); setParseMsg(''); }}
                className="w-full mb-6 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100"
              >
                <Upload className="w-4 h-4" /> Bulk Import from HKUST Website
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
                            <Plus className="w-4 h-4" />
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
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                {course.credits} UNITS
                              </span>
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
                              return (
                                <option key={sec.sectionId} value={sec.sectionId}>
                                  {sec.sectionId} — {timeStr}
                                </option>
                              );
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
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Generated Options</h2>
                  <div className="flex gap-2">
                    {generatedSchedules.map((sched, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveTab(idx)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          activeTab === idx ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Option {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto pb-4">
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
                          const classesHere = generatedSchedules[activeTab].schedule.filter(c => 
                            c.times.some(t => t.day === day && t.start <= hour && t.end > hour)
                          );
                          const isStart = classesHere.some(c => c.times.find(t => t.day === day && t.start === hour));
                          
                          return (
                            <div 
                              key={`${day}-${hour}`} 
                              className={`h-10 border-t border-slate-100 relative ${index % 2 === 0 ? 'border-slate-200' : ''}`}
                            >
                              {isStart && classesHere.map(c => {
                                const t = c.times.find(t => t.day === day && t.start === hour);
                                const height = (t.end - t.start) * 5;
                                const style = getCourseStyle(c.code);
                                return (
                                  <div 
                                    key={c.code} 
                                    className={`absolute inset-x-1 ${style.bg} ${style.text} border-l-4 ${style.border} p-1.5 rounded-md shadow-sm overflow-hidden flex flex-col justify-center transition-transform hover:scale-[1.02]`}
                                    style={{ height: `${height}rem`, zIndex: 10 }}
                                  >
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

      {/* NEW: Bulk Import Modal */}
      {showParser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" /> Bulk Import Courses
              </h3>
              <button onClick={() => setShowParser(false)} className="text-slate-400 hover:text-slate-600">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
              <p className="text-sm text-indigo-900 font-medium mb-2">How to use:</p>
              <ol className="text-xs text-indigo-800 space-y-1 list-decimal list-inside">
                <li>Go to the HKUST course catalog website.</li>
                <li>Highlight the course table, right-click, and select <strong>"Inspect"</strong>.</li>
                <li>Right-click the highlighted HTML table code and select <strong>"Copy" → "Copy outerHTML"</strong>.</li>
                <li>Paste it into the box below.</li>
              </ol>
            </div>

            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              className="w-full h-48 p-3 border border-slate-300 rounded-xl font-mono text-xs mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="<table>...</table>"
            />
            
            {parseMsg && (
              <div className={`p-3 rounded-lg text-sm mb-4 ${parseMsg.includes('Success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {parseMsg}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowParser(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkImport}
                disabled={!htmlInput}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:bg-slate-300 transition-colors"
              >
                Parse HTML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}