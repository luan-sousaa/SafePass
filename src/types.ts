export type Screen =
  | 'home'
  | 'documents'
  | 'add-document'
  | 'medications'
  | 'vaccines'
  | 'reminders'
  | 'dependents'
  | 'history'
  | 'chat'
  | 'profile';

export type User = { name: string; email: string };
