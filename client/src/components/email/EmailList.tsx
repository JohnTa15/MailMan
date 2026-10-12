import { FC, useState } from 'react';
import { Email } from '../types';
import { EmailRow } from './EmailRow';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface EmailListProps {
  emails: Email[];
  selectedEmailId?: string;
  isLoading?: boolean;
  onEmailSelect: (email: Email) => void;
  onRefresh: () => void;
}

export const EmailList: FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  isLoading = false,
  onEmailSelect,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');

  const filteredEmails = emails.filter(
    (email) =>
      email.subject.toLowerCase().includes(search.toLowerCase()) ||
      email.from.toLowerCase().includes(search.toLowerCase()) ||
      email.preview.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-800">
        <Input
          placeholder="Search emails..."
          value={search}
          onChange={setSearch}
          icon={<Search className="w-4 h-4" />}
          className="flex-1"
        />
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <Mail className="w-8 h-8 mb-2 opacity-50" />
            <p>No emails found</p>
          </div>
        ) : (
          filteredEmails.map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              onClick={onEmailSelect}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
        {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
