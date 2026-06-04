const BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request(path: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || `API Error: ${res.status}`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return res.json();
    }
    return null;
  }

  async get<T = any>(path: string): Promise<T> {
    return this.request(path, { method: 'GET' });
  }

  async post<T = any>(path: string, body?: any): Promise<T> {
    return this.request(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(path: string, body?: any): Promise<T> {
    return this.request(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async del<T = any>(path: string): Promise<T> {
    return this.request(path, { method: 'DELETE' });
  }

  createWebSocket(path: string): WebSocket {
    const wsUrl = this.baseUrl
      ? this.baseUrl.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
    const token = this.getToken();
    return new WebSocket(`${wsUrl}${path}${token ? `?token=${token}` : ''}`);
  }
}

export const api = new ApiClient(BASE_URL);
