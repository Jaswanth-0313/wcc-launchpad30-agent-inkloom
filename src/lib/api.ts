import { supabase } from './supabase'

export type ProjectRecord = {
  _id?: string
  userId?: string
  project: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiBaseUrl) throw new Error('The backend URL is not configured. Set VITE_API_BASE_URL for API features.')

  const { data } = await supabase.auth.getSession()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`)

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Backend request failed with status ${response.status}.`)
  return payload as T
}

export function analyzeProject(problem: string, context: Record<string, unknown> = {}) {
  return request<{ analysis: Record<string, unknown> }>('/api/ai/analyze', {
    method: 'POST',
    body: JSON.stringify({ problem, context }),
  })
}

export function listProjects() {
  return request<{ projects: ProjectRecord[] }>('/api/projects')
}

export function getProject(id: string) {
  return request<{ project: ProjectRecord }>(`/api/projects/${encodeURIComponent(id)}`)
}

export function createProject(project: Record<string, unknown>) {
  return request<{ id: string }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ project }),
  })
}

export function updateProject(id: string, project: Record<string, unknown>) {
  return request<{ id: string }>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ project }),
  })
}

export function deleteProject(id: string) {
  return request<void>(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
