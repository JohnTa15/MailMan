import { FC, useState } from 'react';
import { Globe, Key, Lock, AlertCircle } from 'lucide-react';
import { emailService } from '../../services/emailService';
import { useAppStore } from '../../store/appStore';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const LoginScreen: FC = () => {
  const { addAccount, setAuthenticated } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [serverConfig, setServerConfig] = useState({
    imapHost: '',
    imapPort: '993',
    smtpHost: '',
    smtpPort: '587',
    secure: true,
  });

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsConnecting(true);
    try {
      // Attempt auto-discovery first
      const response = await emailService.login({ email, password });
      
      if (response.account) {
        addAccount(response.account);
        setAuthenticated(true);
        toast.success('Connected successfully!');
      } else {
        throw new Error('No account info returned');
      }
    } catch (error) {
      // Fall back to manual configuration
      if (showAdvanced && serverConfig.imapHost) {
        try {
          const account = await emailService.addAccount({
            email,
            displayName: email.split('@')[0],
            type: 'imap',
            connected: true,
            host: serverConfig.imapHost,
            port: parseInt(serverConfig.imapPort),
            secure: serverConfig.secure,
            auth: { user: email, pass: password },
          });
          addAccount(account);
          setAuthenticated(true);
          toast.success('Connected with custom settings!');
        } catch (e) {
          toast.error('Failed to connect with custom settings');
        }
      } else {
        toast.error('Connection failed. Try enabling advanced settings.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            OpenWebMail
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Secure, lightweight email client
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={<Globe className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Your email password"
                icon={<Lock className="w-4 h-4" />}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <Key className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} advanced settings
            </button>

            {showAdvanced && (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      IMAP Host
                    </label>
                    <Input
                      value={serverConfig.imapHost}
                      onChange={(v) =>
                        setServerConfig({ ...serverConfig, imapHost: v })
                      }
                      placeholder="imap.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      IMAP Port
                    </label>
                    <Input
                      value={serverConfig.imapPort}
                      onChange={(v) =>
                        setServerConfig({ ...serverConfig, imapPort: v })
                      }
                      placeholder="993"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      SMTP Host
                    </label>
                    <Input
                      value={serverConfig.smtpHost}
                      onChange={(v) =>
                        setServerConfig({ ...serverConfig, smtpHost: v })
                      }
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      SMTP Port
                    </label>
                    <Input
                      value={serverConfig.smtpPort}
                      onChange={(v) =>
                        setServerConfig({ ...serverConfig, smtpPort: v })
                      }
                      placeholder="587"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={serverConfig.secure}
                    onChange={(e) =>
                      setServerConfig({
                        ...serverConfig,
                        secure: e.target.checked,
                      })
                    }
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Use SSL/TLS
                  </span>
                </label>
              </div>
            )}

            <Button
              onClick={handleLogin}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>

          {/* Supported Providers */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-3">
              Supports IMAP, SMTP, EWS, OAuth2
            </p>
            <div className="flex justify-center gap-4 text-2xl text-gray-400">
              <Globe title="IMAP" />
              <Lock title="SMTP" />
              <AlertCircle title="EWS" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Your data stays local. We don't store your credentials.
        </p>
      </div>
    </div>
  );
};
