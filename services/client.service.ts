/**
 * Client service - handles all client-related database operations
 */

import prisma from './database'
import type { Client, CreateClientInput, UpdateClientInput, ClientWithWorks } from '@/types'
import { mapClient, mapWork } from '@/utils/mappers'

export class ClientService {
  /**
   * Create a new client
   */
  static async create(data: CreateClientInput): Promise<Client> {
    return prisma.client.create({
      data: {
        name: data.name,
        pan: data.pan || null,
        aadhaar: data.aadhaar || null,
        address: data.address || null,
        phone: data.phone || null,
      },
    })
  }

  /**
   * Get all clients
   */
  static async findAll(): Promise<Client[]> {
    return prisma.client.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * Get a client by ID
   */
  static async findById(id: string): Promise<Client | null> {
    return prisma.client.findUnique({
      where: { id },
    })
  }

  /**
   * Get a client with all their works
   * Includes works ordered by creation date (newest first)
   * Maps Prisma models to TypeScript types
   */
  static async findByIdWithWorks(id: string): Promise<ClientWithWorks | null> {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        works: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })
    if (!client) return null
    
    // Map Prisma models to TypeScript types
    return {
      ...mapClient(client),
      works: client.works.map(mapWork),
    }
  }

  /**
   * Update a client
   */
  static async update(id: string, data: UpdateClientInput): Promise<Client> {
    return prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        pan: data.pan,
        aadhaar: data.aadhaar,
        address: data.address,
        phone: data.phone,
      },
    })
  }

  /**
   * Delete a client (will cascade delete all associated works)
   */
  static async delete(id: string): Promise<Client> {
    return prisma.client.delete({
      where: { id },
    })
  }

  /**
   * Find client by PAN number
   */
  static async findByPan(pan: string): Promise<Client | null> {
    return prisma.client.findUnique({
      where: { pan },
    })
  }
}

