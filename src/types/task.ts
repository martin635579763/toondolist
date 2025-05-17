
export interface TaskBreakdownStep {
  step: string;
  details?: string;
  requiredRole?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string | null; // ISO date string or null
  color: string; // Hex color string for card background
  createdAt: number; // Timestamp for sorting
  parentId?: string; // ID of the parent task, if this is a sub-task
}
