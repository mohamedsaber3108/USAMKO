const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) { this.token = token; }
  clearToken() { this.token = null; }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Request failed');
    }
    return res.json() as T;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  }
  async register(data: any) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }
  async refreshToken(refreshToken: string) {
    return this.request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  }

  // Campaigns
  async getCampaigns() { return this.request('/campaigns'); }
  async createCampaign(data: any) {
    return this.request('/campaigns', { method: 'POST', body: JSON.stringify(data) });
  }
  async startCampaign(id: string) {
    return this.request(`/campaigns/${id}/start`, { method: 'POST' });
  }
  async pauseCampaign(id: string) {
    return this.request(`/campaigns/${id}/pause`, { method: 'POST' });
  }

  // Platforms
  async getPlatforms() { return this.request('/platforms'); }
  async connectPlatform(data: any) {
    return this.request('/platforms/connect', { method: 'POST', body: JSON.stringify(data) });
  }

  // Analytics
  async getAnalyticsOverview(params?: string) {
    return this.request(`/analytics/overview${params ? '?' + params : ''}`);
  }
  async getPlatformStats(platform?: string) {
    return this.request(`/analytics/platforms/${platform || ''}`);
  }

  // AI
  async generatePost(data: any) {
    return this.request('/ai/generate/post', { method: 'POST', body: JSON.stringify(data) });
  }
  async generateImage(data: any) {
    return this.request('/ai/generate/image', { method: 'POST', body: JSON.stringify(data) });
  }
  async translateText(data: any) {
    return this.request('/ai/translate', { method: 'POST', body: JSON.stringify(data) });
  }

  // Reports
  async getReports() { return this.request('/reports'); }
  async generateReport(data: any) {
    return this.request('/reports/generate', { method: 'POST', body: JSON.stringify(data) });
  }

  // Notifications
  async getNotifications() { return this.request('/notifications'); }
  async markAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  // Settings
  async getSettings() { return this.request('/settings'); }
  async updateSettings(data: any) {
    return this.request('/settings', { method: 'PATCH', body: JSON.stringify(data) });
  }

  // Health
  async healthCheck() { return this.request('/health'); }
}

export const api = new ApiClient();
export default api;
