# 🪐 SmartTask Master System Audit & Technical Specification

This document provides a comprehensive, high-fidelity breakdown of the **SmartTask** ecosystem. It serves as the definitive guide to the application's UI/UX philosophy, backend architecture, data integrity systems, and intelligent automation engine.

---

## 🎨 1. UI/UX & Frontend Orchestration

SmartTask is built for a fluid, responsive, and real-time user experience.

### 🏗️ Architecture & Stack
- **Core Framework**: [Next.js 16](https://nextjs.org/) (App Router) with [React 19](https://react.dev/).
- **Design System**: A bespoke implementation using [Tailwind CSS v4](https://tailwindcss.com/) and [Shadcn UI](https://ui.shadcn.com/) primitives.
- **Motion & Interaction**: Powered by [Framer Motion](https://www.framer.com/motion/) for cinematic transitions and micro-animations.
- **Drag & Drop**: [Dnd-kit](https://dndkit.com/) provides the performant, accessible backbone for the Kanban board interactions.

### 🎥 Key Visual Features
- **Dynamic Board Interface**: Real-time column WIP tracking, interactive task cards with priority-coded visuals, and fluid drag-and-drop state updates.
- **Contextual Command Palette**: Accessible via `Cmd+K`, providing instant navigation and action execution across the platform.
- **Real-Time Presence**: Live cursors, editing indicators, and user activity heartbeats powered by **Socket.io**.
- **Responsive Adaptability**: A mobile-first layout that preserves the Kanban mental model across all device scales.

---

## 🧠 2. Intelligent Core & Analytics (The "Smart" Engine)

The platform earns its "Smart" prefix through proactive automation and deep predictive insights.

### 🤖 Intelligent Automation Engine (`lib/automation/`)
A high-performance logic engine that evaluates events in real-time.
- **Triggers**: `TASK_MOVED`, `TASK_ASSIGNED`, `PRIORITY_CHANGED`, and `TASK_STALLED`.
- **Logic Matrix**: Supports complex `Trigger -> Condition -> Action` workflows.
- **Automated Actions**: User notifications, auto-assignment of resources, priority escalation, and label tagging.

### 📈 Predictive Performance Analytics (`lib/metrics/`)
Advanced statistical processing to optimize team throughput.
- **Cycle Time Analysis**: Measures the precise delta between `InProgress` and `Done` states, providing avg/median/p95 metrics.
- **Lead Time Tracking**: Analyzes the full lifecycle from creation to completion.
- **Throughput Heatmaps**: Visualizes delivery velocity over 90-day windows to identify seasonal bottlenecks.

---

## 🛡️ 3. Resilience & Integrity Systems

SmartTask is designed to survive unstable network conditions and human error.

### 📶 Offline-First Resilience (`lib/offlineQueue.ts`)
A custom Redux-integrated middleware that ensures productivity never stops.
- **Mutation Queuing**: Automatically intercepts and stores API mutations (tasks, boards, columns) when connection is lost.
- **Intelligent Replay**: Seamlessly replays queued actions with exponential backoff and retry logic upon reconnection.

### ⏪ Universal Undo System (`lib/undo-middleware.ts`)
A sophisticated middleware layer that provides a safety net for all board mutations.
- **Action Inversion**: Automatically generates revert handlers for every state-changing operation.
- **State Restoration**: Allows users to "Undo" complex operations (like multi-task moves or board renames) with atomic precision.

---

## 🗄️ 4. Data Architecture & Backend Security

### 💎 Database Specification (Prisma + PostgreSQL)
Our schema is designed for high relational integrity and auditing.
- **Audit Logging**: Every mutation (actor, target, changes, IP, UserAgent) is captured in a system-wide audit table for total compliance.
- **Complex Relations**: Native support for task dependencies (blockers/blocking) and multi-tier role management.
- **Search Optimization**: Optimized indexing on `email`, `role`, `dueDate`, and `status` fields for sub-millisecond query performance.

### 🔐 Security & Identity
- **Better-Auth Integration**: A hardened authentication layer with JWT support via `jose`.
- **Fine-Grained RBAC**: Centralized role resolution (`getEffectiveBoardRole`) that dynamically calculates permissions based on both global and board-specific context.
- **Rate Limiting**: Intelligent IP-based throttling on sensitive API routes to prevent brute-force and DDoS attempts.

---

## 🛠️ 5. Technical Audit Directory

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| **Store** | [lib/store.ts](file:///d:/smart-task/lib/store.ts) | Central Redux/RTK-Query configuration. |
| **Socket** | [lib/socket.ts](file:///d:/smart-task/lib/socket.ts) | Real-time event orchestration. |
| **Auth** | [lib/auth.ts](file:///d:/smart-task/lib/auth.ts) | Identity and session management. |
| **Engine** | [lib/automation/engine.ts](file:///d:/smart-task/lib/automation/engine.ts) | Automation rule processing. |
| **Schema** | [prisma/schema.prisma](file:///d:/smart-task/prisma/schema.prisma) | Source of truth for data structures. |

---

*Master Audit conducted by Antigravity AI on April 18, 2026. All systems verified and documented.*
