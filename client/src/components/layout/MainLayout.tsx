import { FC, useState } from 'react';
import { Inbox, Send, Trash2, Archive, Star, Tag, Settings, LogOut, Menu, Plus, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { emailService } from '../../services/emailService';
import { Email } from '../../types';
import { EmailList } from '../email/EmailList';
import { EmailView } from '../email/EmailView';
import { ComposeModal } from '../compose/ComposeModal';
import { Button } from '../ui/Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const MainLayout: FC = () => {
  const { 
    view, 
    setView, 
    selectedEmail, 
    setSelectedEmail, 
    emails,
    setEmails,
    currentAccountId,
    sidebarOpen,
    setSidebarOpen,
    darkMode,
    setDarkMode,
  } = useAppStore();

  const [showCompose, setShowCompose] = useState(false);
  const queryClient = useQueryClient();

  // Fetch emails
  const { data: fetchedEmails, isLoading } = useQuery({
    queryKey: ['emails', currentAccountId],
    queryFn: () => emailService.getEmails({ accountId: currentAccountId }),
    enabled: !!currentAccountId,
  });

  // Update store when emails change
  useState(() => {
    if (fetchedEmails) {
      setEmails(fetchedEmails);
    }
  });

  const handleRefresh = async () => {
    try {
      const freshEmails = await emailService.getEmails({ accountId: currentAccountId });
      setEmails(freshEmails);
      await queryClient.invalidateQueries({ queryKey: ['emails'] });
    } catch (error) {
      console.error('Failed to refresh emails:', error);
    }
  };

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
    setView('thread');
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
    setView('list');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  OpenWebMail
                </span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Compose Button */}
          <div className="px-3 mb-4">
            <Button
              onClick={() => setShowCompose(true)}
              className={`w-full ${sidebarOpen ? '' : 'px-0'}`}
            >
              <Plus className={sidebarOpen ? 'w-4 h-4 mr-2' : 'w-5 h-5'} />
              {sidebarOpen && 'Compose'}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1">
            {[
              { icon: Inbox, label: 'Inbox', id: 'inbox' },
              { icon: Send, label: 'Sent', id: 'sent' },
              { icon: Archive, label: 'Archive', id: 'archive' },
              { icon: Star, label: 'Starred', id: 'starred' },
              { icon: Tag, label: 'Labels', id: 'labels' },
              { icon: Trash2, label: 'Trash', id: 'trash' },
            ].map(({ icon: Icon, label, id }) => (
              <button
                key={id}
                onClick={() => {
                  // Handle folder selection
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  view === id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{label}</span>}
              </button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">Settings</span>}
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Email List */}
        {view === 'list' && (
          <div className="w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-800">
            <EmailList
              emails={emails}
              isLoading={isLoading}
              onEmailSelect={handleEmailSelect}
              onRefresh={handleRefresh}
            />
          </div>
        )}

        {/* Email View / Thread */}
        {view === 'thread' && selectedEmail && (
          <div className="flex-1">
            <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <Button variant="ghost" size="sm" onClick={handleBackToList}>
                ← Back
              </Button>
            </div>
            <EmailView
              email={selectedEmail}
              onReply={() => setShowCompose(true)}
              onDelete={() => {
                // Handle delete
              }}
            />
          </div>
        )}

        {/* Empty State */}
        {view === 'list' && !selectedEmail && (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Inbox className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select an email to read</p>
              <p className="text-sm mt-1">Choose from your inbox</p>
            </div>
          </div>
        )}
      </main>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
        />
      )}
    </div>
  );
};
