
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

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  actorName: string; // e.g., "You" or a specific user name if shared
  action: string; // e.g., "marked as complete", "changed due date", "updated description"
  details?: string; // e.g., "from 'Oct 25' to 'Oct 28'" or "updated title to 'New Shiny Title'"
}

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  assignedUserAvatarUrl?: string | null;
  imageUrl?: string | null;
  imageAiHint?: string | null;
  comments?: string[]; // Retained for now, might be merged into activity log later
  label?: string[];
  activityLog?: ActivityLogEntry[]; // New field for activity logging
}

export interface Task {
  id:string;
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
