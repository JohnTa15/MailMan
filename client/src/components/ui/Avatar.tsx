import { FC } from 'react';
import { cn } from '../../lib/cn';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
  'from-cyan-500 to-blue-500',
  'from-lime-500 to-emerald-500',
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export const Avatar: FC<AvatarProps> = ({ name, src, size = 'md', className }) => {
  const initials =
    name
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <div
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-ink-900',
        !src && 'bg-gradient-to-br',
        !src && GRADIENTS[hash(name) % GRADIENTS.length],
        sizeClasses[size],
        className
      )}
    >
      {src ? <img src={src} alt={name} className="h-full w-full rounded-full object-cover" /> : initials}
    </div>
  );
};
