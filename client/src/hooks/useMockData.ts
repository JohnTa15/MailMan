import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { MOCK_EMAILS, MOCK_ACCOUNTS } from '../data/mockData';

export function useMockData() {
  const { accounts, setAccounts, emails, setEmails } = useAppStore();

  useEffect(() => {
    if (accounts.length === 0) {
      setAccounts(MOCK_ACCOUNTS);
      setEmails(MOCK_EMAILS);
    }
  }, []);
}
