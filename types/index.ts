/**
 * TypeScript interfaces and types for the application
 */

export interface Client {
  id: string
  name: string
  pan: string | null
  aadhaar: string | null
  address: string | null
  phone: string | null
  createdAt: Date
}

export interface CreateClientInput {
  name: string
  pan?: string
  aadhaar?: string
  address?: string
  phone?: string
}

export interface UpdateClientInput {
  name?: string
  pan?: string
  aadhaar?: string
  address?: string
  phone?: string
}

export type WorkStatus = 'pending' | 'completed' | 'finalCompleted'

export interface Work {
  id: string
  clientId: string
  purpose: string
  fees: number
  completionDate: Date | null
  status: WorkStatus
  paymentReceived: boolean
  createdAt: Date
  updatedAt: Date
  payments?: Payment[] // Optional for backward compatibility
}

export interface Payment {
  id: string
  workId: string
  amount: number
  paymentDate: Date
  createdAt: Date
}

export interface CreatePaymentInput {
  workId: string
  amount: number
  paymentDate?: Date
}

export interface PaymentSummary {
  workId: string
  totalFees: number
  totalPaid: number
  remainingAmount: number
  payments: Payment[]
}

export interface CreateWorkInput {
  clientId: string
  purpose: string
  fees?: number
  completionDate?: Date
  status?: WorkStatus
  paymentReceived?: boolean
}

export interface UpdateWorkInput {
  purpose?: string
  fees?: number
  completionDate?: Date
  status?: WorkStatus
  paymentReceived?: boolean
}

export interface WorkWithClient extends Work {
  client: Client
}

export interface ClientWithWorks extends Client {
  works: Work[]
}

export interface User {
  id: string
  name: string
  username: string
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


