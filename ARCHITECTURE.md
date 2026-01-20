# Architecture Overview

This document provides a high-level overview of the application's architecture, including its technology stack, folder structure, and key design decisions.

## 🏗 Tech Stack

| Category       | Technology     | Description                               |
| -------------- | -------------- | ----------------------------------------- |
| **Frontend**   | React          | Component-based UI library.               |
| **Build Tool** | Vite           | Fast frontend build tool.                 |
| **Language**   | TypeScript     | Statically typed JavaScript.              |
| **Styling**    | Tailwind CSS   | Utility-first CSS framework.              |
| **UI Library** | Shadcn UI      | Reusable component set based on Radix UI. |
| **State Mgt**  | TanStack Query | Server state management.                  |
| **Routing**    | React Router   | Client-side routing.                      |
| **Backend**    | Supabase       | BaaS for Auth & Database.                 |

## 📂 Directory Structure

```
src/
├── components/     # shared UI components & Shadcn components
├── context/        # React Context providers (e.g., BillingContext)
├── hooks/          # Custom Reusable Hooks
├── integrations/   # Connection logic for external services (Supabase)
├── lib/            # Utilities & helper functions (utils.ts)
├── pages/          # Page components mapped to Routes
├── App.tsx         # Main App component with Providers & Routes
└── main.tsx        # Entry point
```

## 🔑 Key Concepts

### Authentication

Authentication is handled via Supabase. The `AuthGate` component in `App.tsx` likely wraps protected routes to ensure only authenticated users can access them.

### State Management

- **Server State:** Handled by `@tanstack/react-query`. API calls should be wrapped in custom hooks using `useQuery` or `useMutation`.
- **Client State:** Global UI state is seemingly minimal or handled via React Context (e.g., `BillingProvider`).

### Styling

We use a combination of **Tailwind CSS** for layout and spacing, and **Shadcn UI** for pre-built, accessible components.

- Global styles are in `index.css`.
- Components are located in `src/components/ui`.

### Data Fetching

Data fetching is abstracted via `TanStack Query`. This provides caching, loading states, and error handling out of the box.

```tsx
const { data, isLoading } = useQuery({ queryKey: ["key"], queryFn: fetchData });
```
