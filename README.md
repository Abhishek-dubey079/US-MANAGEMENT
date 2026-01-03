# Finance Management

A clean and scalable finance management application built with Next.js, TypeScript, and Tailwind CSS.

## Features

- ✅ Client management with full CRUD operations
- ✅ Work/task tracking with status lifecycle
- ✅ Advanced search with keyword filtering (GST, TDS, ITR, Audit)
- ✅ Data persistence with SQLite/PostgreSQL
- ✅ Auto-save drafts to prevent data loss
- ✅ Responsive design for all devices
- ✅ Professional finance-focused UI

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Initialize database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
├── pages/
│   ├── api/              # API routes
│   ├── client/           # Client detail pages
│   └── add-client.tsx    # Add client page
├── components/
│   ├── common/           # Reusable UI components
│   ├── icons/            # SVG icon components
│   └── *.tsx             # Feature components
├── services/             # Business logic & database operations
├── hooks/                # Custom React hooks
├── utils/                # Utility functions
├── types/                # TypeScript type definitions
├── prisma/               # Database schema
└── styles/               # Global styles
```

## Tech Stack

- **Next.js 14** - React framework with SSR
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **SQLite** - Database (easily switchable to PostgreSQL)
- **Tailwind CSS** - Utility-first styling
- **ESLint** - Code linting

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open database GUI

## Database

See [DATABASE.md](./DATABASE.md) for detailed schema documentation.

## Production Deployment

See [PRODUCTION.md](./PRODUCTION.md) for production deployment guide.

## Code Quality

- TypeScript strict mode enabled
- ESLint configured
- Consistent code patterns
- Comprehensive error handling
- Production-ready optimizations

