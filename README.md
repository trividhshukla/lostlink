# LostLink — Campus Lost & Found Platform

LostLink is a modern, privacy-first Lost & Found web application purpose-built for university campuses. It connects finders and owners through smart item matching, visual identification, private ownership proof, and coordinated campus handovers.

---

## Key Features

- **Visual Identification & Protected ID Privacy:**
  - Finders submit one clear photo for visual recognition.
  - Identity cards and sensitive documents are automatically masked to safeguard student privacy and prevent impersonation.
- **Smart Description Matching:**
  - Fast deterministic ranking evaluates category, primary color, brand finish, campus recovery zone, and timestamp proximity.
  - Optional AI semantic matching connects reports even when described using different vocabulary or campus slang.
- **Private Ownership Verification:**
  - Claimants submit private identifying marks (e.g., unique scratches, engraving, or lock screen details).
  - True ownership details remain completely hidden until reviewed and accepted by the finder.
- **Secure 1-to-1 Handover Coordination:**
  - Coordinated in-app chat unlocks only after a claim is verified and accepted.
  - Real-time messaging allows participants to arrange a safe physical campus exchange.
- **Two-Sided Resolution:**
  - Both finder and owner confirm the physical exchange to officially resolve and close the listing.
- **Admin Moderation & Audited Access:**
  - Campus administrators can review flagged content, resolve disputes, and monitor campus activity.
  - Sensitive item details are protected by audited private access logs.

---

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, React Server Components, Server Actions)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Lucide React](https://lucide.dev/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL 15, Row Level Security, Supabase Auth)
- **Storage:** Supabase Storage (Private storage bucket with HMAC signed URL tokens)
- **Image Processing:** [Sharp](https://sharp.pixelplumbing.com/) (Server-side WebP compression and dimension validation)
- **Testing:** [Vitest](https://vitest.dev/) (Unit test suite covering matching heuristics, claims lifecycle, and validation)

---

## Project Structure

```text
├── public/                 # Static public assets
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, routes)
│   │   ├── (auth)/         # Login and signup flows
│   │   ├── admin/          # Admin moderation and audit logs
│   │   ├── claims/         # Claim review and 1-to-1 handover chat
│   │   ├── dashboard/      # User submission and bookmark dashboard
│   │   ├── explore/        # Campus listing exploration and filters
│   │   ├── notifications/  # Notification inbox
│   │   └── report/         # New report forms and detailed report view
│   ├── components/         # Reusable UI components
│   ├── lib/                # Shared utilities, constants, and server actions
│   │   ├── server/         # Server-only modules (matching, storage, claims)
│   │   └── supabase/       # Supabase client and server configuration
│   └── types/              # TypeScript database and domain schemas
├── supabase/
│   └── migrations/         # Idempotent PostgreSQL database migrations
└── tests/
    └── unit/               # Automated unit tests
```

---

## Getting Started

### Prerequisites

- Node.js 18.18+ or 20+
- A [Supabase](https://supabase.com/) project

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/lostlink.git
cd lostlink
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your project credentials:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Optional: Groq Cloud API for AI text matching
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
```

### 3. Apply Database Migrations

Execute the SQL migration scripts in order within your Supabase project's SQL Editor:

1. `supabase/migrations/20261102_phase2_core_schema.sql`
2. `supabase/migrations/20261102_phase3_matching_schema.sql`
3. `supabase/migrations/20261102_phase4_notifications_schema.sql`
4. `supabase/migrations/20261102_phase5_claims_schema.sql`
5. `supabase/migrations/20261103_phase6_admin_moderation.sql`
6. `supabase/migrations/20261103_patch_constraints_and_rpc.sql`

Ensure a private storage bucket named `report-images` is created with a 2MB file size limit.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js development server |
| `npm run build` | Compiles optimized production build |
| `npm run start` | Starts production server |
| `npm run test` | Runs Vitest automated unit test suite |
| `npm run type-check` | Runs TypeScript compiler checks (`tsc --noEmit`) |
| `npm run lint` | Runs Next.js ESLint validation |

---

## License

This project is licensed under the [MIT License](LICENSE).
