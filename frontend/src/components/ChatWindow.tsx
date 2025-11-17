import { useRef, useEffect } from 'react';

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

interface ChatWindowProps {
  selectedChat: Chat | null;
  messages: Message[];
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
  currentMessage,
  onMessageChange,
  onSendMessage,
  onKeyPress,
  onUploadMedia,
  user
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Select a chat</h3>
          <p className="text-gray-500 dark:text-gray-500">Choose a chat from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{getChatDisplayName(selectedChat)}</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedChat.participants.length} participants
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-3 p-3 rounded-lg max-w-md ${
              message.userId === user?.id
                ? 'bg-blue-500 text-white ml-auto'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}
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
      </div>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
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
      </div>
    </div>
  );
}

export default ChatWindow;
