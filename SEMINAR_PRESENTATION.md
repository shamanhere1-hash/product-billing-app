# Seminar Presentation: Product Billing App System Architecture & Workflow

## 1. Introduction
**Slide Title**: Product Billing App - Next Gen POS System
**Speaker Notes**:
"Good morning/afternoon everyone. Today, I'll be presenting the 'Product Billing App', a modern, offline-first Point of Sale (POS) system designed for efficiency and reliability. This system was built to solve common retail challenges like internet connectivity issues, speed of finding products, and secure access control."

### Key Objectives of the System
*   **Speed**: Fast product search and cart management.
*   **Reliability**: Works offline and syncs when online.
*   **Security**: PIN-based authentication for different roles (Admin, Staff).
*   **Simplicity**: Clean, intuitive UI for rapid order processing.

---

## 2. System Architecture
**Slide Title**: High-Level Architecture
**Visual**: [Frontend (React/Vite)] <--> [Edge Functions (Security)] <--> [Supabase (Auth/DB)]

**Speaker Notes**:
"The system follows a modern serverless architecture.
1.  **Frontend**: Built with React and extensive state management, hosted on Vercel/Netlify (implied). It's a Single Page Application (SPA).
2.  **Backend**: We rely on Supabase as our Backend-as-a-Service (BaaS). It handles our Database (PostgreSQL) and Real-time subscriptions.
3.  **Middle Layer**: Supabase Edge Functions (running on Deno) act as our secure API gateway for sensitive operations like Authentication and Admin Setup."

---

## 3. Technology Stack
**Slide Title**: Tech Stack Breakdown

### Frontend
*   **React + TypeScript**: For robust, type-safe UI development.
*   **Vite**: For lightning-fast build and development server.
*   **Tailwind CSS**: For a custom, responsive utility-first design.
*   **Shadcn UI**: For accessible, high-quality UI components.
*   **Lucide React**: For consistent iconography.

### Backend & Data
*   **Supabase (PostgreSQL)**: The core relational database.
*   **Supabase Edge Functions**: Server-side logic written in TypeScript/Deno.
*   **Row Level Security (RLS)**: Database-level security policies.

### State Management
*   **React Context (BillingContext)**: Manages the complex state of the cart, orders, and products.
*   **LocalStorage**: Acts as a client-side persistent store for offline capabilities.
*   **TanStack Query**: Used for efficient data fetching and caching (where applicable).

---

## 4. Key Workflows & Features

### A. Authentication (The Security Layer)
**How it works**:
*   We don't use traditional email/password for staff. We use **PINs** for speed.
*   **Roles**:
    *   **Main App**: Standard staff access.
    *   **Admin/Owner**: Privileged access.
*   **Process**:
    1.  User enters PIN.
    2.  Request sent to `verify-pin` Edge Function.
    3.  Function hashes input (Bcrypt) and compares with stored hash in `app_pins` table.
    4.  If valid, returns a session token.
    5.  Rate limiting is applied to prevent brute-force attacks (blocked after 5 failed attempts).

### B. Taking Orders (The Core Loop)
**Workflow**:
1.  **Product Selection**: Staff searches or filters by category.
2.  **Cart Management**: Items added to global `BillingContext`.
3.  **Order Creation**:
    *   **Optimistic UI**: The app *immediately* shows the order as created to the user.
    *   **Offline Check**:
        *   **If Online**: Sends data to Supabase `orders` table.
        *   **If Offline**: Saves the order to `localStorage` and adds a task to the `pendingOperations` queue.

### C. Offline Synchronization (The "Magic")
**Concept**: "Always-On Availability"
*   We employ a custom hook `useOfflineSync`.
*   It listens for network status changes.
*   **When connection is restored**:
    *   The app iterates through `pendingOperations`.
    *   Replays 'create_order', 'update_order', or 'update_status' actions to the server.
    *   This ensures no sales data is lost during internet outages.

---

## 5. Backend Architecture (Deep Dive)

### Database Schema
*   **products**: ID, Name, Price, Category.
*   **orders**: Order Number (unique), Customer Name, Total, Status (pending/packed/billed).
*   **order_items**: Links Products to Orders with captured price (snapshot).
*   **app_pins**: Stores hashed PINs (never plain text).

### Edge Functions
*   `verify-pin`: Central auth logic.
    *   *Why Edge Function?* To keep hashing logic off the client-side and hide the salt/hash from prying eyes.
*   `seed-data`: Utility to populate initial products (Coffee, Snacks, etc.).

---

## 6. Code Walkthrough (Key Functions)

### `BillingContext.tsx`
This is the heart of the application.
```typescript
// Simplified Logic
const createOrder = async (customerName) => {
  // 1. Create Order Object
  const newOrder = { ... };

  // 2. Optimistic Update (Update UI first)
  setOrders(prev => [newOrder, ...prev]);

  // 3. Network Request
  if (!isOnline) {
    queueOfflineJob(newOrder); // Save for later
  } else {
    await supabase.from('orders').insert(newOrder); // Sync now
  }
}
```

### `verify-pin/index.ts`
The security gatekeeper.
```typescript
// Simplified Logic
serve(async (req) => {
  const { pin } = await req.json();
  const storedHash = await getHashFromDB();
  
  if (bcrypt.compare(pin, storedHash)) {
    return new Response({ token: generateSession() });
  }
  return new Response({ error: "Invalid PIN" }, { status: 401 });
});
```

---

## 7. Conclusion
The Product Billing App demonstrates how modern web technologies can create a robust, desktop-class application experience in the browser. By combining **Supabase's** powerful backend features with **React's** interactive UI and a custom **Offline-First** strategy, we verify that business operations never stop, regardless of connectivity.

**Thank You.**
