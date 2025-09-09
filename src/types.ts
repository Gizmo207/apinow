export type ViewType = 'dashboard' | 'databases' | 'schema' | 'builder' | 'tester' | 'docs' | 'analytics' | 'settings';

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}