/**
 * User service - handles all user-related database operations and authentication
 */

import prisma from './database'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  name: string
  username: string
  password: string
  createdAt: Date
}

export interface CreateUserInput {
  name: string
  username: string
  password: string
}

export interface LoginInput {
  username: string
  password: string
}

export class UserService {
  /**
   * Create a new user with hashed password
   */
  static async create(data: CreateUserInput): Promise<Omit<User, 'password'>> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: hashedPassword,
      },
    })

    // Return user without password
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Find a user by username
   */
  static async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    })
  }

  /**
   * Find a user by ID
   */
  static async findById(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) return null

    // Return user without password
    const { password, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Verify user credentials
   * Returns user without password if credentials are valid, null otherwise
   */
  static async verifyCredentials(
    username: string,
    password: string
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.findByUsername(username)

    if (!user) {
      return null
    }

    // Compare provided password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return null
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Check if username already exists
   */
  static async usernameExists(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    return user !== null
  }

  /**
   * Update user password
   * Password will be hashed before storing
   */
  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    // Hash the new password before storing
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    })
  }
}

