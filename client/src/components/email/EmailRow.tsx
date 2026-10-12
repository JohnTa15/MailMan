import { FC, MouseEvent } from 'react';
import { Mail, Star, Archive, Trash2, ArchiveX, Label, Reply, Forward, MoreVertical } from 'lucide-react';
import { Email } from '../../types';
import { useAppStore } from '../../store/appStore';

interface EmailRowProps {
  email: Email;
  onClick: (email: Email) => void;
}

export const EmailRow: FC<EmailRowProps> = ({ email, onClick }) => {
  const { toggleStarred, toggleRead, markAsImportant, deleteEmail } = useAppStore();

  const handleStarClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleStarred(email.id);
  };

  const handleReadClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleRead(email.id);
  };

  const handleImportantClick = (e: MouseEvent) => {
    e.stopPropagation();
    markAsImportant(email.id);
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    deleteEmail(email.id);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group ${
        !email.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onClick={() => onClick(email)}
    >
      {/* Star */}
      <button
        onClick={handleStarClick}
        className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Star
          className={`w-4 h-4 ${
            email.isStarred
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-400'
          }`}
        />
      </button>

      {/* Important */}
      <button
        onClick={handleImportantClick}
        className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Archive
          className={`w-4 h-4 ${
            email.isImportant ? 'text-red-500' : 'text-gray-400'
          }`}
        />
      </button>

      {/* From */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium text-sm truncate ${
              !email.isRead
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {email.fromName || email.from.split('@')[0]}
          </span>
          {!email.isRead && (
            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {email.subject}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
          {email.preview}
        </p>
      </div>

      {/* Time & Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
          {formatTime(email.date)}
        </span>
        
        {/* Delete - shown on hover */}
        <button
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};
