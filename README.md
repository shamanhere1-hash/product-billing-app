# Shop Flow

A modern React application built with functional components, hooks, and best practices.

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or bun

### Installation

1. Clone the repository:
   ```sh
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```sh
   cd shop-flow-main
   ```

3. Install dependencies:
   ```sh
   npm install
   # or
   bun install
   ```

4. Set up environment variables:
   Copy the example environment file to a new `.env` file:
   ```sh
   cp .env.example .env
   ```
   Then edit `.env` and fill in your Supabase credentials:
   - `VITE_SUPABASE_PROJECT_ID`: Your Supabase Project ID
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Anon Key
   - `VITE_SUPABASE_URL`: Your Supabase Project URL


### Running Locally

To start the development server:

```sh
npm run dev
# or
bun dev
```

Open [http://localhost:8080](http://localhost:8080) with your browser to see the result.

## 🛠 Tech Stack

- **Framework:** [React](https://react.dev) + [Vite](https://vitejs.dev)
- **Styling:** [Tailwind CSS](https://tailwindcss.com) + [Shadcn UI](https://ui.shadcn.com)
- **State Management:** React Context + [TanStack Query](https://tanstack.com/query/latest)
- **Routing:** [React Router](https://reactrouter.com)
- **Icons:** [Lucide React](https://lucide.dev)
- **Backend/Auth:** Supabase (implied by dependencies)

## 📦 Project Structure

- `src/components`: Reusable UI components.
- `src/pages`: Route components/pages.
- `src/hooks`: Custom React hooks.
- `src/context`: React Context providers.
- `src/lib`: Utility functions and library configurations.
- `src/integations`: External integrations (e.g., Supabase).

## 📜 Scripts

- `dev`: Starts local development server.
- `build`: Builds the production bundle.
- `lint`: Runs ESLint to check for code quality issues.
- `preview`: Preview the production build locally.
   