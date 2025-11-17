import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import CreateChatModal from '../components/CreateChatModal';
import AccountSettingsModal from '../components/AccountSettingsModal';

interface Message {
  id: number;
  content: string;
  userId: number;
  chatId: number;
  createdAt: string;
  username: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'gif';
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

function Chat() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [authState, setAuthState] = useState<{
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
  }>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showCreateChat, setShowCreateChat] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const selectedChatIdRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('authUser');

    if (!token || !user) {
      navigate('/signin');
      return;
    }

    try {
      const parsedUser = JSON.parse(user);
      setAuthState({
        user: parsedUser,
        token,
        isAuthenticated: true,
      });
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      navigate('/signin');
      return;
    }
  }, [navigate]);

  // Setup socket and load data when authenticated
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user || !authState.token) return;

    // Setup socket first
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Load chats with socket instance
    loadChats(authState.token, newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Authenticate socket with user ID once connected
      newSocket.emit('authenticate', authState.user!.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('newMessage', (message: Message) => {
      console.log('Received message:', message.chatId, 'Selected chat ID:', selectedChatIdRef.current);

      // If message is for the currently selected chat, show it immediately
      if (selectedChatIdRef.current && message.chatId === selectedChatIdRef.current) {
        console.log('Message for selected chat - adding to messages');
        // Check if message already exists to prevent duplicates
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
      }
    });

    newSocket.on('newChat', () => {
      // Reload chats when a new chat is created
      if (authState.token) {
        loadChats(authState.token);
      }
    });

    return () => {
      newSocket.close();
    };
  }, [authState.isAuthenticated, authState.user, authState.token]);

  // Update selected chat ID ref when selectedChat changes
  useEffect(() => {
    selectedChatIdRef.current = selectedChat?.id || null;
  }, [selectedChat]);

  // Handle socket connection after initial load
  useEffect(() => {
    if (socket && socket.connected && selectedChat) {
      // Join the selected chat room if socket just connected
      socket.emit('joinChat', selectedChat.id);
    }
  }, [socket?.connected, selectedChat]);

  const loadChats = async (token: string, socketInstance?: Socket) => {
    try {
      const response = await fetch('http://localhost:3000/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
      });
      if (response.ok) {
        const chatsData = await response.json();

        setChats(chatsData);

        // Restore selected chat if it exists in localStorage
        const savedChatId = localStorage.getItem('selectedChatId');
        if (savedChatId) {
          const savedChat = chatsData.find((chat: Chat) => chat.id.toString() === savedChatId);
          if (savedChat) {
            // Set selected chat synchronously to prevent notification issues
            setSelectedChat(savedChat);

            // Join chat room if socket instance is connected
            if (socketInstance && socketInstance.connected) {
              socketInstance.emit('joinChat', savedChat.id);
            }

            // Load messages for this chat
            loadMessagesForChat(savedChat, token);
          }
        }
      }
    } catch (error) {
      console.error('Load chats error:', error);
    }
  };

  const loadMessagesForChat = async (chat: Chat, token: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/chats/${chat.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
      });
      if (response.ok) {
        const chatMessages = await response.json();
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsSidebarOpen(false); // Close sidebar on mobile when chat is selected

    setMessages([]);

    // Save selected chat to localStorage
    localStorage.setItem('selectedChatId', chat.id.toString());

    // Join chat room if socket is connected
    if (socket && socket.connected) {
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
        const response = await fetch(`http://localhost:3000/api/chats/${chat.id}/messages`, {
          headers: {
            'Authorization': `Bearer ${authState.token}`,
            'x-api-key': import.meta.env.VITE_API_KEY,
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUploadMedia = async (file: File, content?: string) => {
    if (!authState.user || !authState.token || !selectedChat) return;

    const formData = new FormData();
    formData.append('media', file);
    if (content) {
      formData.append('content', content);
    }

    try {
      const response = await fetch(`http://localhost:3000/api/chats/${selectedChat.id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
        body: formData,
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages(prev => [...prev, newMessage]);
        setCurrentMessage(''); // Clear the message input
      } else {
        console.error('Failed to upload media');
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const createChat = async (formData: { name: string; participantUsernames: string; type: 'direct' | 'group' }) => {
    if (!authState.token) return;

    const usernames = formData.participantUsernames.split(',').map(u => u.trim()).filter(u => u);
    if (usernames.length === 0) {
      setAuthError('At least one participant is required');
      return;
    }

    // For direct chats, only one username should be provided
    if (formData.type === 'direct' && usernames.length !== 1) {
      setAuthError('Direct messages require exactly one username');
      return;
    }

    try {
      // Get all users to find IDs by username
      const usersResponse = await fetch('http://localhost:3000/api/users', {
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
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
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
        body: JSON.stringify({
          name: formData.name || null,
          participantIds,
          type: formData.type,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await loadChats(authState.token);
        setShowCreateChat(false);
      } else {
        setAuthError(data.error || 'Failed to create chat');
      }
    } catch (error) {
      setAuthError('Network error. Please try again.');
      console.error('Create chat error:', error);
    }
  };

  if (!authState.isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="h-screen flex relative">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat List - Desktop: always visible, Mobile: slide in/out */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        transition-transform duration-300 ease-in-out
      `}>
        <ChatList
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={selectChat}
          onCreateChat={() => {
            setShowCreateChat(true);
            setIsSidebarOpen(false); // Close sidebar on mobile when opening modal
          }}
          onAccountSettings={() => {
            setShowAccountSettings(true);
            setIsSidebarOpen(false); // Close sidebar on mobile when opening modal
          }}
          user={authState.user}
          isConnected={isConnected}
          isMobile={true}
        />
      </div>

      {/* Chat Window */}
      <ChatWindow
        selectedChat={selectedChat}
        messages={messages}
        currentMessage={currentMessage}
        onMessageChange={setCurrentMessage}
        onSendMessage={handleSendMessage}
        onKeyPress={handleKeyPress}
        onUploadMedia={handleUploadMedia}
        user={authState.user}
      />

      <CreateChatModal
        isOpen={showCreateChat}
        onClose={() => setShowCreateChat(false)}
        onCreateChat={createChat}
        error={authError}
      />

      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        user={authState.user}
        onLogout={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          localStorage.removeItem('selectedChatId');
          setAuthState({ user: null, token: null, isAuthenticated: false });
          navigate('/signin');
        }}
        onDeleteAccount={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          localStorage.removeItem('selectedChatId');
          setAuthState({ user: null, token: null, isAuthenticated: false });
          navigate('/');
        }}
      />
    </div>
  );
}

export default Chat;
