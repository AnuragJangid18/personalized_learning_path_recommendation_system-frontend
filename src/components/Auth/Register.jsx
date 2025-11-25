import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  function checkPasswordStrength(pwd) {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 4);
  }

  function handlePasswordChange(pwd) {
    setForm({...form, password: pwd});
    setPasswordStrength(checkPasswordStrength(pwd));
  }

  async function submit(e) {
    e.preventDefault();

    if (form.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await register({ ...form });
      setMessage('');
      setTimeout(() => window.location.href = '#/', 500);
    } catch (err) {
      // Prefer backend message, fallback to user-friendly default
      const msg = err?.response?.data?.message || err?.response?.data?.error || '';
      if (msg === 'Email already registered') {
        setMessage('This email is already registered. Please use a different email or log in.');
      } else if (msg) {
        setMessage(msg);
      } else {
        setMessage('Registration failed. Please try again.');
      }
    } finally { setBusy(false); }
  }

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-primary">Create Account</h3>
            <p className="text-xs text-slate-600">Join us and start your personalized learning journey</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="register-name" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span>👤</span>
            <span>Full Name</span>
          </label>
          <input 
            id="register-name"
            placeholder="Enter your full name" 
            value={form.name} 
            onChange={e=>setForm({...form,name:e.target.value})} 
            className="w-full border-2 border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 placeholder-slate-400 transition-all"
            required
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="register-email" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span>📧</span>
            <span>Email Address</span>
          </label>
          <input 
            id="register-email"
            type="email"
            placeholder="Enter your email" 
            value={form.email} 
            onChange={e=>setForm({...form,email:e.target.value})} 
            className="w-full border-2 border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 placeholder-slate-400 transition-all"
            required
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="register-password" className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <span>🔒</span>
            <span>Password</span>
            <span className="text-xs font-normal text-slate-500">(min. 6 characters)</span>
          </label>
          <div className="relative">
            <input 
              id="register-password"
              placeholder="Create a strong password" 
              type={showPassword ? 'text' : 'password'}
              value={form.password} 
              onChange={e=>handlePasswordChange(e.target.value)} 
              className="w-full border-2 border-slate-200 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 placeholder-slate-400 transition-all"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              <span className="text-lg">{showPassword ? '👁️' : '👁️‍🗨️'}</span>
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {form.password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                    i < passwordStrength ? strengthColors[passwordStrength] : 'bg-slate-200'
                  }`}></div>
                ))}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <span>Strength:</span>
                <span className={`font-semibold ${
                  passwordStrength === 4 ? 'text-green-600' :
                  passwordStrength === 3 ? 'text-lime-600' :
                  passwordStrength === 2 ? 'text-yellow-600' :
                  passwordStrength === 1 ? 'text-orange-600' :
                  'text-red-600'
                }`}>{strengthLabels[passwordStrength] || 'Very Weak'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {message && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-fade-in" aria-live="polite">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div>
                <div className="font-semibold text-red-800 text-sm">Registration Failed</div>
                <div className="text-sm text-red-700 mt-0.5">{message}</div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button 
          disabled={busy} 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <span className="animate-spin text-xl">🔄</span>
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <span>🎉</span>
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      {/* Info Footer */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg p-3 border border-slate-200">
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <span className="flex-shrink-0">🛡️</span>
          <span>By registering, you agree to our Terms of Service and Privacy Policy. Your data is encrypted and secure.</span>
        </div>
      </div>
    </div>
  );
}
