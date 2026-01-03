# Setup Guide

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   The `.env` file will contain:
   ```
   DATABASE_URL="file:./dev.db"
   NODE_ENV="development"
   ```

3. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Create database and run initial migration:**
   ```bash
   npx prisma migrate dev --name init
   ```
   
   This will:
   - Create the SQLite database file (`dev.db`)
   - Create the `clients` and `works` tables
   - Set up the foreign key relationship

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Database Schema Overview

### Client Model
- Stores client information (name, PAN, Aadhaar, address, phone)
- Has a one-to-many relationship with Work
- PAN numbers are unique

### Work Model
- Stores work/task information for clients
- Belongs to a Client (foreign key: `clientId`)
- Has status enum: `pending`, `completed`, `finalCompleted`
- Cascade delete: Deleting a client automatically deletes all associated works

## Using the Services

### Client Service Example

```typescript
import { ClientService } from '@/services/client.service'

// Create a client
const client = await ClientService.create({
  name: 'John Doe',
  pan: 'ABCDE1234F',
  phone: '+1234567890'
})

// Get all clients
const clients = await ClientService.findAll()

// Get client with works
const clientWithWorks = await ClientService.findByIdWithWorks(clientId)
```

### Work Service Example

```typescript
import { WorkService } from '@/services/work.service'

// Create a work entry
const work = await WorkService.create({
  clientId: 'client-id-here',
  purpose: 'Tax filing',
  fees: 5000,
  status: 'pending'
})

// Get all works for a client
const works = await WorkService.findByClientId(clientId)

// Update work status
await WorkService.update(workId, {
  status: 'completed',
  completionDate: new Date()
})
```

## Viewing Data

Use Prisma Studio to view and edit data in the database:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can browse and edit your data.

## TypeScript Types

All TypeScript interfaces are defined in `types/index.ts`:
- `Client` - Client model
- `Work` - Work model
- `CreateClientInput` - Input for creating clients
- `UpdateClientInput` - Input for updating clients
- `CreateWorkInput` - Input for creating work entries
- `UpdateWorkInput` - Input for updating work entries
- `WorkWithClient` - Work with nested client data
- `ClientWithWorks` - Client with nested works array

## Data Persistence

- **SQLite Database**: Data is stored in `dev.db` file (local file-based database)
- **Automatic Timestamps**: `createdAt` and `updatedAt` are automatically managed
- **Type Safety**: Full TypeScript support with Prisma-generated types
- **Cascade Deletes**: Deleting a client automatically removes all associated works

## Production Deployment

For production, consider switching to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env` with your PostgreSQL connection string

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```


