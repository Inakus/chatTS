import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import AuthForm from './components/AuthForm';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import CreateChatModal from './components/CreateChatModal';

interface Message {
  id: number;
  content: string;
  userId: number;
  chatId: number;
  createdAt: string;
  username: string;
}

interface User {
  id: number;
  username: string;
  email: string;
}

interface Chat {
  id: number;
  name: string | null;
  type: 'direct' | 'group';
  createdAt: string;
  createdBy: number;
  participants: User[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Load auth state from localStorage on app start
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('authUser');
    if (token && user) {
      try {
        return {
          user: JSON.parse(user),
          token,
          isAuthenticated: true,
        };
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
    return {
      user: null,
      token: null,
      isAuthenticated: false,
    };
  });
  const [isConnected, setIsConnected] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
    currentPassword: '',
    newPassword: '',
  });
  const [authError, setAuthError] = useState('');
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [createChatForm, setCreateChatForm] = useState({
    name: '',
    participantUsernames: '',
    type: 'direct' as 'direct' | 'group',
  });


  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleAuth = async () => {
    setAuthError('');

    if (authMode === 'register') {
      if (!authForm.username || !authForm.email || !authForm.password) {
        setAuthError('All fields are required');
        return;
      }
    } else {
      if (!authForm.email || !authForm.password) {
        setAuthError('Email and password are required');
        return;
      }
    }

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = authMode === 'register'
        ? { username: authForm.username, email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password };

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        const newAuthState = {
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        };
        setAuthState(newAuthState);

        // Save to localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));

        // Load chats
        await loadChats(data.token);
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (error) {
      setAuthError('Network error. Please try again.');
      console.error('Auth error:', error);
    }
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !authState.user || !socket || !authState.token || !selectedChat) return;

    socket.emit('sendMessage', {
      content: currentMessage.trim(),
      chatId: selectedChat.id,
      userId: authState.user.id,
      token: authState.token,
    });

    setCurrentMessage('');
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');

    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    setChats([]);
    setSelectedChat(null);
    setMessages([]);
    setAuthForm({
      username: '',
      email: '',
      password: '',
      currentPassword: '',
      newPassword: '',
    });
  };

  const handleDeleteAccount = async () => {
    if (!authState.token) return;

    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (response.ok) {
        handleLogout();
        alert('Account deleted successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete account');
      }
    } catch (error) {
      alert('Network error. Please try again.');
      console.error('Delete account error:', error);
    }
  };

  const handleChangePassword = async () => {
    if (!authState.token || !authForm.currentPassword || !authForm.newPassword) {
      setAuthError('All fields are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify({
          currentPassword: authForm.currentPassword,
          newPassword: authForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthForm({ ...authForm, currentPassword: '', newPassword: '' });
        setShowAccountSettings(false);
        alert('Password changed successfully');
      } else {
        setAuthError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setAuthError('Network error. Please try again.');
      console.error('Change password error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadChats = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const chatsData = await response.json();
        setChats(chatsData);
      }
    } catch (error) {
      console.error('Load chats error:', error);
    }
  };

  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setMessages([]);

    if (socket) {
      // Leave previous chat if any
      if (selectedChat) {
        socket.emit('leaveChat', selectedChat.id);
      }
      // Join new chat
      socket.emit('joinChat', chat.id);
    }

    // Load messages for this chat
    if (authState.token) {
      try {
        const response = await fetch(`http://localhost:3000/api/messages/${chat.id}`, {
          headers: {
            'Authorization': `Bearer ${authState.token}`,
          },
        });
        if (response.ok) {
          const chatMessages = await response.json();
          setMessages(chatMessages);
        }
      } catch (error) {
        console.error('Load messages error:', error);
      }
    }
  };

  const createChat = async () => {
    if (!authState.token) return;

    const usernames = createChatForm.participantUsernames.split(',').map(u => u.trim()).filter(u => u);
    if (usernames.length === 0) {
      setAuthError('At least one participant is required');
      return;
    }

    // For direct chats, only one username should be provided
    if (createChatForm.type === 'direct' && usernames.length !== 1) {
      setAuthError('Direct messages require exactly one username');
      return;
    }

    try {
      // Get all users to find IDs by username
      const usersResponse = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
        },
      });

      if (!usersResponse.ok) {
        setAuthError('Failed to load users');
        return;
      }

      const allUsers = await usersResponse.json();

      // Find user IDs for the provided usernames
      const participantIds: number[] = [];
      for (const username of usernames) {
        const user = allUsers.find((u: User) => u.username === username);
        if (!user) {
          setAuthError(`User "${username}" not found`);
          return;
        }
        participantIds.push(user.id);
      }

      const response = await fetch('http://localhost:3000/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify({
          name: createChatForm.name || null,
          participantIds,
          type: createChatForm.type,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadChats(authState.token);
        setShowCreateChat(false);
        setCreateChatForm({ name: '', participantUsernames: '', type: 'direct' });
      } else {
        setAuthError(data.error || 'Failed to create chat');
      }
    } catch (error) {
      setAuthError('Network error. Please try again.');
      console.error('Create chat error:', error);
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.id !== authState.user?.id);
      return otherParticipant ? otherParticipant.username : 'Direct Chat';
    }
    return 'Group Chat';
  };

  if (!authState.isAuthenticated) {
    return (
      <AuthForm
        onAuth={handleAuth}
        authMode={authMode}
        setAuthMode={setAuthMode}
        isConnected={isConnected}
        error={authError}
      />
    );
  }

  return (
    <div className="h-screen flex">
      <ChatList
        chats={chats}
        selectedChat={selectedChat}
        onSelectChat={selectChat}
        onCreateChat={() => setShowCreateChat(true)}
        user={authState.user}
        isConnected={isConnected}
      />

      <ChatWindow
        selectedChat={selectedChat}
        messages={messages}
        currentMessage={currentMessage}
        onMessageChange={setCurrentMessage}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
        user={authState.user}
      />

      <CreateChatModal
        isOpen={showCreateChat}
        onClose={() => setShowCreateChat(false)}
        onCreateChat={createChat}
        error={authError}
      />

      {showAccountSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Account Settings</h3>

            <div className="mb-5">
              <h4 className="text-base font-semibold mb-2">Change Password</h4>
              <input
                type="password"
                placeholder="Current Password"
                value={authForm.currentPassword}
                onChange={(e) => setAuthForm({ ...authForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 mb-2 border border-gray-300 rounded"
              />
              <input
                type="password"
                placeholder="New Password"
                value={authForm.newPassword}
                onChange={(e) => setAuthForm({ ...authForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 mb-2 border border-gray-300 rounded"
              />
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-green-500 text-white border-none rounded cursor-pointer mr-2 hover:bg-green-600"
              >
                Change Password
              </button>
            </div>

            <div className="mb-5">
              <h4 className="text-base font-semibold mb-2">Logout</h4>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-yellow-500 text-white border-none rounded cursor-pointer hover:bg-yellow-600"
              >
                Logout
              </button>
            </div>

            <div>
              <h4 className="text-base font-semibold mb-2">Delete Account</h4>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-500 text-white border-none rounded cursor-pointer hover:bg-red-600"
              >
                Delete Account
              </button>
            </div>

            {authError && (
              <div className="text-red-500 mt-4 text-sm">{authError}</div>
            )}

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowAccountSettings(false);
                  setAuthError('');
                }}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
