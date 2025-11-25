import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
}

interface Message {
  id: number;
  content: string;
  userId: number;
  chatId: number;
  createdAt: string;
  username: string;
  mediaUrl?: string;
  mediaType?: string;
  deleted?: boolean;
  deletedAt?: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'messages'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadMessages();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/signin');
        return;
      }

      const response = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
      });

      if (response.status === 403) {
        setError('Admin access required');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      setError('Failed to load users');
      console.error('Load users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/signin');
        return;
      }

      const response = await fetch('http://localhost:3000/api/admin/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
      });

      if (response.status === 403) {
        setError('Admin access required');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      setMessages(data);
    } catch (error) {
      setError('Failed to load messages');
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBanUser = async (userId: number, currentlyBanned: boolean) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
        body: JSON.stringify({ banned: !currentlyBanned }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      // Refresh users list
      loadUsers();
    } catch (error) {
      setError('Failed to update user status');
      console.error('Toggle ban error:', error);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`http://localhost:3000/api/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      // Refresh messages list
      loadMessages();
    } catch (error) {
      setError('Failed to delete message');
      console.error('Delete message error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mt-4 space-x-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-t-lg font-medium ${
                activeTab === 'users'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 rounded-t-lg font-medium ${
                activeTab === 'messages'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Messages
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">ID</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Username</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Role</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-200 dark:border-gray-600">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.id}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.username}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{user.email}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white capitalize">{user.role}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.isBanned
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          }`}>
                            {user.isBanned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => toggleBanUser(user.id, user.isBanned)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              user.isBanned
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                          >
                            {user.isBanned ? 'Unban' : 'Ban'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Message Moderation</h3>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">{message.username}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Chat #{message.chatId}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{message.content}</p>
                        {message.mediaUrl && (
                          <div className="mt-2">
                            <img
                              src={`http://localhost:3000${message.mediaUrl}`}
                              alt="Message media"
                              className="max-w-xs max-h-32 rounded border"
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="ml-4 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
