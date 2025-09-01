// Centralized API utility with authentication
interface User {
  id: string;
  email: string;
  name: string;
}

class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(user?: User | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (user) {
      headers['X-User-Data'] = JSON.stringify(user);
    }
    
    return headers;
  }

  async get(endpoint: string, user?: User | null): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(user),
    });
  }

  async post(endpoint: string, data: any, user?: User | null): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(user),
      body: JSON.stringify(data),
    });
  }

  async put(endpoint: string, data: any, user?: User | null): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(user),
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint: string, user?: User | null): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(user),
    });
  }
}

export const api = new ApiClient();