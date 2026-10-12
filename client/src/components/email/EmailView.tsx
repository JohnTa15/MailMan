import { FC } from 'react';
import { Mail, Star, Archive, Trash2, Reply, Forward, Clock, Paperclip } from 'lucide-react';
import { Email } from '../types';
import { format } from 'date-fns';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface EmailViewProps {
  email: Email;
  onReply: () => void;
  onDelete: () => void;
}

export const EmailView: FC<EmailViewProps> = ({ email, onReply, onDelete }) => {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
          {email.subject}
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onReply}>
            <Reply className="w-4 h-4" />
            <span className="ml-2">Reply</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sender Info */}
      <div className="flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
        <Avatar alt={email.fromName || email.from} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {email.fromName || email.from}
            </span>
            {email.isImportant && <Badge variant="danger">Important</Badge>}
            {email.isStarred && <Badge variant="warning">Starred</Badge>}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{email.from}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            To: {email.to}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatDate(email.date)}</span>
          </div>
        </div>
        {email.attachments.length > 0 && (
          <div className="flex items-center gap-1">
            <Paperclip className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">
              {email.attachments.length}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: email.html || email.body }}
        />
      </div>

      {/* Attachments */}
      {email.attachments.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attachments
          </h3>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
              >
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="max-w-[150px] truncate">{att.name}</span>
                <span className="text-xs text-gray-500">
                  {(att.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
