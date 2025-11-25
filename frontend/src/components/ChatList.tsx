import ThemeToggle from './ThemeToggle';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Chat {
  id: number;
  name: string | null;
  type: 'direct' | 'group' | 'global';
  createdAt: string;
  createdBy: number;
  participants: User[];
}

interface ChatListProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  onCreateChat: () => void;
  onAccountSettings: () => void;
  onAdminPanel?: () => void;
  user: User | null;
  isConnected: boolean;
  isMobile?: boolean;
}

function ChatList({ chats, selectedChat, onSelectChat, onCreateChat, onAccountSettings, onAdminPanel, user, isConnected, isMobile }: ChatListProps) {
  const getChatDisplayName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.id !== user?.id);
      return otherParticipant ? otherParticipant.username : 'Direct Chat';
    }
    return 'Group Chat';
  };

  return (
    <div className={`${isMobile ? 'w-full' : 'w-96'} bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 flex flex-col h-full`}>
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chats</h2>
          <div className="flex items-center space-x-2">
            <div className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              {isConnected ? '●' : '●'}
            </div>
            <ThemeToggle />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.username}</span>
          <button
            onClick={onCreateChat}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            New Chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats
          .sort((a, b) => {
            // Global chat always first
            if (a.type === 'global') return -1;
            if (b.type === 'global') return 1;
            return 0;
          })
          .map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative ${
              selectedChat?.id === chat.id
                ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-l-blue-500'
                : chat.type === 'global'
                ? 'bg-green-50 dark:bg-green-900 border-l-4 border-l-green-500'
                : ''
            }`}
          >
            <div className={`font-medium ${chat.type === 'global' ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
              {getChatDisplayName(chat)}
              {chat.type === 'global' && <span className="ml-2 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">Global</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {chat.type === 'global'
                ? `${chat.participants.length} online users`
                : chat.type === 'group'
                ? `${chat.participants.length} members`
                : 'Direct message'
              }
            </div>
          </div>
        ))}
        {chats.length === 0 && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No chats yet. Create your first chat!
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700 space-y-2">
        {onAdminPanel && (
          <button
            onClick={onAdminPanel}
            className="w-full px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Admin Panel
          </button>
        )}
        <button
          onClick={onAccountSettings}
          className="w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Account Settings
        </button>
      </div>
    </div>
  );
}

export default ChatList;
