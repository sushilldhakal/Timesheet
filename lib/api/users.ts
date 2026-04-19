import { apiFetch } from './fetch-client'
import type { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest,
  UsersListResponse,
  UserCreateResponse,
  SingleUserResponse,
  UserUpdateResponse,
  UserDeleteResponse
} from '@/lib/types/user'

const BASE_URL = '/api/users'

// Get all users
export async function getUsers(): Promise<UsersListResponse> {
  return apiFetch<UsersListResponse>(BASE_URL)
}

// Get user by ID
export async function getUser(id: string): Promise<SingleUserResponse> {
  return apiFetch<SingleUserResponse>(`${BASE_URL}/${id}`)
}

// Create user
export async function createUser(data: CreateUserRequest): Promise<UserCreateResponse> {
  return apiFetch<UserCreateResponse>(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update user
export async function updateUser(id: string, data: UpdateUserRequest): Promise<UserUpdateResponse> {
  return apiFetch<UserUpdateResponse>(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete user
export async function deleteUser(id: string): Promise<UserDeleteResponse> {
  return apiFetch<UserDeleteResponse>(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  })
}