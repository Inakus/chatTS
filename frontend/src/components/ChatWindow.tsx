import { useRef, useEffect, useState } from 'react';
import EmojiPicker from './EmojiPicker';

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

interface Message {
  id: number;
  content: string;
  userId: number;
  chatId: number;
  createdAt: string;
  username: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'gif';
  deleted?: boolean;
  deletedAt?: string;
}

interface ChatWindowProps {
  selectedChat: Chat | null;
  messages: Message[];
  onMessagesChange: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  currentMessage: string;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onUploadMedia: (file: File, content?: string) => void;
  user: User | null;
}

function ChatWindow({
  selectedChat,
  messages,
  onMessagesChange,
  currentMessage,
  onMessageChange,
  onSendMessage,
  onKeyPress,
  onUploadMedia,
  user
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    messageId: number;
    x: number;
    y: number;
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getChatDisplayName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const otherParticipant = chat.participants.find(p => p.id !== user?.id);
      return otherParticipant ? otherParticipant.username : 'Direct Chat';
    }
    return 'Group Chat';
  };

  const handleEmojiSelect = (emoji: string) => {
    onMessageChange(currentMessage + emoji);
  };

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    // Only show context menu for messages sent by the current user and not already deleted
    if (message.userId === user?.id && !message.deleted) {
      setContextMenu({
        messageId: message.id,
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleDeleteMessage = async () => {
    if (!contextMenu || !selectedChat) return;

    console.log('Deleting message:', contextMenu.messageId);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`http://localhost:3000/api/chats/${selectedChat.id}/messages/${contextMenu.messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': import.meta.env.VITE_API_KEY,
        },
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        console.log('Message deleted successfully');

        // Update the message locally to show as deleted immediately
        const deletedMessageData = {
          id: contextMenu.messageId,
          deleted: true,
          deletedAt: new Date().toISOString(),
          // Keep other fields as they were
          content: '',
          userId: user?.id || 0,
          chatId: selectedChat?.id || 0,
          createdAt: '',
          username: user?.username || '',
        };

        // Update the message in state immediately
        onMessagesChange(prev => prev.map(m =>
          m.id === contextMenu.messageId
            ? { ...m, deleted: true, deletedAt: new Date().toISOString() }
            : m
        ));

        setContextMenu(null);
      } else {
        console.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Select a chat</h3>
          <p className="text-gray-500 dark:text-gray-500">Choose a chat from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getChatDisplayName(selectedChat)}</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedChat.participants.length} participants
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {messages.filter(message => !message.deleted).map((message) => (
          <div
            key={message.id}
            className={`mb-3 p-3 rounded-lg max-w-md ${
              message.userId === user?.id
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            } ${message.userId === user?.id ? 'cursor-pointer' : ''}`}
            onContextMenu={(e) => handleContextMenu(e, message)}
          >
            {message.userId !== user?.id && (
              <div className="font-medium text-sm mb-1 text-gray-900 dark:text-white">{message.username}</div>
            )}
            {message.mediaUrl && (
              <div className="mb-2">
                <img
                  src={`http://localhost:3000${message.mediaUrl}`}
                  alt="Shared media"
                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(`http://localhost:3000${message.mediaUrl}`, '_blank')}
                />
              </div>
            )}
            {message.content && <div className="text-gray-900 dark:text-white">{message.content}</div>}
            <div className={`text-xs mt-1 ${
              message.userId === user?.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {new Date(message.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg py-2 z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleDeleteMessage}
              className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Delete Message
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 relative">
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadMedia(file, currentMessage.trim() || undefined);
                e.target.value = ''; // Reset input
              }
            }}
            className="hidden"
            id="media-upload"
          />
          <label
            htmlFor="media-upload"
            className="px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            📎
          </label>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded transition-colors ${
              showEmojiPicker
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            😀
          </button>
          <textarea
            placeholder="Type your message..."
            value={currentMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={onKeyPress}
            spellCheck={true}
            className="flex-1 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none min-h-[40px] max-h-32 overflow-y-auto"
            rows={1}
            style={{ height: 'auto', minHeight: '40px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={onSendMessage}
            disabled={!currentMessage.trim()}
            className={`px-5 py-2 text-base border-none rounded cursor-pointer transition-colors ${
              currentMessage.trim()
                ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
                : 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
            }`}
          >
            Send
          </button>
        </div>

        {/* Emoji Picker */}
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onEmojiSelect={handleEmojiSelect}
        />
      </div>
    </div>
  );
}

export default ChatWindow;
