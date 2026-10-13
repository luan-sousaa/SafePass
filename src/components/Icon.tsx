import type { ReactNode } from 'react';

export type IconName =
  | 'alert'
  | 'assistant'
  | 'camera'
  | 'check'
  | 'chevron'
  | 'document'
  | 'edit'
  | 'folder'
  | 'history'
  | 'home'
  | 'medication'
  | 'menu'
  | 'plus'
  | 'reminder'
  | 'search'
  | 'shield'
  | 'user'
  | 'users'
  | 'x';

const paths: Record<IconName, ReactNode> = {
  alert: <><path d="M12 3L2.5 20h19z" /><path d="M12 9v4M12 17h.01" /></>,
  assistant: <><path d="M21 15a3 3 0 01-3 3H8l-5 3V6a3 3 0 013-3h12a3 3 0 013 3z" /><path d="M8 9h8M8 13h5" /></>,
  camera: <><path d="M4 7h3l2-2h6l2 2h3v12H4z" /><circle cx="12" cy="13" r="4" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12l2.5 2.5L16 9" /></>,
  chevron: <polyline points="9 18 15 12 9 6" />,
  document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4z" /></>,
  folder: <path d="M3 6h7l2 2h9v11H3z" />,
  history: <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></>,
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  medication: <><path d="M10.5 20.5l10-10a5 5 0 00-7-7l-10 10a5 5 0 007 7z" /><path d="M8.5 8.5l7 7" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  reminder: <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M14 21h-4" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0110 0v2M16 4a3 3 0 010 6M17 14a5 5 0 014 4.58V20" /></>,
  x: <path d="M18 6L6 18M6 6l12 12" />,
};

export default function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
