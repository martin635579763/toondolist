export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string | null; // ISO date string or null
  color: string; // Hex color string for card background
  createdAt: number; // Timestamp for sorting
}
