import { useState } from 'react';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (formData: { name: string; participantUsernames: string; type: 'direct' | 'group' }) => void;
  error: string;
}

function CreateChatModal({ isOpen, onClose, onCreateChat, error }: CreateChatModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    participantUsernames: '',
    type: 'direct' as 'direct' | 'group',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateChat(formData);
  };

  const handleClose = () => {
    setFormData({ name: '', participantUsernames: '', type: 'direct' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Chat</h3>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Chat Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'direct' })}
                className={`flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded transition-colors ${formData.type === 'direct'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300'
                  }`}
              >
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'group' })}
                className={`flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded transition-colors ${formData.type === 'group'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300'
                  }`}
              >
                Group Chat
              </button>
            </div>
          </div>

          {formData.type === 'group' && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Chat Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter chat name"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              {formData.type === 'direct' ? 'Username' : 'Participants (comma-separated usernames)'}
            </label>
            <input
              type="text"
              value={formData.participantUsernames}
              onChange={(e) => setFormData({ ...formData, participantUsernames: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder={formData.type === 'direct' ? 'Enter username' : 'user1, user2, user3'}
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            >
              Create Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChatModal;
