import { useState } from 'react';

interface AuthFormProps {
  onAuth: (data: { email: string; password: string; username?: string }) => void;
  authMode: 'login' | 'register';
  setAuthMode?: (mode: 'login' | 'register') => void;
  isConnected: boolean;
  error: string;
  showModeToggle?: boolean;
}

function AuthForm({ onAuth, authMode, setAuthMode, isConnected, error, showModeToggle = true }: AuthFormProps) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAuth(form);
  };

  return (
    <div className="max-w-sm mx-auto my-12 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Chat App</h1>

      <div className="mb-5">
        {showModeToggle && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAuthMode && setAuthMode('login')}
              className={`flex-1 px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-colors ${
                authMode === 'login'
                  ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode && setAuthMode('register')}
              className={`flex-1 px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-colors ${
                authMode === 'register'
                  ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Register
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {authMode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            required
          />

          {error && (
            <div className="text-red-500 mb-2 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 text-base bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            {authMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </div>

      <div className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
        {isConnected ? 'Connected to server' : 'Disconnected from server'}
      </div>
    </div>
  );
}

export default AuthForm;
