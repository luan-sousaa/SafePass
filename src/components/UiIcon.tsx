export type UiIconName =
  | 'alert'
  | 'assistant'
  | 'camera'
  | 'check'
  | 'document'
  | 'edit'
  | 'folder'
  | 'medication'
  | 'reminder'
  | 'search'
  | 'user';

export default function UiIcon({ name, className }: { name: UiIconName; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'camera') return <svg {...common}><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="4" /></svg>;
  if (name === 'folder') return <svg {...common}><path d="M3 6h7l2 2h9v11H3z" /></svg>;
  if (name === 'edit') return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4z" /></svg>;
  if (name === 'search') return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
  if (name === 'alert') return <svg {...common}><path d="M12 3L2.5 20h19z" /><path d="M12 9v4M12 17h.01" /></svg>;
  if (name === 'check') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12l2.5 2.5L16 9" /></svg>;
  if (name === 'medication') return <svg {...common}><path d="M10.5 20.5l10-10a5 5 0 00-7-7l-10 10a5 5 0 007 7z" /><path d="M8.5 8.5l7 7" /></svg>;
  if (name === 'reminder') return <svg {...common}><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M14 21h-4" /></svg>;
  if (name === 'user') return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>;
  if (name === 'assistant') return <svg {...common}><path d="M21 15a3 3 0 01-3 3H8l-5 3V6a3 3 0 013-3h12a3 3 0 013 3z" /><path d="M8 9h8M8 13h5" /></svg>;

  return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
}
