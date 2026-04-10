import { ApiResponse } from '@/lib/utils/api/api-response'
import { apiFetch } from './fetch-client'

const BASE_URL = '/api/users'

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin" | "employee"
  location: string[]
  rights: string[]
  managedRoles?: string[]
  createdAt?: string
}

export interface CreateUserRequest {
  name: string
  email: string
  role?: "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin" | "employee"
  location: string[]
  rights: string[]
  managedRoles?: string[]
  password?: string
  employeeId?: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin" | "employee"
  location?: string[]
  rights?: string[]
  managedRoles?: string[]
  password?: string
}

// Get all users
export async function getUsers(): Promise<{ users: User[] }> {
  return apiFetch<{ users: User[] }>(BASE_URL)
}

// Get user by ID
export async function getUser(id: string): Promise<{ data: User }> {
  return apiFetch<{ data: User }>(`${BASE_URL}/${id}`)
}

// Create user
export async function createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
  return apiFetch<ApiResponse<User>>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update user
export async function updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
  return apiFetch<ApiResponse<User>>(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete user
export async function deleteUser(id: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(`${BASE_URL}/${id}`, { method: 'DELETE' })
}