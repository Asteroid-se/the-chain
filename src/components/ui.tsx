'use client';
import { Check, X, AlertCircle, Youtube, Instagram, Music2, Globe } from 'lucide-react';
export function Platform({ name }: { name: string }) {
  const Icon =
    name === 'YouTube'
      ? Youtube
      : name === 'Instagram'
        ? Instagram
        : name === 'TikTok'
          ? Music2
          : Globe;
  return (
    <span className={`platform platform-${name.toLowerCase()}`}>
      <Icon size={15} />
      <span>{name}</span>
    </span>
  );
}
export function Toast({
  message,
  onClose,
}: {
  message: { text: string; error?: boolean } | null;
  onClose: () => void;
}) {
  return (
    message && (
      <div
        role={message.error ? 'alert' : 'status'}
        className={`toast ${message.error ? 'toast-error' : ''}`}
      >
        {message.error ? <AlertCircle size={19} /> : <Check size={19} />}
        <span>{message.text}</span>
        <button className="icon-button" onClick={onClose} aria-label="Dismiss notification">
          <X size={16} />
        </button>
      </div>
    )
  );
}
export function Skeleton() {
  return (
    <div className="skeleton" role="status" aria-label="Loading">
      <div />
      <div />
      <div />
    </div>
  );
}
