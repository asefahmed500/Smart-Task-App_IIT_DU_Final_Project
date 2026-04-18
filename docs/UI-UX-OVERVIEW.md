# UI/UX System Overview

## Design System

### Color Palette (OKLCH)
Uses Perceptual OKLCH color space for consistent cross-browser rendering.

| Token | Light Mode | Dark Mode | Usage |
|-------|----------|----------|-------|
| `--color-background` | `oklch(0.98 0.01 200)` | `oklch(0.12 0.02 200)` | Page background |
| `--color-foreground` | `oklch(0.2 0.02 200)` | `oklch(0.95 0.01 200)` | Primary text |
| `--color-primary` | `oklch(0.55 0.25 260)` | `oklch(0.65 0.2 260)` | Actions, links |
| `--color-secondary` | `oklch(0.92 0.02 200)` | `oklch(0.2 0.02 200)` | Secondary bg |
| `--color-muted` | `oklch(0.95 0.01 200)` | `oklch(0.2 0.02 200)` | Disabled, hints |
| `--color-border` | `oklch(0.9 0.01 200 / 50%)` | `oklch(0.25 0.02 200)` | Borders |
| `--color-destructive` | `oklch(0.6 0.2 25)` | `oklch(0.5 0.2 25)` | Errors, delete |

### Typography
- Font: Inter (primary), Geist Mono (code)
- Dark mode: Press `d` to toggle (ignores input fields)

### Shadows (Multi-layer)
```
--shadow-premium-sm:  0 2px 4px + 1px 1px (subtle)
--shadow-premium-md:  0 4px 12px + 2px 4px (medium)
--shadow-premium-lg: 0 12px 24px + 4px 8px  (elevated)
--shadow-vibrant:    0 0 40px -10px (glow effect)
```

### Border Radius Scale
```
--radius-xs:   4px   (badges)
--radius-sm:   8px   (inputs)
--radius-md:   12px  (dropdowns)
--radius-lg:  16px  (cards)
--radius-xl:  24px
--radius-2xl: 32px
--radius-full: 9999px (pills)
```

### Animation
```css
--duration-fast:   150ms  (hover, toggle)
--duration-normal: 300ms  (expand, collapse)
--duration-slow:  500ms  (page transitions)
--ease-premium:  cubic-bezier(0.23, 1, 0.32, 1)
```

## Components

### Button Variants (`components/ui/button.tsx`)
| Variant | Style |
|---------|-------|
| `default` | Solid primary with shadow |
| `black` | Black pill, high visibility |
| `white` | White pill, shadow-bordered |
| `premium` | High-contrast black CTA |
| `warm` | Warm stone (ElevenLabs signature) |
| `vibrant` | Indigo gradient with glow |
| `glass` | Glassmorphic |
| `cta` | Uppercase WaldenburgFH style |
| `outline` | Border only |
| `secondary` | Secondary background |
| `ghost` | No background |
| `destructive` | Red accent |
| `link` | Underline |

Button Sizes: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

### Core UI Components (`components/ui/`)
| Component | Usage |
|------------|-------|
| `button.tsx` | Actions with 12 variants |
| `card.tsx` | Content containers |
| `dialog.tsx` | Modal overlays |
| `sheet.tsx` | Slide-out panels |
| `input.tsx` | Text fields |
| `textarea.tsx` | Multi-line input |
| `select.tsx` | Dropdown selection |
| `dropdown-menu.tsx` | Context menus |
| `popover.tsx` | Floating content |
| `checkbox` | Boolean toggles |
| `switch.tsx` | On/off toggles |
| `tabs.tsx` | Content switching |
| `accordion.tsx` | Collapsible sections |
| `badge.tsx` | Status labels |
| `avatar.tsx` | User images |
| `tooltip.tsx` | Hover hints |
| `alert.tsx` | Notifications |
| `separator.tsx` | Visual dividers |
| `scroll-area.tsx` | Custom scroll |
| `skeleton.tsx` | Loading states |
| `label.tsx` | Field labels |
| `table.tsx` | Data grids |
| `command.tsx` | Command palette |

### Layout Components (`components/layout/`)
| Component | Purpose |
|-----------|---------|
| `navbar.tsx` | Top navigation bar |
| `sidebar.tsx` | Left navigation |
| `right-sidebar.tsx` | Task detail panel |
| `connectivity-listener.tsx` | Online/offline detection |

### Kanban Components (`components/kanban/`)
| Component | Purpose |
|-----------|---------|
| `board-view.tsx` | Main board canvas |
| `column.tsx` | Kanban columns |
| `task-card.tsx` | Task cards |
| `draggable-task-card.tsx` | Drag-and-drop wrapper |
| `create-task-dialog.tsx` | New task form |
| `swimlane-view.tsx` | Grouped view (assignee/priority) |
| `swimlane-group-select.tsx` | Group selector |
| `dependency-arrows.tsx` | SVG dependency lines |
| `metrics-dashboard.tsx` | Flow metrics |
| `throughput-calendar.tsx` | 90-day heatmap |
| `due-timeline.tsx` | Timeline view |
| `board-cursors.tsx` | Real-time cursors |
| `presence-stack.tsx` | Active users |
| `live-cursor-badge.tsx` | Cursor labels |
| `conflict-resolution-dialog.tsx` | Version conflict modal |

### Task Components (`components/task/`)
| Component | Purpose |
|-----------|---------|
| `task-detail-sidebar.tsx` | Full task editor (tabs: Overview, Comments, Dependencies, Attachments, Activity) |
| `dependency-select.tsx` | Add/remove blocking tasks |

## Page Structure

### Route Hierarchy
```
app/
├── page.tsx                   # Landing page
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx            # Dashboard layout with sidebar
│   ├── dashboard/page.tsx     # My tasks
│   ├── board/[id]/
│   │   ├── page.tsx          # Kanban board
│   │   └── loading.tsx
│   ├── admin/
│   │   ├── users/page.tsx
│   │   ├── boards/page.tsx
│   │   ├── settings/page.tsx
│   │   └── audit/page.tsx
│   └── profile/page.tsx
└── api/                      # Route handlers
```

### Sidebar Navigation (by role)
| Role | Pages |
|------|-------|
| ADMIN | Dashboard, Boards, Admin (Users, Audit, Settings), Profile |
| MANAGER | Dashboard, Boards, Profile |
| MEMBER | Dashboard, Profile |

## Key UI Patterns

### Task Card
- Shows: Title, priority badge, assignee avatar, due date, label chips
- Hover: Edit indicator, drag handle
- Click: Opens right sidebar (task-detail-sidebar.tsx)

### Kanban Column
- Header: Name, task count/WIP limit, action menu
- Drop zone: Visual feedback on drag-over
- Terminal columns: Done, Review (dependency check applied)

### Real-time Collaboration
- Cursor positions broadcast via Socket.IO
- Presence stack shows active users
- Editing indicator when task sidebar open
- Conflict resolution dialog on version conflict

### Dark Mode
- Press `d` key (ignores input fields)
- Provider: `components/theme-provider.tsx`
- CSS custom variant in `globals.css`

### Offline Support
- Banner shows when offline
- Mutations queued in localStorage
- Auto-replay on reconnect

## Animation Examples

```typescript
// Hover lift effect
<div className="hover-lift">...</div>

// Glass morphism
<div className="glass-morphism-premium">...</div>

// Vibrant glow
<div className="vibrant-glow">...</div>

// Text gradient
<h1 className="text-gradient">...</h1>
```

## Responsive Breakpoints
Uses Tailwind default breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)