export interface TemplateColumn {
  name: string
  order: number
  wipLimit: number
}

export interface TemplateTask {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  columnName: string
  issueType?: 'BUG' | 'FEATURE' | 'STORY' | 'TASK' | 'EPIC' | 'SUBTASK'
  storyPoints?: number
}

export interface BoardTemplate {
  id: string
  name: string
  description: string
  icon: string
  columns: TemplateColumn[]
  tasks: TemplateTask[]
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'scrum',
    name: 'Scrum Sprint',
    description: 'Classic Scrum board with sprint planning workflow',
    icon: 'Sprint',
    columns: [
      { name: 'Backlog', order: 0, wipLimit: 0 },
      { name: 'To Do', order: 1, wipLimit: 10 },
      { name: 'In Progress', order: 2, wipLimit: 5 },
      { name: 'Review', order: 3, wipLimit: 3 },
      { name: 'Done', order: 4, wipLimit: 0 },
    ],
    tasks: [
      { title: 'Define sprint goals and scope', description: 'Collaborate with stakeholders to set clear sprint objectives', priority: 'HIGH', columnName: 'Backlog', issueType: 'STORY', storyPoints: 3 },
      { title: 'Set up development environment', description: 'Configure local dev environment, CI/CD pipeline, and linting rules', priority: 'HIGH', columnName: 'To Do', issueType: 'TASK', storyPoints: 2 },
      { title: 'Design database schema', description: 'Create entity relationship diagram and define Prisma models', priority: 'HIGH', columnName: 'To Do', issueType: 'TASK', storyPoints: 5 },
      { title: 'Implement user authentication', description: 'Add login, signup, password reset with JWT tokens', priority: 'URGENT', columnName: 'In Progress', issueType: 'FEATURE', storyPoints: 8 },
      { title: 'Code review: API endpoints', description: 'Review REST API design patterns and error handling', priority: 'MEDIUM', columnName: 'Review', issueType: 'TASK', storyPoints: 3 },
      { title: 'Update project README', description: 'Document setup instructions and architecture decisions', priority: 'LOW', columnName: 'Done', issueType: 'TASK', storyPoints: 1 },
    ],
  },
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Continuous flow board for ongoing operations',
    icon: 'Kanban',
    columns: [
      { name: 'Backlog', order: 0, wipLimit: 0 },
      { name: 'Ready', order: 1, wipLimit: 8 },
      { name: 'In Progress', order: 2, wipLimit: 4 },
      { name: 'Blocked', order: 3, wipLimit: 5 },
      { name: 'Done', order: 4, wipLimit: 0 },
    ],
    tasks: [
      { title: 'Monitor production metrics', description: 'Review dashboard for anomalies in error rates and latency', priority: 'MEDIUM', columnName: 'Backlog', issueType: 'TASK', storyPoints: 1 },
      { title: 'Rotate API keys', description: 'Generate new API keys and update all services', priority: 'HIGH', columnName: 'Ready', issueType: 'TASK', storyPoints: 2 },
      { title: 'Upgrade Node.js runtime', description: 'Update from Node 20 to Node 22 across all services', priority: 'MEDIUM', columnName: 'Ready', issueType: 'TASK', storyPoints: 5 },
      { title: 'Fix memory leak in worker process', description: 'Investigate and resolve growing memory usage in background jobs', priority: 'URGENT', columnName: 'In Progress', issueType: 'BUG', storyPoints: 8 },
      { title: 'Migrate database - blocked on vendor', description: 'Waiting for managed database provider to approve maintenance window', priority: 'HIGH', columnName: 'Blocked', issueType: 'TASK', storyPoints: 3 },
      { title: 'Deploy hotfix v2.3.1', description: 'Patch release for authentication timeout issue', priority: 'HIGH', columnName: 'Done', issueType: 'BUG', storyPoints: 2 },
    ],
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Track all workstreams for a product release',
    icon: 'Rocket',
    columns: [
      { name: 'Planning', order: 0, wipLimit: 0 },
      { name: 'Design', order: 1, wipLimit: 6 },
      { name: 'Development', order: 2, wipLimit: 8 },
      { name: 'Testing', order: 3, wipLimit: 5 },
      { name: 'Launch', order: 4, wipLimit: 0 },
    ],
    tasks: [
      { title: 'Define product requirements', description: 'Gather and document core feature requirements from stakeholders', priority: 'HIGH', columnName: 'Planning', issueType: 'STORY', storyPoints: 5 },
      { title: 'Create wireframes and mockups', description: 'Design high-fidelity mockups for all key user flows', priority: 'HIGH', columnName: 'Design', issueType: 'TASK', storyPoints: 8 },
      { title: 'Design system setup', description: 'Configure theme, tokens, and reusable component library', priority: 'MEDIUM', columnName: 'Design', issueType: 'TASK', storyPoints: 5 },
      { title: 'Build landing page', description: 'Implement responsive landing page with marketing content', priority: 'HIGH', columnName: 'Development', issueType: 'FEATURE', storyPoints: 8 },
      { title: 'Implement payment integration', description: 'Integrate Stripe for subscription billing', priority: 'URGENT', columnName: 'Development', issueType: 'FEATURE', storyPoints: 13 },
      { title: 'End-to-end testing', description: 'Write and run E2E tests for all critical user journeys', priority: 'HIGH', columnName: 'Testing', issueType: 'TASK', storyPoints: 5 },
      { title: 'Performance audit', description: 'Run Lighthouse and fix performance bottlenecks', priority: 'MEDIUM', columnName: 'Testing', issueType: 'TASK', storyPoints: 3 },
      { title: 'Configure CDN and caching', description: 'Set up CloudFront with proper cache headers', priority: 'MEDIUM', columnName: 'Launch', issueType: 'TASK', storyPoints: 3 },
    ],
  },
  {
    id: 'bug-tracking',
    name: 'Bug Tracking',
    description: 'Dedicated board for tracking and resolving bugs',
    icon: 'Bug',
    columns: [
      { name: 'Reported', order: 0, wipLimit: 0 },
      { name: 'Triaged', order: 1, wipLimit: 10 },
      { name: 'In Progress', order: 2, wipLimit: 5 },
      { name: 'Testing', order: 3, wipLimit: 5 },
      { name: 'Resolved', order: 4, wipLimit: 0 },
    ],
    tasks: [
      { title: 'Login fails on Safari mobile', description: 'Users on iOS Safari get a blank screen after entering credentials', priority: 'URGENT', columnName: 'Reported', issueType: 'BUG', storyPoints: 5 },
      { title: 'Pagination shows wrong count', description: 'Total items count is off by one on the last page', priority: 'MEDIUM', columnName: 'Reported', issueType: 'BUG', storyPoints: 2 },
      { title: 'Email notifications delayed', description: 'Emails arrive 30+ minutes after the triggering event', priority: 'HIGH', columnName: 'Triaged', issueType: 'BUG', storyPoints: 5 },
      { title: 'Fix timezone handling in scheduler', description: 'Scheduled tasks run at wrong times for users in UTC+', priority: 'HIGH', columnName: 'In Progress', issueType: 'BUG', storyPoints: 8 },
      { title: 'Fix broken image uploads', description: 'JPEG uploads fail silently when file exceeds 2MB', priority: 'MEDIUM', columnName: 'Testing', issueType: 'BUG', storyPoints: 3 },
      { title: 'Fix CSS alignment on forms', description: 'Labels and inputs misaligned on screens between 768-1024px', priority: 'LOW', columnName: 'Resolved', issueType: 'BUG', storyPoints: 1 },
    ],
  },
]
