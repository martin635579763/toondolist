
export interface TaskBreakdownStep {
  step: string;
  details?: string;
  requiredRole?: string;
}

export interface Applicant {
  id: string;
  role: string; // Should match one of the strings in the parent Task's assignedRoles
  name: string;
  status: 'pending' | 'accepted' | 'rejected';
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
  assignedRoles?: string[]; // Optional array of strings for assigned roles/people (for main tasks)
  applicants?: Applicant[]; // Optional array of applicants for roles (for main tasks)
}
