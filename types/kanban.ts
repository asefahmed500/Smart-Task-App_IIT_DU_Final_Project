export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type IssueType = 'BUG' | 'FEATURE' | 'STORY' | 'TASK' | 'EPIC' | 'SUBTASK';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type EpicStatus = 'BACKLOG' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type IssueLinkType = 'BLOCKS' | 'BLOCKED_BY' | 'RELATES_TO' | 'DUPLICATES' | 'DUPLICATED_BY';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type IssueResolution = 'FIXED' | 'WONT_FIX' | 'DUPLICATE' | 'CANNOT_REPRODUCE' | 'LATER' | 'MOVED';

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
  reactions?: Reaction[];
  isEditable?: boolean;
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
  // Sprint planning fields
  issueType: IssueType | null;
  status: TaskStatus | null;
  storyPoints: number | null;
  parentId: string | null;
  sprintId: string | null;
  resolution: IssueResolution | null;
  epicId: string | null;
  column?: { id: string; name: string; boardId: string };
  creator?: User;
  assignee?: User | null;
  attachments?: Attachment[];
  comments?: Comment[];
  checklists?: Checklist[];
  tags?: Tag[];
  timeEntries?: TimeEntry[];
  reviews?: Review[];
  sprint?: { id: string; name: string; status: SprintStatus };
  epic?: { id: string; name: string; color: string };
  parent?: { id: string; title: string };
  subtasks?: Task[];
  issueLinks?: IssueLink[];
  _count?: {
    comments: number;
    attachments: number;
    checklists: number;
    subtasks: number;
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

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  commentId: string;
  createdAt: string | Date;
  user?: User;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  taskAssigned: boolean;
  statusChanged: boolean;
  commentMention: boolean;
  automationTriggered: boolean;
  dueDateReminder: boolean;
  overdueReminder: boolean;
  reviewRequested: boolean;
  reviewCompleted: boolean;
  newUserSignup: boolean;
  boardMemberAdded: boolean;
  boardMemberRemoved: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  members: User[];
  columns: Column[];
  updatedAt: string | Date;
  sprints?: Sprint[];
  epics?: Epic[];
}

export type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | Date;
  endDate: string | Date;
  status: SprintStatus;
  boardId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  board?: { id: string; name: string };
  _count?: { tasks: number };
}

export interface Epic {
  id: string;
  name: string;
  description: string | null;
  status: EpicStatus;
  color: string;
  boardId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: { tasks: number };
}

export interface IssueLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  linkType: IssueLinkType;
  createdAt: string | Date;
  sourceTask?: { id: string; title: string; issueType: IssueType | null; priority: Priority; status: TaskStatus | null };
  targetTask?: { id: string; title: string; issueType: IssueType | null; priority: Priority; status: TaskStatus | null };
}
