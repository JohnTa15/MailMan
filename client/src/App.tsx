import { FC, useEffect } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useAppStore } from './store/appStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';

const App: FC = () => {
  const signedIn = useAppStore((s) => !!s.token || s.isDemo);
  const darkMode = useAppStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', darkMode ? '#0b0d17' : '#f7f7fb');
    // Lets the desktop app open with a matching window background
    window.electronAPI?.store.set('darkMode', darkMode).catch(() => {});
  }, [darkMode]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div
          key={signedIn ? 'app' : 'login'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="h-full"
        >
          {signedIn ? <MainLayout /> : <LoginScreen />}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
};

export default App;
