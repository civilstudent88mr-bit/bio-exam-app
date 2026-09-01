import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: 'right' | 'left';
  width?: string;
}

export function Drawer({ open, onClose, title, children, side = 'right', width = 'max-w-md' }: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const sideClass = side === 'right' ? 'right-0' : 'left-0';
  const slideClass = side === 'right' ? 'animate-slide-right' : 'animate-slide-left';

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`absolute top-0 bottom-0 ${sideClass} w-full ${width} shadow-2xl ${slideClass} flex flex-col`}
        style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'rgb(var(--color-border))' }}>
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-muted hover:opacity-70">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
      <style>{`
        @keyframes slideRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animate-slide-right { animation: slideRight 0.3s cubic-bezier(0.16,1,0.3,1); }
        .animate-slide-left { animation: slideLeft 0.3s cubic-bezier(0.16,1,0.3,1); }
      `}</style>
    </div>,
    document.body
  );
}
