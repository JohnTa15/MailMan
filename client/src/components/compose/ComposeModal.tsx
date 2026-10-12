import { FC, useState } from 'react';
import { Send, X, Paperclip, Bold, Italic, List, Link as LinkIcon } from 'lucide-react';
import { emailService } from '../../services/emailService';
import { useAppStore } from '../../store/appStore';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ComposeModalProps {
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
}

export const ComposeModal: FC<ComposeModalProps> = ({
  onClose,
  defaultTo,
  defaultSubject,
}) => {
  const { accounts, currentAccountId } = useAppStore();
  const [to, setTo] = useState(defaultTo || '');
  const [subject, setSubject] = useState(defaultSubject || '');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const currentAccount = accounts.find((a) => a.id === currentAccountId);

  const handleSend = async () => {
    if (!currentAccount) {
      toast.error('Please select an account first');
      return;
    }

    if (!to.trim()) {
      toast.error('Please enter a recipient');
      return;
    }

    setIsSending(true);
    try {
      await emailService.sendEmail({
        accountId: currentAccount.id,
        to,
        subject,
        body,
        attachments,
      });
      toast.success('Email sent successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* From */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-12">From:</span>
            <span className="text-sm text-gray-900 dark:text-white flex-1">
              {currentAccount?.email || 'Select account'}
            </span>
          </div>

          {/* To */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-12">To:</span>
            <Input
              value={to}
              onChange={setTo}
              placeholder="recipient@example.com"
              className="flex-1"
            />
          </div>

          {/* Subject */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-12">Subject:</span>
            <Input
              value={subject}
              onChange={setSubject}
              placeholder="Email subject"
              className="flex-1"
            />
          </div>

          {/* Body */}
          <div className="flex items-start gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-12 pt-2">Body:</span>
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 border border-gray-200 dark:border-gray-700 rounded-t-lg">
                <Button variant="ghost" size="sm">
                  <Bold className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Italic className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="w-full h-64 p-3 border border-gray-200 dark:border-gray-700 rounded-b-lg resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 w-12">Attach:</span>
            <div className="flex-1 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm"
                >
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    onClick={() =>
                      setAttachments(attachments.filter((_, i) => i !== idx))
                    }
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Add attachment
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    setAttachments([...attachments, ...(e.target.files || [])])
                  }
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="ghost" onClick={onClose}>
            Discard
          </Button>
          <Button onClick={handleSend} disabled={isSending || !to.trim()}>
            <Send className="w-4 h-4 mr-2" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
};
