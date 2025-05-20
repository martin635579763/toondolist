
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

export interface Task {
  id: string; 
  title: string;
  description: string;
  completed: boolean;
  dueDate: string | null; // ISO date string or null
  color: string; 
  createdAt: number; // Timestamp (number) for sorting for localStorage
  parentId?: string; 
  assignedRoles?: string[]; 
  applicants?: Applicant[]; 
  order?: number; // Optional field for drag-and-drop ordering
  
  // User association (owner of the task)
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
}

