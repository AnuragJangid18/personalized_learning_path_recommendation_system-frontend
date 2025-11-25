import { useAuth } from '../contexts/AuthContext';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import { useNavigate } from 'react-router-dom';

export default function AuthPage({ mode = 'login' }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // When user switches tab, update route
  const switchMode = (m) => {
    navigate(m === 'register' ? '/register' : '/login');
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <h2 className="text-2xl font-bold text-primary">Welcome!</h2>
          <p className="text-textLight">You're already logged in as:</p>
          <div className="font-semibold">{user.email}</div>
          <a href="#/" className="inline-block sv-btn-primary">Back to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              mode === 'login'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-textDark hover:bg-slate-200'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              mode === 'register'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-textDark hover:bg-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {mode === 'login' ? <Login /> : <Register />}

        <div className="mt-6 pt-4 border-t text-center text-sm text-textLight">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => switchMode('register')} className="text-primary hover:underline">
                Register here
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-primary hover:underline">
                Login here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
