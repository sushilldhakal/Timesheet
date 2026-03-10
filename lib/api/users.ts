import { ApiResponse } from '@/lib/utils/api/api-response'

const BASE_URL = '/api/users'

export interface User {
  id: string
  name: string
  username: string
  email?: string
  role: "admin" | "user"
  location: string[]
  rights: string[]
  managedRoles?: string[]
  createdAt?: string
}

export interface CreateUserRequest {
  name: string
  username: string
  email?: string
  role?: "admin" | "user"
  location: string[]
  rights: string[]
  managedRoles?: string[]
  password?: string
  employeeId?: string
}

export interface UpdateUserRequest {
  name?: string
  username?: string
  email?: string
  role?: "admin" | "user"
  location?: string[]
  rights?: string[]
  managedRoles?: string[]
  password?: string
}

// Get all users
export async function getUsers(): Promise<{ users: User[] }> {
  const response = await fetch(BASE_URL, {
    credentials: 'include',
  })
  return response.json()
}

// Get user by ID
export async function getUser(id: string): Promise<{ data: User }> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    credentials: 'include',
  })
  return response.json()
}

// Create user
export async function createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Update user
export async function updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Delete user
export async function deleteUser(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return response.json()
}