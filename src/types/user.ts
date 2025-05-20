
export interface User {
  id: string;
  username: string;
  password?: string; // Stored hashed or not at all if using external provider
  displayName: string;
  avatarUrl?: string;
}
