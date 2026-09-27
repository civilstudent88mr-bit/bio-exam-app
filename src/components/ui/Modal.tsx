import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-in`}
        style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = 'تایید', danger }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn btn-outline" onClick={onClose}>انصراف</button>
        <button
          className={`btn ${danger ? 'bg-error-500 text-white hover:brightness-110' : 'btn-primary'}`}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
