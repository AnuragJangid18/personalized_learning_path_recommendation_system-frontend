import { useEffect, useState } from "react";

export default function ProfileForm({ initial, onSubmit, loading }) {
  // initial = { name, level, subject, style, goal } or null
  const [editing, setEditing] = useState(!initial); // if no initial, start in edit mode
  const [form, setForm] = useState(
    initial || {
      name: "",
      level: "Intermediate",
      subject: "artificial_intelligence",
      style: "Visual Learner",
      goal: "career",
    }
  );

  // Error state for inline validation
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setForm(initial);
      setEditing(false);
    }
  }, [initial]);

  function update(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Please enter your name");
      return;
    }
    setError("");
    onSubmit(form);
  }

  if (!editing) {
    // VIEW MODE (enhanced card-based display)
    const subjectIcons = {
      artificial_intelligence: '🤖',
      computer_science: '💻',
      mathematics: '📊'
    };
    
    const styleIcons = {
      'Visual Learner': '👁️',
      'Auditory Learner': '👂',
      'Kinesthetic Learner': '✋',
      'Reading/Writing Learner': '📝'
    };
    
    const goalIcons = {
      career: '💼',
      academic: '🎓',
      personal: '❤️',
      certification: '🏆'
    };
    
    const levelColors = {
      Beginner: 'bg-green-50 text-green-700 border-green-200',
      Intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
      Advanced: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    
    return (
      <div className="space-y-3">
        {/* Name Card */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👤</span>
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wide">Student Name</div>
              <div className="text-lg font-bold text-primary">{form.name}</div>
            </div>
          </div>
        </div>
        
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Level */}
          <div className={`rounded-lg p-3 border ${levelColors[form.level] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-lg">🎯</span>
              <span className="text-[10px] uppercase tracking-wide font-semibold">Level</span>
            </div>
            <div className="text-sm font-bold">{form.level}</div>
          </div>
          
          {/* Subject */}
          <div className="bg-orange-50 text-orange-700 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-lg">{subjectIcons[form.subject] || '📚'}</span>
              <span className="text-[10px] uppercase tracking-wide font-semibold">Subject</span>
            </div>
            <div className="text-[11px] font-bold leading-tight">
              {form.subject === 'artificial_intelligence' ? 'AI' : 
               form.subject === 'computer_science' ? 'CS' : 'Math'}
            </div>
          </div>
        </div>
        
        {/* Learning Style */}
        <div className="bg-pink-50 text-pink-700 border border-pink-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{styleIcons[form.style] || '🎨'}</span>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wide font-semibold">Learning Style</div>
              <div className="text-sm font-bold">{form.style}</div>
            </div>
          </div>
        </div>
        
        {/* Goal */}
        <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{goalIcons[form.goal] || '🎯'}</span>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wide font-semibold">Learning Goal</div>
              <div className="text-sm font-bold capitalize">{form.goal.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="sv-btn-primary flex-1 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            onClick={() => onSubmit(form)}
            disabled={loading}
            aria-label="Regenerate Learning Path"
          >
            {loading ? <span className="animate-spin inline-block mr-1">🔄</span> : "🔄 Regenerate Path"}
          </button>
          <button
            type="button"
            className="sv-btn-accent focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            onClick={() => setEditing(true)}
            aria-label="Edit Profile"
          >
            ✏️ Edit
          </button>
        </div>
      </div>
    );
  }

  // EDIT MODE (enhanced form with icons)
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="profile-name" className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-1">
          <span>👤</span>
          <span>Name</span>
        </label>
        <input
          id="profile-name"
          className="w-full border border-[#e9ecef] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0A3041] bg-white text-black"
          placeholder="Enter your name"
          value={form.name}
          onChange={e => update("name", e.target.value)}
          aria-describedby={error ? 'profile-name-error' : undefined}
          disabled={loading}
        />
        {error && <div id="profile-name-error" className="text-xs text-red-600 mt-1">{error}</div>}
      </div>

      <div>
        <label htmlFor="profile-level" className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-1">
          <span>🎯</span>
          <span>Learning Level</span>
        </label>
        <select
          id="profile-level"
          className="w-full border border-[#e9ecef] rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#0A3041]"
          value={form.level}
          onChange={e => update("level", e.target.value)}
          disabled={loading}
        >
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>
      </div>

      <div>
        <label htmlFor="profile-subject" className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-1">
          <span>📚</span>
          <span>Subject Interest</span>
        </label>
        <select
          id="profile-subject"
          className="w-full border border-[#e9ecef] rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#0A3041]"
          value={form.subject}
          onChange={e => update("subject", e.target.value)}
          disabled={loading}
        >
          <option value="artificial_intelligence">Artificial Intelligence</option>
          <option value="computer_science">Computer Science</option>
          <option value="mathematics">Mathematics</option>
        </select>
      </div>

      <div>
        <label htmlFor="profile-style" className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-1">
          <span>🎨</span>
          <span>Learning Style</span>
        </label>
        <select
          id="profile-style"
          className="w-full border border-[#e9ecef] rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#0A3041]"
          value={form.style}
          onChange={e => update("style", e.target.value)}
          disabled={loading}
        >
          <option>Visual Learner</option>
          <option>Auditory Learner</option>
          <option>Kinesthetic Learner</option>
          <option>Reading/Writing Learner</option>
        </select>
      </div>

      <div>
        <label htmlFor="profile-goal" className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-1">
          <span>🎯</span>
          <span>Learning Goal</span>
        </label>
        <select
          id="profile-goal"
          className="w-full border border-[#e9ecef] rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#0A3041]"
          value={form.goal}
          onChange={e => update("goal", e.target.value)}
          disabled={loading}
        >
          <option value="career">Career Development</option>
          <option value="academic">Academic Excellence</option>
          <option value="personal">Personal Interest</option>
          <option value="certification">Certification Preparation</option>
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading} className="sv-btn-primary flex-1 focus:outline-none focus:ring-2 focus:ring-primary text-sm">
          {loading ? <span className="animate-spin inline-block mr-1">🔄</span> : "✨ Generate Path"}
        </button>
        <button
          type="button"
          className="sv-btn-accent focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          onClick={() => setEditing(false)}
          disabled={loading}
          aria-label="Cancel Edit"
        >
          ❌ Cancel
        </button>
      </div>
    </form>
  );
}
