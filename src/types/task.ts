
export interface TaskBreakdownStep {
  step: string;
  details?: string;
  requiredRole?: string;
}

export interface Applicant {
  id: string;
  role: string; 
  name: string;
  status: 'pending' | 'accepted' | 'rejected';
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
  
  // User association
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
}
