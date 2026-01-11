# Database Schema Documentation

## Overview

This application uses **Prisma ORM** with **SQLite** for data persistence. The database consists of two main models: `Client` and `Work`, with a one-to-many relationship.

## Database Models

### Client Model

Represents a client in the system.

**Fields:**
- `id` (String, Primary Key) - Unique identifier (CUID)
- `name` (String, Required) - Client's full name
- `pan` (String, Optional, Unique) - PAN card number
- `aadhaar` (String, Optional) - Aadhaar card number
- `address` (String, Optional) - Client's address
- `phone` (String, Optional) - Contact phone number
- `createdAt` (DateTime) - Timestamp of creation (auto-generated)

**Relationships:**
- Has many `Work` entries (one-to-many)

### Work Model

Represents work/tasks assigned to clients.

**Fields:**
- `id` (String, Primary Key) - Unique identifier (CUID)
- `clientId` (String, Foreign Key) - Reference to the Client
- `purpose` (String, Required) - Description/purpose of the work
- `fees` (Float) - Fees charged for the work (default: 0)
- `completionDate` (DateTime, Optional) - Expected or actual completion date
- `status` (WorkStatus Enum) - Current status of the work (default: "PENDING")
- `createdAt` (DateTime) - Timestamp of creation (auto-generated)
- `updatedAt` (DateTime) - Timestamp of last update (auto-updated)

**Relationships:**
- Belongs to one `Client` (many-to-one)

### WorkStatus Enum

Defines the possible states of a work entry:
- `PENDING` - Work is pending/in progress
- `COMPLETED` - Work is completed
- `FINAL_COMPLETED` - Work is finally completed (final state)

## Relationships

### Client ↔ Work (One-to-Many)

- **One Client** can have **many Work** entries
- **One Work** belongs to **one Client**
- The relationship is enforced by a foreign key constraint
- **Cascade Delete**: When a Client is deleted, all associated Work entries are automatically deleted

**Database Implementation:**
```prisma
model Client {
  works Work[]  // One-to-many relationship
}

model Work {
  clientId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
}
```

## Data Persistence

### Database Connection

The application uses a singleton pattern for the Prisma Client instance to ensure efficient connection pooling and prevent multiple database connections in development.

**Location:** `services/database.ts`

### Service Layer

Business logic and database operations are abstracted into service classes:

- **ClientService** (`services/client.service.ts`) - Handles all client CRUD operations
- **WorkService** (`services/work.service.ts`) - Handles all work CRUD operations

### Key Features

1. **Type Safety**: Full TypeScript support with Prisma-generated types
2. **Data Validation**: Prisma enforces schema constraints at the database level
3. **Cascade Deletes**: Automatic cleanup of related records
4. **Timestamps**: Automatic tracking of creation and update times
5. **Unique Constraints**: PAN numbers are enforced as unique

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Create database and run migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **(Optional) Open Prisma Studio to view data:**
   ```bash
   npx prisma studio
   ```

## Migration to Production Database

To use PostgreSQL or MySQL in production:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // or "mysql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env` with your production database URL

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

## TypeScript Interfaces

TypeScript interfaces are defined in `types/index.ts` for use throughout the application:

- `Client` - Client model interface
- `Work` - Work model interface
- `CreateClientInput` - Input for creating clients
- `UpdateClientInput` - Input for updating clients
- `CreateWorkInput` - Input for creating work entries
- `UpdateWorkInput` - Input for updating work entries
- `WorkWithClient` - Work with nested client data
- `ClientWithWorks` - Client with nested works array



