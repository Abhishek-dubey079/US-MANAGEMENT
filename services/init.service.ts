/**
 * Initialization service - handles app startup initialization tasks
 * Ensures default admin user exists in the database
 */

import { UserService } from './user.service'
import prisma from './database'

// Admin user credentials for initial setup
// SECURITY NOTE: The password is stored here only for initial user creation.
// It is immediately hashed using bcrypt (10 rounds) before being stored in the database.
// The plain password is never logged, exposed in API responses, or stored anywhere else.
const ADMIN_USERNAME = 'Kapil1980'
const ADMIN_NAME = 'Kapil Dev Dubey'
const ADMIN_PASSWORD = 'As@221101' // Hashed before storage - never exposed

let initializationPromise: Promise<void> | null = null

/**
 * Initialize default admin user if it doesn't exist
 * This function is idempotent and safe to call multiple times
 * Relies on database check to prevent duplicates (not in-memory flag)
 */
async function initializeAdminUser(): Promise<void> {
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      // Check if admin user already exists in database
      // This is the primary mechanism to prevent duplicates
      const existingAdmin = await UserService.findByUsername(ADMIN_USERNAME)

      if (existingAdmin) {
        // Admin user already exists - no action needed
        return
      }

      // Admin user doesn't exist - create it
      // Password will be hashed with bcrypt in UserService.create
      console.log('Creating default admin user...')
      const admin = await UserService.create({
        name: ADMIN_NAME,
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD, // Will be hashed with bcrypt before storage
      })

      console.log(`Admin user created successfully: ${admin.username}`)
      // Note: Password is never logged or returned
    } catch (error) {
      console.error('Error initializing admin user:', error)
      
      // Handle unique constraint violation (user was created between check and create)
      if (error instanceof Error && 
          (error.message.includes('Unique constraint') || 
           error.message.includes('UNIQUE constraint'))) {
        // User was created by another process - this is fine, just log and continue
        console.log('Admin user already exists (created by another process)')
        return
      }
      
      // Don't throw - allow app to continue even if admin creation fails
      // This prevents blocking the app if there's a database issue
    } finally {
      // Clear promise so it can run again if needed (e.g., after server restart)
      initializationPromise = null
    }
  })()

  return initializationPromise
}

/**
 * Ensure admin user exists - call this on app startup
 * This will check and create the admin user if needed
 */
export async function ensureAdminUser(): Promise<void> {
  try {
    // First, ensure database connection
    const { ensureDatabaseConnection } = await import('./database')
    const isConnected = await ensureDatabaseConnection()

    if (!isConnected) {
      console.warn('Database not connected, skipping admin user initialization')
      return
    }

    // Initialize admin user
    await initializeAdminUser()
  } catch (error) {
    console.error('Error ensuring admin user:', error)
    // Don't throw - allow app to continue
  }
}

/**
 * Reset initialization state (useful for testing)
 * Note: The database check is the primary mechanism to prevent duplicates
 */
export function resetInitialization(): void {
  initializationPromise = null
}

