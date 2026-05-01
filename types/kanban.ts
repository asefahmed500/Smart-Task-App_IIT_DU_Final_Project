export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  taskId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  user: User;
}

export interface ChecklistItem {
  id: string;
  content: string;
  isCompleted: boolean;
  checklistId: string;
}

export interface Checklist {
  id: string;
  title: string;
  taskId: string;
  items: ChecklistItem[];
}

export interface Column {
  id: string;
  name: string;
  order: number;
  boardId: string;
  wipLimit: number;
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | Date | null;
  columnId: string;
  assigneeId: string | null;
  creatorId: string;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  column?: { id: string; name: string; boardId: string };
  creator?: User;
  assignee?: User | null;
  attachments?: Attachment[];
  comments?: Comment[];
  checklists?: Checklist[];
  tags?: Tag[];
  timeEntries?: TimeEntry[];
  reviews?: Review[];
  _count?: {
    comments: number;
    attachments: number;
    checklists: number;
  };
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  taskId: string;
  createdAt: string | Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  boardId: string | null;
}

export interface TimeEntry {
  id: string;
  duration: number; // in minutes
  description: string | null;
  userId: string;
  taskId: string;
  createdAt: string | Date;
  user?: User;
}

export interface Review {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  feedback: string | null;
  reviewerId: string;
  taskId: string;
  createdAt: string | Date;
  reviewer?: User;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  members: User[];
  columns: Column[];
  updatedAt: string | Date;
}
