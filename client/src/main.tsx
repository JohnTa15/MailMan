import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import '@fontsource-variable/inter';
import App from './App';
import { useAppStore } from './store/appStore';
import './index.css';

// Invite links look like /?invite=CODE: keep the code for the sign-up form
// before the first render, and drop it from the address bar
{
  const url = new URL(window.location.href);
  const invite = url.searchParams.get('invite');
  if (invite) {
    useAppStore.getState().setPendingInvite(invite);
    url.searchParams.delete('invite');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      gutter={10}
      containerStyle={{ top: 'max(16px, env(safe-area-inset-top))' }}
      toastOptions={{
        duration: 3000,
        className:
          '!rounded-2xl !bg-ink-900/90 !px-4 !py-3 !text-sm !font-medium !text-white !shadow-float !backdrop-blur-xl dark:!bg-white/90 dark:!text-ink-900',
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>
);
