import { FC } from 'react';
import { useAppStore } from '../store/appStore';
import { LoginScreen } from './components/auth/LoginScreen';
import { MainLayout } from './components/layout/MainLayout';

const App: FC = () => {
  const { isAuthenticated } = useAppStore();

  return isAuthenticated ? <MainLayout /> : <LoginScreen />;
};

export default App;
