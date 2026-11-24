import { FC, ReactNode, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

export const Section: FC<{ title: string; description?: ReactNode; children: ReactNode }> = ({ title, description, children }) => (
  <section className="mb-8">
    <h2 className="text-base font-semibold">{title}</h2>
    {description && <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{description}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

/** A value shown in full with a copy button (URLs, commands, keys). */
export const CopyField: FC<{ value: string; label: string; className?: string; mono?: boolean }> = ({ value, label, className, mono = true }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed. Select the text and copy it.');
    }
  };
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <code
        aria-label={label}
        className={cn(
          'min-w-0 flex-1 select-all break-all rounded-lg bg-ink-100 px-3 py-2 text-xs text-ink-800 dark:bg-ink-950/60 dark:text-ink-200',
          !mono && 'font-sans'
        )}
      >
        {value}
      </code>
      <Button size="sm" variant="secondary" onClick={copy} aria-label={`Copy ${label}`}>
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};
