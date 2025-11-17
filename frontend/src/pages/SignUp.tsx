import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';

function SignUp() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (data: { email: string; password: string; username?: string }) => {
    setError('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register'
        ? { username: data.username, email: data.email, password: data.password }
        : { email: data.email, password: data.password };

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        // Save to localStorage
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('authUser', JSON.stringify(result.user));

        // Navigate to chat
        navigate('/chat');
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Auth error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            ChatApp
          </Link>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Create your account and start chatting instantly.</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <AuthForm
            onAuth={handleAuth}
            authMode={authMode}
            setAuthMode={setAuthMode}
            isConnected={true}
            error={error}
            showModeToggle={false}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <Link to="/signin" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
