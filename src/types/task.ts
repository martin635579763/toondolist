
export interface TaskBreakdownStep {
  step: string;
  details?: string;
  requiredRole?: string;
}

export interface Applicant {
  id: string;
  role: string;
  name: string; // Name of the person applying
  status: 'pending' | 'accepted' | 'rejected';
  applicantUserId: string; // ID of the user who applied
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  // dueDate?: string | null; // Example for future extension
  // assignedUserId?: string | null; // Example for future extension
}

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string | null; // ISO date string or null
  backgroundImageUrl?: string; // For card background image
  createdAt: number; // Timestamp (number) for sorting for localStorage
  assignedRoles?: string[];
  applicants?: Applicant[];
  checklistItems?: ChecklistItem[]; 
  order?: number; // Optional field for drag-and-drop ordering

  // User association (owner of the task)
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
}
