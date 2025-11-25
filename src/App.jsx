import { useMemo, useRef, useState, useEffect } from "react";
import Header from "./components/Header";
import Tabs from "./components/Tabs";
import Skeleton from "./components/Skeleton";
import ProgressChart from "./components/ProgressChart";
import ProfileForm from "./components/ProfileForm";
import CheckpointPanel from './components/CheckpointPanel';
import { useAuth } from './contexts/AuthContext';
import api, { setAuthToken } from './lib/api';

const TAB_KEYS = {
  PATH: "learning-path",
  LESSON: "current-lesson",
  WHY: "explanation",
};

export default function App() {
  const { user, token } = useAuth();
  const [active, setActive] = useState(TAB_KEYS.PATH);

  // student/profile
  const [student, setStudent] = useState(null);

  // learning path & lesson
  const [learningPath, setLearningPath] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lesson, setLesson] = useState(null); // { overview, prerequisites[], keyPoints[], resources[], quiz }

  // quiz
  const [quiz, setQuiz] = useState(null);

  // UI states
  const [loadingPath, setLoadingPath] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [pendingProfileUpdate, setPendingProfileUpdate] = useState(null);

  // Dashboard info from backend
  const [confidence, setConfidence] = useState(0.82);
  const [serverSeries, setServerSeries] = useState(null);

  // "RL-ish" log + stats
  const [qState, setQState] = useState("New Learner");
  const qlogRef = useRef([]);
  const [stats, setStats] = useState({ interactions: 0, correct: 0 });

  const accuracy = useMemo(
    () => (stats.interactions ? ((stats.correct / stats.interactions) * 100).toFixed(1) : 0),
    [stats]
  );

  // Initialize auth token on app load
  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  // When an authenticated user exists, fetch their linked student profile
  useEffect(() => {
    async function fetchStudent() {
      if (!user?.studentId) return;
      try {
        const res = await api.get(`/student/${user.studentId}`);
        setStudent(res.data);
        // fetch their progress and dashboard
        await loadProgress(res.data.id);
        await loadDashboard();
      } catch (e) {
        console.error('Failed to fetch student profile', e);
      }
    }

    fetchStudent();
  }, [user]);

  function qlog(entry) {
    qlogRef.current = [entry, ...qlogRef.current].slice(0, 7);
  }

  // load dashboard (uses student.id or user.studentId)
  async function loadDashboard(studentId = null) {
    const idToUse = studentId || student?.id || user?.studentId;
    if (!idToUse) return;
    try {
      const { data } = await api.get(`/dashboard/${idToUse}`);
      setConfidence(data.confidence ?? 0.82);
      setServerSeries(data.series ?? null);
    } catch (e) {
      console.error('loadDashboard failed', e);
    }
  }

  // load progress for the student (completed list)
  async function loadProgress(studentId) {
    if (!studentId) return;
    try {
      const { data } = await api.get(`/progress/${studentId}`);
      setCompleted(data.completedList || []);
      // also update quick stats with validation
      setStats({ 
        interactions: Math.max(0, data.interactions || 0), 
        correct: Math.max(0, Math.min(data.correct || 0, data.interactions || 0))
      });
    } catch (e) {
      console.error("loadProgress failed", e);
      // Only reset if it's not a 404 (student might not have progress yet)
      if (e.response?.status !== 404) {
        setCompleted([]);
        setStats({ interactions: 0, correct: 0 });
      }
    }
  }

  // Reset all frontend state and backend progress
  async function resetFrontendState() {
    const studentIdToReset = student?.id || user?.studentId;
    
    try {
      // Reset backend progress first if student exists
      if (studentIdToReset) {
        console.log('Resetting progress for student:', studentIdToReset);
        console.log('API URL:', api.defaults.baseURL);
        const response = await api.post(`/progress/reset`, { studentId: studentIdToReset });
        console.log('Backend reset response:', response.data);
      } else {
        console.warn('No student ID available for reset - skipping backend reset');
      }
    } catch (err) {
      console.error('Error resetting backend progress:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        studentId: studentIdToReset
      });
      
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message;
      const backendUrl = api.defaults.baseURL || 'backend (unknown URL)';
      alert(`Failed to reset progress on server: ${errorMsg}\n\nPlease make sure the backend is reachable at ${backendUrl}`);
      throw err; // Stop the regeneration if backend reset fails
    }
    
    // Reset all frontend state
    setCompleted([]);
    setStats({ interactions: 0, correct: 0 });
    setCurrentLesson(null);
    setLesson(null);
    setQuiz(null);
    setQuizAnswered(false);
    setSelectedAnswer(null);
    setLearningPath([]);
    
    // Reset RL state
    setQState("New Learner");
    qlogRef.current = [];
    
    // Reset dashboard
    setConfidence(0.82);
    setServerSeries(null);
    
    // Go back to learning path tab
    setActive(TAB_KEYS.PATH);
    
    return studentIdToReset;
  }
  
  // Handle regenerate confirmation
  function handleRegenerateRequest(formData) {
    console.log('Regenerate request:', { 
      formData, 
      hasStudent: !!student, 
      studentId: student?.id,
      hasUser: !!user,
      userId: user?.studentId
    });
    
    // Check if there's existing progress to warn about
    const hasProgress = completed.length > 0 || stats.interactions > 0;
    
    if (hasProgress) {
      // Show confirmation dialog
      setPendingProfileUpdate(formData);
      setShowRegenerateConfirm(true);
    } else {
      // No progress, proceed directly
      executeProfileUpdate(formData);
    }
  }
  
  // Confirm regenerate and reset
  async function confirmRegenerate() {
    setShowRegenerateConfirm(false);
    if (pendingProfileUpdate) {
      try {
        console.log('Starting regeneration with student:', student?.id, 'user:', user?.studentId);
        
        // Only reset if there's an existing student profile
        if (student?.id || user?.studentId) {
          await resetFrontendState();
        } else {
          console.log('No existing student profile - skipping reset');
          // Just reset frontend state without backend call
          setCompleted([]);
          setStats({ interactions: 0, correct: 0 });
          setCurrentLesson(null);
          setLesson(null);
          setQuiz(null);
          setQuizAnswered(false);
          setSelectedAnswer(null);
          setLearningPath([]);
          setQState("New Learner");
          qlogRef.current = [];
          setConfidence(0.82);
          setServerSeries(null);
          setActive(TAB_KEYS.PATH);
        }
        
        // Then execute profile update
        await executeProfileUpdate(pendingProfileUpdate);
        setPendingProfileUpdate(null);
      } catch (err) {
        console.error('Regeneration failed:', err);
        setPendingProfileUpdate(null);
      }
    }
  }
  
  // Cancel regenerate
  function cancelRegenerate() {
    setShowRegenerateConfirm(false);
    setPendingProfileUpdate(null);
  }

  // Create/Update profile + fetch learning path (renamed from handleCreateOrUpdateProfile)
  async function executeProfileUpdate({ name, level, subject, style, goal }) {
    // Validate inputs
    if (!name?.trim()) {
      alert('Name is required');
      return;
    }
    
    try {
      setSubmittingProfile(true);

      let profileRes;
      
      // If user is authenticated, use their linked student ID
      if (user?.studentId) {
        // Update existing student profile via backend
        profileRes = await api.post(`/profile`, {
          name: name.trim(), 
          level, 
          subject, 
          style, 
          goal, 
          id: user.studentId
        });
        setStudent(profileRes.data);
      } else {
        // Create new student profile (guest mode)
        profileRes = await api.post(`/profile`, {
          name: name.trim(), 
          level, 
          subject, 
          style, 
          goal,
        });
        setStudent(profileRes.data);
      }

      setLoadingPath(true);
      
      // Use RL-based recommended path if user/student ID is available
      const studentIdToUse = user?.studentId || profileRes?.data?.id;
      let pathRes;
      
      if (studentIdToUse) {
        try {
          pathRes = await api.get(`/learning-path/recommended`, {
            params: { studentId: studentIdToUse },
          });
        } catch (err) {
          console.warn('Recommended path failed, falling back to standard path:', err);
          pathRes = await api.get(`/learning-path`, {
            params: { subject, level },
          });
        }
      } else {
        // Fallback to standard path for guest users
        pathRes = await api.get(`/learning-path`, {
          params: { subject, level },
        });
      }

      const items = pathRes.data?.items || pathRes.data || [];
      setLearningPath(Array.isArray(items) ? items : []);
      setCurrentLesson(null);
      
      // Get the correct student ID (profile update returns updated student)
      const studentIdForProgress = user?.studentId || profileRes?.data?.id || student?.id;
      
      // Fetch student's persisted progress and dashboard
      if (studentIdForProgress) {
        await loadProgress(studentIdForProgress);
        await loadDashboard(studentIdForProgress);
      }
      
      setActive(TAB_KEYS.PATH);
    } catch (err) {
      console.error(err);
      const backendUrl = api.defaults.baseURL || 'backend (unknown URL)';
      alert(`Could not connect to backend. Make sure the backend is reachable at ${backendUrl}`);
    } finally {
      setSubmittingProfile(false);
      setLoadingPath(false);
    }
  }
  // snapshotProvider returns the object to save
function snapshotProvider() {
  return {
    student,         // student's profile object in state
    completed,       // completed array
    stats,           // stats object
    currentLesson,   // currentLesson string
    lesson,          // lesson object (overview/prereqs/etc)
    learningPath,    // full learning path array
    qState,          // RL algorithm state string
    qlog: qlogRef.current // RL log history
  };
}

function handleRestore(snapshot) {
  // Carefully overwrite frontend state to restore checkpoint
  if (snapshot.student) setStudent(snapshot.student);
  if (Array.isArray(snapshot.completed)) setCompleted(snapshot.completed);
  if (snapshot.stats) setStats(snapshot.stats);
  if (Array.isArray(snapshot.learningPath)) setLearningPath(snapshot.learningPath);
  if (typeof snapshot.qState === 'string') setQState(snapshot.qState);
  if (Array.isArray(snapshot.qlog)) qlogRef.current = snapshot.qlog;
  if (snapshot.currentLesson) {
    // optionally fetch lesson details again from server or set local state
    startLesson(snapshot.currentLesson);
  } else {
    setCurrentLesson(null);
    setLesson(null);
  }
  // Sync restored progress to backend
  if (snapshot.student?.id && Array.isArray(snapshot.completed)) {
    api.post(`/progress`, {
      studentId: snapshot.student.id,
      // Backend will merge these stats
    }).catch(err => console.error('Failed to sync restored progress', err));
  }
}

  // helper: check if prerequisites of a course are satisfied by completed list
  function prerequisitesMet(course) {
    const prereqs = course.prerequisites || [];
    if (!prereqs.length) return true;
    return prereqs.every(p => completed.includes(p));
  }

  // Start lesson — fetch lesson and quiz; also show missing prereqs in the lesson view
  async function startLesson(courseName) {
    setActive(TAB_KEYS.LESSON);
    setCurrentLesson(courseName);
    setLoadingQuiz(true);
    setQuizAnswered(false); // Reset quiz state for new lesson
    setSelectedAnswer(null); // Reset selected answer
    try {
      const { data } = await api.get(`/lesson/${encodeURIComponent(courseName)}`);
      setLesson(data || null);
      setQuiz(data?.quiz || null);
    } catch (e) {
      console.error("startLesson failed", e);
      setLesson(null);
      setQuiz(null);
    } finally {
      setLoadingQuiz(false);
    }
  }

  // Quiz answer logic (with backend logging)
  function selectOption(i) {
    if (!quiz || quizAnswered) return; // Prevent multiple answers
    
    const correct = i === quiz.correct;
    setQuizAnswered(true);
    setSelectedAnswer(i);

    setStats(s => ({
      interactions: s.interactions + 1,
      correct: s.correct + (correct ? 1 : 0)
    }));

    const reward = correct ? 1.0 : -0.5;
    const nextState = correct ? "Advanced" : "Struggling";
    qlog({ state: qState, action: "Recommend Standard Content", reward });
    setQState(nextState);

    // Persist on backend (increment interactions/correct)
    if (student?.id) {
      api.post(`/progress`, {
        studentId: student.id,
        answered: 1,
        wasCorrect: correct ? 1 : 0
      }).catch(err => {
        console.error('Failed to save quiz answer:', err);
      });
      // refresh quick progress numbers (non-blocking)
      loadProgress(student.id).catch(err => {
        console.error('Failed to refresh progress:', err);
      });
    }
  }

  // Complete lesson — persist and refresh progress + dashboard
  async function completeLesson() {
    if (!student || !currentLesson) {
      alert("You need a profile to save progress.");
      return;
    }
    
    // Check if already completed
    if (completed.includes(currentLesson)) {
      alert("This lesson is already completed!");
      setActive(TAB_KEYS.PATH);
      return;
    }
    
    try {
      await api.post(`/progress`, {
        studentId: student.id,
        courseName: currentLesson,
        answered: 0,
        wasCorrect: 0
      });
      // refresh completed list from server to keep single source of truth
      await loadProgress(student.id);
      await loadDashboard();
      // UI update - reset quiz state for next lesson
      setQuizAnswered(false);
      setSelectedAnswer(null);
      setActive(TAB_KEYS.PATH);
    } catch (e) {
      console.error("completeLesson failed", e);
      const errorMsg = e.response?.data?.error || "Could not save progress. Ensure backend is running.";
      alert(errorMsg);
    }
  }

  // Progress Dashboard calculations (memoized for performance)
  const totalLessons = useMemo(() => learningPath.length, [learningPath]);
  const completedLessons = useMemo(() => completed.length, [completed]);
  
  // Progress: percent of completed lessons (max 100)
  const progressPct = useMemo(() => {
    return totalLessons ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;
  }, [totalLessons, completedLessons]);
  
  // Engagement: percent of lessons attempted (completed or started)
  const engagementPct = useMemo(() => {
    return totalLessons ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;
  }, [totalLessons, completedLessons]);
  
  // Performance: percent correct answers for attempted lessons (if tracked)
  const performancePct = useMemo(() => {
    return stats.interactions > 0 ? Math.min(100, Number(accuracy)) : 0;
  }, [stats.interactions, accuracy]);

  // Build progress/performance history for chart (starts at 0 for new users)
  // Shows incremental progress as lessons are completed
  const progressHistory = useMemo(() => {
    const history = [0]; // Start at 0
    if (totalLessons > 0 && completedLessons > 0) {
      // Add a point for each completed lesson
      for (let i = 1; i <= completedLessons; i++) {
        history.push(Math.min(100, Math.round((i / totalLessons) * 100)));
      }
    }
    return history;
  }, [totalLessons, completedLessons]);

  // Build performance history showing accuracy improvement over time
  // Simulates incremental improvement based on current performance
  const performanceHistory = useMemo(() => {
    const history = [0]; // Start at 0
    if (completedLessons > 0 && stats.interactions > 0) {
      const currentPerf = Number(accuracy);
      
      // Simulate gradual improvement curve toward current performance
      for (let i = 1; i <= completedLessons; i++) {
        // Early lessons: lower performance, gradually improving
        const progressRatio = i / completedLessons;
        
        // Use a sigmoid-like curve for realistic learning progression
        // Early stage: 40-60% of final performance
        // Mid stage: 70-85% of final performance  
        // Late stage: 90-100% of final performance
        let performanceMultiplier;
        if (progressRatio < 0.3) {
          // Early stage: 40-60% performance
          performanceMultiplier = 0.4 + (progressRatio / 0.3) * 0.2;
        } else if (progressRatio < 0.7) {
          // Mid stage: 60-85% performance
          performanceMultiplier = 0.6 + ((progressRatio - 0.3) / 0.4) * 0.25;
        } else {
          // Late stage: 85-100% performance
          performanceMultiplier = 0.85 + ((progressRatio - 0.7) / 0.3) * 0.15;
        }
        
        const estimatedPerf = Math.round(currentPerf * performanceMultiplier);
        history.push(Math.min(100, Math.max(0, estimatedPerf)));
      }
    }
    return history;
  }, [completedLessons, stats.interactions, accuracy]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 text-slate-800 relative">
      {/* Animated background pattern */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>
      
      <Header />

      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-8 grid gap-6 lg:grid-cols-[1fr_2fr_1fr] relative z-10">
        {/* LEFT: Profile */}
        <section className="sv-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-xl font-semibold text-primary flex items-center gap-2">
              <span>👤</span>
              <span>Student Profile</span>
            </h3>
            {student && (
              <div className="text-xs text-white bg-green-600 px-3 py-1 rounded-full font-medium">
                ✓ Active
              </div>
            )}
          </div>

          <ProfileForm
            initial={
              student
                ? {
                    name: student.name,
                    level: student.level,
                    subject: student.subject,
                    style: student.style,
                    goal: student.goal,
                  }
                : null
            }
            onSubmit={handleRegenerateRequest}
            loading={submittingProfile}
          />

          {student && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2 text-primary">
                  <span>🧠</span>
                  <span>RL Algorithm</span>
                </h4>
                {qlogRef.current.length > 0 && (
                  <div className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium">
                    {qlogRef.current.length} updates
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {/* Current State Card */}
                <div className="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-600 font-medium">Current State</div>
                    <div className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                      qState === 'Master' ? 'bg-green-100 text-green-700' :
                      qState === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                      qState === 'Advanced' ? 'bg-purple-100 text-purple-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {qState === 'Master' ? '⭐ Elite' :
                       qState === 'Advanced' ? '🚀 Advanced' :
                       qState === 'Intermediate' ? '📈 Growing' :
                       '🌱 Learning'}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-purple-700">{qState}</div>
                </div>

                {/* Performance Metrics */}
                {stats.interactions > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-lg p-2 border border-purple-100 text-center">
                      <div className="text-xs text-slate-600 mb-1">Quizzes</div>
                      <div className="text-lg font-bold text-purple-700">{stats.interactions}</div>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-purple-100 text-center">
                      <div className="text-xs text-slate-600 mb-1">Correct</div>
                      <div className="text-lg font-bold text-green-600">{stats.correct}</div>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-purple-100 text-center">
                      <div className="text-xs text-slate-600 mb-1">Rate</div>
                      <div className={`text-lg font-bold ${
                        accuracy >= 80 ? 'text-green-600' :
                        accuracy >= 60 ? 'text-blue-600' :
                        'text-orange-600'
                      }`}>
                        {accuracy}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Learning Updates History */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <span>📊</span>
                      <span>Recent Updates</span>
                    </div>
                    {qlogRef.current.length > 0 && (
                      <div className="text-[9px] text-slate-500">
                        Latest {Math.min(7, qlogRef.current.length)} shown
                      </div>
                    )}
                  </div>
                  
                  {qlogRef.current.length === 0 ? (
                    <div className="bg-white rounded-lg p-4 border border-purple-100 text-center">
                      <div className="text-2xl mb-2">💡</div>
                      <div className="text-xs text-slate-600 font-medium mb-1">
                        No learning data yet
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Complete quizzes to train the RL algorithm!
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                      {qlogRef.current.map((e, idx) => {
                        const isPositive = e.reward >= 0;
                        const rewardLevel = e.reward >= 0.7 ? 'high' : e.reward >= 0.4 ? 'medium' : e.reward >= 0 ? 'low' : 'negative';
                        
                        return (
                          <div key={idx} className="bg-white rounded-lg p-2 border border-purple-100 animate-fade-in hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] text-slate-500 mb-0.5">State Transition</div>
                                <div className="text-xs font-medium text-slate-800 truncate">{e.state}</div>
                              </div>
                              <div className={`text-[9px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                                isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {isPositive ? '✓' : '✗'} {e.reward >= 0 ? '+' : ''}{e.reward.toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="text-[10px] text-slate-500">Action:</div>
                              <div className="text-[11px] font-medium text-blue-600 truncate flex-1">{e.action}</div>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                rewardLevel === 'high' ? 'bg-green-500' :
                                rewardLevel === 'medium' ? 'bg-blue-500' :
                                rewardLevel === 'low' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Reward Legend */}
                {qlogRef.current.length > 0 && (
                  <div className="bg-white rounded-lg p-2 border border-purple-100">
                    <div className="text-[9px] text-slate-600 font-semibold mb-1.5">Reward Scale</div>
                    <div className="grid grid-cols-4 gap-1 text-[9px]">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span className="text-slate-600">High</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-slate-600">Good</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                        <span className="text-slate-600">Fair</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        <span className="text-slate-600">Poor</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* CENTER: Tabs */}
        <section className="sv-card">
          <div className="border-b border-slate-200 pb-3 mb-4">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
              <span>🎓</span>
              <span>Learning Center</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Your personalized learning journey</p>
          </div>
          <Tabs
            active={active}
            onChange={setActive}
            tabs={[
              { id: TAB_KEYS.PATH, label: "📚 Learning Path" },
              { id: TAB_KEYS.LESSON, label: "📖 Current Lesson" },
              { id: TAB_KEYS.WHY, label: "🤔 Why This Path?" },
            ]}
          />

          {/* Learning Path */}
          {active === TAB_KEYS.PATH && (
            <div className="mt-4 px-6 pb-6">
              {student && (
                <div className="mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🎯</span>
                        <span className="text-sm font-semibold text-primary">Personalized Path</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Adapted to your {student.level} level, {student.subject.replace('_', ' ')} focus, and {student.style} style
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        setLoadingPath(true);
                        try {
                          const studentIdToUse = user?.studentId || student?.id;
                          if (studentIdToUse) {
                            // First, fetch the latest student profile to ensure we have current preferences
                            const studentRes = await api.get(`/student/${studentIdToUse}`);
                            const latestStudent = studentRes.data;
                            
                            // Update student state with latest profile data
                            setStudent(latestStudent);
                            
                            // Now get the recommended path with latest student preferences
                            const pathRes = await api.get(`/learning-path/recommended`, {
                              params: { studentId: studentIdToUse },
                            });
                            const items = pathRes.data?.items || pathRes.data || [];
                            setLearningPath(Array.isArray(items) ? items : []);
                            
                            // Also refresh progress and dashboard
                            await loadProgress(studentIdToUse);
                            await loadDashboard();
                          }
                        } catch (err) {
                          console.error('Refresh failed:', err);
                          alert('Failed to refresh learning path. Please try again.');
                        } finally {
                          setLoadingPath(false);
                        }
                      }}
                      disabled={loadingPath}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                    >
                      {loadingPath ? (
                        <>
                          <span className="animate-spin">🔄</span>
                          <span>Refreshing...</span>
                        </>
                      ) : (
                        <>
                          <span>🔄</span>
                          <span>Refresh</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              {loadingPath && <Skeleton lines={4} />}
              {!loadingPath && learningPath.length === 0 && (
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-6 border border-slate-200 text-center">
                  <div className="text-4xl mb-3">{student ? '🔍' : '👤'}</div>
                  <div className="text-sm font-semibold text-slate-700 mb-2">
                    {student ? 'No Courses Found' : 'Profile Required'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {student ? 'Try adjusting your preferences or refresh the path.' : 'Create your profile to generate a personalized learning path!'}
                  </div>
                </div>
              )}
              <ul className="flex flex-col gap-3">
                {learningPath.map((course, index) => {
                  const isCompleted = completed.includes(course.name);
                  const met = prerequisitesMet(course);
                  const isLocked = !met;
                  
                  const difficultyColors = {
                    1: 'bg-green-100 text-green-700',
                    2: 'bg-blue-100 text-blue-700',
                    3: 'bg-orange-100 text-orange-700',
                    4: 'bg-red-100 text-red-700'
                  };

                  const base = "sv-course animate-fade-in w-full transition-all duration-200";
                  const variant = isCompleted
                    ? "sv-course--completed"
                    : (!isLocked && !isCompleted)
                    ? "sv-course--current"
                    : "";

                  return (
                    <li key={course.name} className="w-full">
                      <button
                        disabled={isLocked}
                        onClick={() => startLesson(course.name)}
                        className={[
                          base, variant,
                          isLocked ? "opacity-60 cursor-not-allowed" : "hover:shadow-lg hover:-translate-y-1 hover:z-10"
                        ].join(" ")}
                        style={{ textAlign: 'left' }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Course Number Badge */}
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isCompleted ? 'bg-green-600 text-white' :
                            isLocked ? 'bg-gray-300 text-gray-600' :
                            'bg-blue-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          
                          {/* Course Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-textDark truncate">{course.name}</div>
                              <div className="flex-shrink-0 text-lg">
                                {isCompleted ? '✅' : !isLocked ? '▶️' : '🔒'}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${difficultyColors[course.difficulty] || difficultyColors[2]}`}>
                                Level {course.difficulty}/4
                              </span>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-600 flex items-center gap-1">
                                <span>⏱️</span>
                                <span>{course.duration}</span>
                              </span>
                              {isCompleted && (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-green-600 font-medium">Completed</span>
                                </>
                              )}
                            </div>
                            
                            {course.prerequisites?.length > 0 && (
                              <div className="text-xs mt-2 text-slate-500 flex items-start gap-1">
                                <span className="flex-shrink-0">🔗</span>
                                <span className="truncate">Prereqs: {course.prerequisites.join(", ")}</span>
                              </div>
                            )}
                            
                            {(!isLocked && !isCompleted) && (
                              <div className="mt-3 sv-progress">
                                <div className="sv-fill" style={{ width: '0%' }} />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Current Lesson */}
          {active === TAB_KEYS.LESSON && (
            <div className="mt-4 space-y-4 px-6 pb-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📖</span>
                  <div>
                    <div className="text-xs text-slate-600 font-medium">Current Lesson</div>
                    <div className="text-sm font-bold text-primary">{currentLesson || "No lesson selected"}</div>
                  </div>
                </div>
              </div>

              {loadingQuiz ? (
                <Skeleton lines={6} />
              ) : (
                <>
                  {/* Overview */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 space-y-2">
                    <h5 className="font-semibold flex items-center gap-2 text-primary">
                      <span>📋</span>
                      <span>Overview</span>
                    </h5>
                    <p className="text-sm text-slate-700">{lesson?.overview || "Select a lesson to see its overview."}</p>
                  </div>

                  {/* Prerequisites + Key Points */}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <h5 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                        <span>🔐</span>
                        <span>Prerequisites</span>
                      </h5>
                      <ul className="space-y-2">
                        {(lesson?.prerequisites || ["No formal prerequisites listed"]).map((p, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <span className="text-lg">{completed.includes(p) ? '✅' : '🔒'}</span>
                            <span className={completed.includes(p) ? 'text-green-600 font-medium' : 'text-slate-600'}>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                      <h5 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                        <span>💡</span>
                        <span>Key Points</span>
                      </h5>
                      <ul className="space-y-2">
                        {(lesson?.keyPoints || ["Key takeaways will appear here"]).map((k, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-blue-500 flex-shrink-0 mt-0.5">▸</span>
                            <span>{k}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Resources */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <h5 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                      <span>📚</span>
                      <span>Learning Resources</span>
                    </h5>
                    {(lesson?.resources && lesson.resources.length > 0) ? (
                      <ul className="space-y-2">
                        {lesson.resources.map((r, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-green-600">🔗</span>
                            <a className="text-sm text-blue-600 hover:text-blue-800 underline font-medium" target="_blank" rel="noreferrer" href={r.url}>
                              {r.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-600 italic">Additional resources will be added soon.</p>
                    )}
                  </div>

                  {/* Quiz */}
                  {quiz ? (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🎯</span>
                          <h5 className="font-bold text-primary">Knowledge Check</h5>
                        </div>
                        {quizAnswered && (
                          <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                            selectedAnswer === quiz.correct 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedAnswer === quiz.correct ? '✓ Correct!' : '✗ Incorrect'}
                          </div>
                        )}
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-yellow-200">
                        <div className="text-sm font-semibold text-slate-800">{quiz.question}</div>
                      </div>
                      <div className="grid gap-2">
                        {quiz.options.map((opt, i) => {
                          const isSelected = selectedAnswer === i;
                          const isCorrect = i === quiz.correct;
                          const showResult = quizAnswered;
                          
                          let buttonClass = "border-2 border-slate-200 rounded-lg p-3 text-left transition-all text-sm font-medium ";
                          
                          if (!showResult) {
                            buttonClass += "hover:border-blue-400 hover:bg-blue-50 cursor-pointer";
                          } else {
                            if (isSelected && isCorrect) {
                              buttonClass += "border-green-500 bg-green-50 text-green-800";
                            } else if (isSelected && !isCorrect) {
                              buttonClass += "border-red-500 bg-red-50 text-red-800";
                            } else if (isCorrect) {
                              buttonClass += "border-green-400 bg-green-50 text-green-800";
                            } else {
                              buttonClass += "opacity-50 cursor-not-allowed";
                            }
                          }
                          
                          return (
                            <button
                              key={i}
                              onClick={() => selectOption(i)}
                              disabled={quizAnswered}
                              className={buttonClass}
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  <span className="text-slate-500 mr-2 font-bold">{String.fromCharCode(65 + i)}.</span>
                                  {opt}
                                </span>
                                {showResult && isCorrect && (
                                  <span className="text-green-600 text-lg">✓</span>
                                )}
                                {showResult && isSelected && !isCorrect && (
                                  <span className="text-red-600 text-lg">✗</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      
                      {quizAnswered && (
                        <div className={`rounded-lg p-3 text-sm ${
                          selectedAnswer === quiz.correct
                            ? 'bg-green-100 border border-green-300 text-green-800'
                            : 'bg-blue-100 border border-blue-300 text-blue-800'
                        }`}>
                          {selectedAnswer === quiz.correct ? (
                            <div className="flex items-start gap-2">
                              <span className="text-lg">🎉</span>
                              <div>
                                <div className="font-semibold mb-1">Great job!</div>
                                <div className="text-xs">You answered correctly. Click below to complete this lesson.</div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <span className="text-lg">💡</span>
                              <div>
                                <div className="font-semibold mb-1">Keep learning!</div>
                                <div className="text-xs">The correct answer is highlighted in green. Review the material and try the next lesson.</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <button 
                          onClick={completeLesson} 
                          disabled={!quizAnswered} 
                          className="sv-btn-accent w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>✓</span>
                          <span>{quizAnswered ? 'Complete Lesson' : 'Answer the quiz first'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-slate-50 to-gray-100 border-2 border-slate-200 rounded-xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">✍️</span>
                        <h5 className="font-bold text-primary">Practice Exercise</h5>
                      </div>
                      <p className="text-sm text-slate-700 mb-4">
                        Apply what you've learned with a hands-on exercise, then mark this lesson complete.
                      </p>
                      <button onClick={completeLesson} className="sv-btn-accent w-full flex items-center justify-center gap-2">
                        <span>✓</span>
                        <span>Mark as Complete</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Why This Path */}
          {active === TAB_KEYS.WHY && (
            <div className="mt-4 space-y-4 px-6 pb-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🧠</span>
                    <h4 className="font-bold text-primary">Your Learning Stats</h4>
                  </div>
                  <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-bold">Confidence: {confidence.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <div className="text-xs text-slate-600 mb-1">Learning State</div>
                    <div className="text-sm font-bold text-indigo-700">{qState}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-100">
                    <div className="text-xs text-slate-600 mb-1">Quiz Accuracy</div>
                    <div className={`text-sm font-bold ${
                      accuracy >= 80 ? 'text-green-600' :
                      accuracy >= 60 ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>{accuracy}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-xl p-5">
                <h4 className="font-bold text-primary flex items-center gap-2 mb-3">
                  <span>🤔</span>
                  <span>Why This Learning Path?</span>
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Based on your profile and performance, the system uses a <span className="font-semibold text-blue-600">reinforcement learning algorithm</span> to recommend
                  an optimal sequence that balances difficulty, retention, and engagement.
                </p>
                <div className="mt-4 grid gap-2">
                  <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <span className="text-lg flex-shrink-0">🎯</span>
                    <div>
                      <div className="font-semibold text-blue-700 text-sm">Personalized</div>
                      <div className="text-xs text-slate-600 mt-0.5">Adapts to your skill level, learning style, and goals</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                    <span className="text-lg flex-shrink-0">📊</span>
                    <div>
                      <div className="font-semibold text-green-700 text-sm">Data-Driven</div>
                      <div className="text-xs text-slate-600 mt-0.5">Uses your performance to optimize the learning sequence</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <span className="text-lg flex-shrink-0">🧠</span>
                    <div>
                      <div className="font-semibold text-purple-700 text-sm">Retention-Focused</div>
                      <div className="text-xs text-slate-600 mt-0.5">Maximizes long-term retention through smart spacing</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <span className="text-lg flex-shrink-0">⚡</span>
                    <div>
                      <div className="font-semibold text-orange-700 text-sm">Engagement-Oriented</div>
                      <div className="text-xs text-slate-600 mt-0.5">Maintains motivation through varied challenges</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-pink-50 p-3 rounded-lg border border-pink-200">
                    <span className="text-lg flex-shrink-0">🏆</span>
                    <div>
                      <div className="font-semibold text-pink-700 text-sm">Goal-Aligned</div>
                      <div className="text-xs text-slate-600 mt-0.5">Tailored to achieve your learning objectives efficiently</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-xl p-5">
                <h4 className="font-bold text-primary flex items-center gap-2 mb-3">
                  <span>⚙️</span>
                  <span>How It Works: RL Recommendation Algorithm</span>
                </h4>
                <p className="text-sm text-slate-700 mb-4">
                  The system intelligently scores each lesson using a <span className="font-semibold text-blue-600">5-factor algorithm</span>:
                </p>
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="font-bold text-sm flex items-center gap-2 text-blue-800 mb-2">
                      <span className="text-xl">📊</span>
                      <span>Performance Analysis</span>
                      <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">40%</span>
                    </div>
                    <p className="text-xs text-textLight mt-1">
                      {accuracy > 80 
                        ? "Your high accuracy means the system suggests more challenging content to accelerate your learning."
                        : accuracy < 50 
                        ? "The system is recommending easier lessons to help build your foundation and confidence."
                        : "You're progressing steadily. The system balances difficulty to maintain optimal challenge."}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-500">
                    <div className="font-bold text-sm flex items-center gap-2 text-purple-800 mb-2">
                      <span className="text-xl">🎯</span>
                      <span>Learning Style Match</span>
                      <span className="ml-auto text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">20%</span>
                    </div>
                    <p className="text-xs text-textLight mt-1">
                      {student?.style === 'visual' 
                        ? "Prioritizing lessons with visual elements like Computer Vision and image processing."
                        : student?.style === 'theoretical'
                        ? "Focusing on theory-heavy lessons with mathematical foundations and algorithms."
                        : student?.style === 'hands-on'
                        ? "Emphasizing practical, high-effort lessons with real implementations."
                        : "Balanced approach considering your auditory learning preference."}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-500">
                    <div className="font-bold text-sm flex items-center gap-2 text-green-800 mb-2">
                      <span className="text-xl">🎓</span>
                      <span>Goal Alignment</span>
                      <span className="ml-auto text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">20%</span>
                    </div>
                    <p className="text-xs text-textLight mt-1">
                      {student?.goal === 'Career' 
                        ? "Prioritizing career-oriented lessons like software engineering, web development, and cloud computing."
                        : student?.goal === 'Research'
                        ? "Focusing on research-oriented topics like advanced ML, optimization, and theoretical foundations."
                        : "Balanced curriculum covering both practical skills and theoretical knowledge."}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border-l-4 border-orange-500">
                    <div className="font-bold text-sm flex items-center gap-2 text-orange-800 mb-2">
                      <span className="text-xl">🚀</span>
                      <span>Engagement Optimization</span>
                      <span className="ml-auto text-xs bg-orange-600 text-white px-2 py-0.5 rounded-full">10%</span>
                    </div>
                    <p className="text-xs text-textLight mt-1">
                      {completedLessons < totalLessons * 0.3
                        ? "Early stage: suggesting easier lessons to build momentum and confidence."
                        : completedLessons > totalLessons * 0.7
                        ? "Advanced stage: introducing challenging lessons to maintain engagement."
                        : "Mid-journey: balancing difficulty to maintain steady progress."}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border-l-4 border-red-500">
                    <div className="font-bold text-sm flex items-center gap-2 text-red-800 mb-2">
                      <span className="text-xl">🔐</span>
                      <span>Prerequisite Management</span>
                      <span className="ml-auto text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">10%</span>
                    </div>
                    <p className="text-xs text-textLight mt-1">
                      Ensures you have the necessary foundation before tackling advanced topics.
                      Prerequisites are strictly enforced to maintain learning quality.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Progress Dashboard & Checkpoints */}
        <section className="sv-card space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-xl font-medium text-primary flex items-center gap-2">
              <span>📊</span>
              <span>Progress Dashboard</span>
            </h3>
            {completedLessons > 0 && (
              <div className="text-xs text-textLight bg-slate-50 px-3 py-1 rounded-full">
                {completedLessons}/{totalLessons} lessons
              </div>
            )}
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Stat 
              icon="✅" 
              label="Completed" 
              value={completedLessons}
              color="success"
              subtitle={totalLessons > 0 ? `of ${totalLessons} lessons` : 'Start learning!'}
            />
            <Stat 
              icon="📈" 
              label="Progress" 
              value={`${progressPct}%`}
              color={progressPct >= 75 ? 'success' : progressPct >= 50 ? 'info' : 'warning'}
              subtitle={progressPct >= 75 ? 'Excellent!' : progressPct >= 50 ? 'Keep going!' : 'Just started'}
            />
            <Stat 
              icon="⚡" 
              label="Engagement" 
              value={`${engagementPct}%`}
              color={engagementPct >= 70 ? 'success' : engagementPct >= 40 ? 'info' : 'warning'}
              subtitle={engagementPct >= 70 ? 'Very active' : engagementPct >= 40 ? 'Good pace' : 'Get started'}
            />
            <Stat 
              icon="🎯" 
              label="Accuracy" 
              value={stats.interactions > 0 ? `${performancePct}%` : 'N/A'}
              color={performancePct >= 80 ? 'success' : performancePct >= 60 ? 'info' : 'warning'}
              subtitle={stats.interactions > 0 ? `${stats.correct}/${stats.interactions} correct` : 'No quizzes yet'}
            />
          </div>

          {/* Learning Insights */}
          {completedLessons > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💡</span>
                <span className="font-medium text-primary">Learning Insights</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-2 border border-blue-100">
                  <div className="font-medium text-slate-700">Average Score</div>
                  <div className="text-lg font-medium text-blue-600">{performancePct}%</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-blue-100">
                  <div className="font-medium text-slate-700">Quiz Attempts</div>
                  <div className="text-lg font-medium text-blue-600">{stats.interactions}</div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-blue-100 col-span-2">
                  <div className="font-medium text-slate-700 mb-1">Learning Streak</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg">🔥</div>
                    <div className="text-sm text-slate-600">
                      {completedLessons >= 10 ? 'Amazing progress!' : completedLessons >= 5 ? 'Building momentum!' : 'Keep learning!'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="h-[22rem] md:h-[20rem] lg:h-[18rem]">
            <ProgressChart
              progressHistory={progressHistory}
              performanceHistory={performanceHistory}
            />
          </div>
          
          {completedLessons > 0 && (
            <div className="text-xs text-textLight bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-primary">📈 Chart Guide</span>
              </div>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span><span className="font-medium text-slate-700">Blue line:</span> Learning progress ({completedLessons}/{totalLessons} lessons)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span><span className="font-medium text-green-600">Green line:</span> Quiz accuracy over time</span>
                </li>
                <li className="text-slate-600 ml-5">• Each point represents a completed lesson milestone</li>
              </ul>
            </div>
          )}

          <hr className="my-4 border-t border-borderLight" />
          <h3 className="text-xl font-medium text-primary border-b pb-2">Save Progress</h3>
          {user ? (
            <div className="mt-3">
              <CheckpointPanel snapshotProvider={snapshotProvider} onRestore={handleRestore} />
            </div>
          ) : (
            <div className="text-sm text-textLight mt-3 p-3 bg-slate-50 rounded">
              Login to use Save / Restore checkpoints
            </div>
          )}
        </section>
      </div>
      
      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white mt-12 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Column 1: Project Info - Left aligned */}
            <div className="md:justify-self-start max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎓</span>
                <h3 className="font-bold text-lg text-white">Learning Path System</h3>
              </div>
              <p className="text-sm text-white leading-relaxed">
                An intelligent recommendation system using reinforcement learning to create personalized learning paths tailored to individual student needs.
              </p>
            </div>
            
            {/* Column 2: Features - Center aligned */}
            <div className="md:justify-self-center">
              <div className="flex items-center gap-2 mb-3">
                <span>✨</span>
                <h3 className="font-bold text-lg text-white">Key Features</h3>
              </div>
              <ul className="space-y-2 text-sm text-white">
                <li className="flex items-center gap-2">
                  <span className="text-white">•</span>
                  <h3 className="text-sm text-white">Adaptive Learning Paths</h3>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-white">•</span>
                  <h3 className="text-sm text-white">Real-time Progress Tracking</h3>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-white">•</span>
                  <h3 className="text-sm text-white">RL-based Recommendations</h3>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-white">•</span>
                  <h3 className="text-sm text-white">Interactive Quizzes</h3>
                </li>
              </ul>
            </div>
            
            {/* Column 3: Institute Info - Right aligned */}
            <div className="md:justify-self-end">
              <div className="flex items-center gap-2 mb-3">
                <span>🏫</span>
                <h3 className="font-bold text-lg text-white">Institution</h3>
              </div>
              <div className="space-y-2 text-sm text-white">
                <div>
                  <div className="font-semibold text-white">Sai Vidya Institute of Technology</div>
                  <div className="text-xs text-white mt-0.5">Bangalore, Karnataka</div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <div className="text-xs font-semibold text-cyan-400">Mini Project - BCI568</div>
                  <div className="text-xs text-white mt-0.5">Department of Computer Science & Engineering</div>
                  <div className="text-xs text-white">Specialization: AI & ML</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="border-t border-slate-700 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-xs text-white">© {new Date().getFullYear()} SVIT - All rights reserved.</h3>
            </div>
            <div className="flex items-center gap-6 text-sm text-white">
              <div className="flex items-center gap-2">
                <span className="text-green-400">•</span>
                <span className="text-white">System Status: <span className="text-green-400 font-medium">Active</span></span>
              </div>
              <div className="text-xs">
                <span className="text-white">Powered by</span>
                <span className="text-cyan-400 font-medium ml-1">React + Node.js</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-2 border-orange-200 animate-scale-in relative">
            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-bl-full opacity-50"></div>
            
            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-5">
                <div className="bg-orange-100 p-3 rounded-xl">
                  <span className="text-4xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-primary mb-1">Regenerate Learning Path?</h3>
                  <p className="text-sm text-slate-600">This action will reset all your current progress</p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-5 mb-5 shadow-inner">
                <div className="text-sm text-orange-900 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-orange-700">
                    <span className="text-lg">⚡</span>
                    <span>Warning: This will permanently reset:</span>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                      <span className="font-semibold">Completed lessons:</span>
                      <span className="ml-auto bg-orange-200 px-2 py-0.5 rounded font-bold">{completed.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                      <span className="font-semibold">Quiz attempts:</span>
                      <span className="ml-auto bg-orange-200 px-2 py-0.5 rounded font-bold">{stats.interactions}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                      <span className="font-semibold">Correct answers:</span>
                      <span className="ml-auto bg-green-200 px-2 py-0.5 rounded font-bold">{stats.correct}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
                      <span className="font-semibold">RL algorithm state</span>
                    </div>
                  </div>
                  <p className="text-xs italic bg-white/30 p-2 rounded border-l-2 border-orange-400">
                    💡 <span className="font-medium">Note:</span> Your profile changes will be saved, but learning progress will be cleared.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelRegenerate}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200 border-2 border-slate-200 hover:border-slate-300 flex items-center justify-center gap-2 hover:shadow-md"
                >
                  <span>❌</span>
                  <span>Cancel</span>
                </button>
                <button
                  onClick={confirmRegenerate}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <span>🔄</span>
                  <span>Reset & Continue</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, color = 'primary', subtitle }) {
  const colorClasses = {
    primary: 'text-primary bg-blue-50 border-blue-200',
    success: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-orange-600 bg-orange-50 border-orange-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200'
  };
  
  const iconBgClasses = {
    primary: 'bg-blue-100',
    success: 'bg-green-100',
    warning: 'bg-orange-100',
    info: 'bg-blue-100'
  };
  
  return (
    <div className={`text-center p-3 rounded-xl border-2 ${colorClasses[color]} group hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-default`}>
      {icon && (
        <div className={`text-2xl mb-1.5 inline-block p-1.5 rounded-lg ${iconBgClasses[color]}`}>
          {icon}
        </div>
      )}
      <div className={`text-2xl font-medium mb-1 ${colorClasses[color].split(' ')[0]}`}>{value}</div>
      <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">{label}</div>
      {subtitle && <div className="text-[9px] text-slate-500 mt-0.5 italic">{subtitle}</div>}
    </div>
  );
}
