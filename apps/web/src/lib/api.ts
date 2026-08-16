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
    if (res.status === 204) return {} as T;
    return res.json() as T;
  }

  private async requestRaw(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return fetch(`${API_URL}${endpoint}`, { ...options, headers });
  }

  // ─── Auth ───────────────────────────────────────────────
  async login(email: string, password: string) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  }
  async register(data: { name: string; email: string; password: string }) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }
  async logout() { return this.request('/auth/logout', { method: 'POST' }); }
  async refreshToken(refreshToken: string) {
    return this.request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  }
  async getProfile() { return this.request('/auth/profile'); }
  async getUsers() { return this.request('/auth/users'); }
  async updateUserRole(userId: string, role: string) {
    return this.request(`/auth/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
  }
  async requestEmailVerification() {
    return this.request('/auth/verify-email/request', { method: 'POST' });
  }
  async verifyEmail(token: string) {
    return this.request('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
  }
  async requestPasswordReset(email: string) {
    return this.request('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
  }
  async resetPassword(token: string, password: string) {
    return this.request('/auth/password-reset', { method: 'POST', body: JSON.stringify({ token, password }) });
  }
  async forgotPassword(email: string) {
    return this.request('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
  }

  // ─── Campaigns ──────────────────────────────────────────
  async getCampaigns(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/campaigns${q}`);
  }
  async getCampaign(id: string) { return this.request(`/campaigns/${id}`); }
  async getCampaignStats(id: string) { return this.request(`/campaigns/${id}/stats`); }
  async createCampaign(data: any) {
    return this.request('/campaigns', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateCampaign(id: string, data: any) {
    return this.request(`/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deleteCampaign(id: string) {
    return this.request(`/campaigns/${id}`, { method: 'DELETE' });
  }
  async executeCampaign(id: string) {
    return this.request(`/campaigns/${id}/execute`, { method: 'POST' });
  }
  async pauseCampaign(id: string) {
    return this.request(`/campaigns/${id}/pause`, { method: 'POST' });
  }
  async cancelCampaign(id: string) {
    return this.request(`/campaigns/${id}/cancel`, { method: 'POST' });
  }
  async getCampaignExecutions(id: string) {
    return this.request(`/campaigns/${id}/executions`);
  }
  async getExecutionStatus(executionId: string) {
    return this.request(`/campaigns/executions/${executionId}`);
  }
  async getCampaignAnalytics(id: string) {
    return this.request(`/campaigns/${id}/analytics`);
  }
  async cloneCampaign(id: string, data: any) {
    return this.request(`/campaigns/${id}/clone`, { method: 'POST', body: JSON.stringify(data) });
  }

  // ─── Platforms ──────────────────────────────────────────
  async getPlatforms() { return this.request('/platforms'); }
  async getPlatform(id: string) { return this.request(`/platforms/${id}`); }
  async getPlatformsByType(platform: string) { return this.request(`/platforms/platform/${platform}`); }
  async createPlatform(data: any) {
    return this.request('/platforms', { method: 'POST', body: JSON.stringify(data) });
  }
  async updatePlatform(id: string, data: any) {
    return this.request(`/platforms/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deletePlatform(id: string) {
    return this.request(`/platforms/${id}`, { method: 'DELETE' });
  }
  async createPost(platformId: string, data: any) {
    return this.request(`/platforms/${platformId}/posts`, { method: 'POST', body: JSON.stringify(data) });
  }
  async getPosts(platformId: string) { return this.request(`/platforms/${platformId}/posts`); }
  async getPost(platformId: string, postId: string) {
    return this.request(`/platforms/${platformId}/posts/${postId}`);
  }
  async deletePost(platformId: string, postId: string) {
    return this.request(`/platforms/${platformId}/posts/${postId}`, { method: 'DELETE' });
  }
  async publishToMultiple(platformId: string, data: any) {
    return this.request(`/platforms/${platformId}/publish`, { method: 'POST', body: JSON.stringify(data) });
  }
  async refreshPlatformToken(platformId: string) {
    return this.request(`/platforms/${platformId}/refresh-token`, { method: 'POST' });
  }
  async postToPlatform(id: string, data: any) {
    return this.request(`/platforms/${id}/post`, { method: 'POST', body: JSON.stringify(data) });
  }
  async getPlatformProfile(id: string) { return this.request(`/platforms/${id}/profile`); }

  // ─── Automation ─────────────────────────────────────────
  async createBrowserSession(data?: any) {
    return this.request('/automation/sessions', { method: 'POST', body: JSON.stringify(data || {}) });
  }
  async getBrowserSession(sessionId: string) { return this.request(`/automation/sessions/${sessionId}`); }
  async closeBrowserSession(sessionId: string) {
    return this.request(`/automation/sessions/${sessionId}`, { method: 'DELETE' });
  }
  async navigateSession(sessionId: string, url: string) {
    return this.request(`/automation/sessions/${sessionId}/navigate`, { method: 'POST', body: JSON.stringify({ url }) });
  }
  async executeScript(sessionId: string, script: string) {
    return this.request(`/automation/sessions/${sessionId}/execute`, { method: 'POST', body: JSON.stringify({ script }) });
  }
  async takeScreenshot(sessionId: string) {
    return this.request(`/automation/sessions/${sessionId}/screenshot`, { method: 'POST' });
  }
  async getAutomationStats() { return this.request('/automation/stats'); }
  async getAutomationSessions() { return this.request('/automation/sessions'); }
  async createAutomationSession(data: any) {
    return this.request('/automation/sessions', { method: 'POST', body: JSON.stringify(data) });
  }
  async navigateAutomation(sessionId: string, url: string) {
    return this.request(`/automation/sessions/${sessionId}/navigate`, { method: 'POST', body: JSON.stringify({ url }) });
  }
  async screenshotAutomation(sessionId: string) {
    return this.request(`/automation/sessions/${sessionId}/screenshot`, { method: 'POST' });
  }
  async executeAutomationScript(sessionId: string, script: string) {
    return this.request(`/automation/sessions/${sessionId}/execute`, { method: 'POST', body: JSON.stringify({ script }) });
  }
  async closeAutomationSession(sessionId: string) {
    return this.request(`/automation/sessions/${sessionId}`, { method: 'DELETE' });
  }

  // ─── AI ─────────────────────────────────────────────────
  async getAiStatus() { return this.request('/ai/status'); }
  async generatePost(data: { topic: string; platform?: string; tone?: string; length?: string; includeHashtags?: boolean }) {
    return this.request('/ai/generate/post', { method: 'POST', body: JSON.stringify(data) });
  }
  async generateVariations(data: { topic: string; platform?: string; tone?: string; count?: number }) {
    return this.request('/ai/generate/variations', { method: 'POST', body: JSON.stringify(data) });
  }
  async generateHashtags(data: { topic: string; count?: number; platform?: string }) {
    return this.request('/ai/generate/hashtags', { method: 'POST', body: JSON.stringify(data) });
  }
  async generateCaption(data: { imageDescription: string; tone?: string; platform?: string; includeHashtags?: boolean }) {
    return this.request('/ai/generate/caption', { method: 'POST', body: JSON.stringify(data) });
  }
  async generateFromTemplate(data: { template: string; variables?: Record<string, string> }) {
    return this.request('/ai/generate/template', { method: 'POST', body: JSON.stringify(data) });
  }
  async getSuggestions(data: { topic: string; count?: number }) {
    return this.request('/ai/suggestions', { method: 'POST', body: JSON.stringify(data) });
  }
  async translateText(data: { text: string; targetLanguage: string }) {
    return this.request('/ai/translate', { method: 'POST', body: JSON.stringify(data) });
  }
  async improveContent(data: { text: string; improvements?: string[] }) {
    return this.request('/ai/improve', { method: 'POST', body: JSON.stringify(data) });
  }
  async analyzeSentiment(text: string) {
    return this.request('/ai/analyze/sentiment', { method: 'POST', body: JSON.stringify({ text }) });
  }
  // AI Orchestration
  async executeAiTask(data: { prompt: string; taskType?: string; complexity?: string }) {
    return this.request('/ai/execute', { method: 'POST', body: JSON.stringify(data) });
  }
  async executeAiBatch(tasks: any[]) {
    return this.request('/ai/execute-batch', { method: 'POST', body: JSON.stringify({ tasks }) });
  }
  async getAiModels() { return this.request('/ai/models'); }
  async getAiModel(id: string) { return this.request(`/ai/models/${id}`); }
  async getAiModelsByTier(tier: string) { return this.request(`/ai/models/tier/${tier}`); }
  async getAiModelsByProvider(provider: string) { return this.request(`/ai/models/provider/${provider}`); }
  async getAiCostAnalytics() { return this.request('/ai/cost/analytics'); }
  async getAiCostSavings() { return this.request('/ai/cost/savings'); }
  async getAiUserSpending(userId: string) { return this.request(`/ai/cost/user/${userId}`); }
  async getAiCacheStats() { return this.request('/ai/cache/statistics'); }
  async getAiTopCached() { return this.request('/ai/cache/top'); }
  async clearAiCache() { return this.request('/ai/cache/clear', { method: 'POST' }); }
  async getAiBudgetStatus() { return this.request('/ai/budget/status'); }
  async getAiBudgetProjection() { return this.request('/ai/budget/projection'); }
  async setAiBudget(data: any) { return this.request('/ai/budget/set', { method: 'POST', body: JSON.stringify(data) }); }
  async getAiTaskTemplates() { return this.request('/ai/tasks/templates'); }
  async getAiHealth() { return this.request('/ai/health'); }
  async initializeAiModels() { return this.request('/ai/models/initialize', { method: 'POST' }); }

  // ─── Analytics ──────────────────────────────────────────
  async getAnalyticsOverview(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/analytics/overview${q}`);
  }
  async getPlatformAnalytics(platform: string) { return this.request(`/analytics/platforms/${platform}`); }
  async getCampaignAnalyticsById(id: string) { return this.request(`/analytics/campaigns/${id}`); }
  async getEngagementStats(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/analytics/engagement${q}`);
  }
  async getGrowthStats(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/analytics/growth${q}`);
  }
  async getTopPosts(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/analytics/top-posts${q}`);
  }
  async getContentPerformance() { return this.request('/analytics/content-performance'); }
  async exportAnalytics(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.requestRaw(`/analytics/export${q}`);
  }

  // ─── Leads ──────────────────────────────────────────────
  async getLeads(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/leads${q}`);
  }
  async getLead(id: string) { return this.request(`/leads/${id}`); }
  async createLead(data: any) {
    return this.request('/leads', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateLead(id: string, data: any) {
    return this.request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async deleteLead(id: string) {
    return this.request(`/leads/${id}`, { method: 'DELETE' });
  }
  async collectLeads(data: { source: string; query: string; location?: string; limit?: number }) {
    return this.request('/leads/collect', { method: 'POST', body: JSON.stringify(data) });
  }
  async collectMapsLeads(data: { searchQuery: string; location: string; maxResults: number }) {
    return this.request('/leads/collect/maps', { method: 'POST', body: JSON.stringify(data) });
  }
  async enrichLeads(leadIds: string[]) {
    return this.request('/leads/enrich', { method: 'POST', body: JSON.stringify({ leadIds }) });
  }
  async importLeads(leads: any[]) {
    return this.request('/leads/import', { method: 'POST', body: JSON.stringify({ leads }) });
  }
  async getLeadCollections() { return this.request('/leads/collections'); }

  // ─── Workflows ──────────────────────────────────────────
  async getWorkflows() { return this.request('/workflows'); }
  async getWorkflow(id: string) { return this.request(`/workflows/${id}`); }
  async createWorkflow(data: any) {
    return this.request('/workflows', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateWorkflow(id: string, data: any) {
    return this.request(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deleteWorkflow(id: string) {
    return this.request(`/workflows/${id}`, { method: 'DELETE' });
  }
  async executeWorkflow(id: string) {
    return this.request(`/workflows/${id}/execute`, { method: 'POST' });
  }
  async getWorkflowExecutions(id: string) { return this.request(`/workflows/${id}/executions`); }
  async getWorkflowExecution(id: string) { return this.request(`/workflows/executions/${id}`); }

  // ─── Reports ────────────────────────────────────────────
  async getReports() { return this.request('/reports'); }
  async getReport(id: string) { return this.request(`/reports/${id}`); }
  async deleteReport(id: string) { return this.request(`/reports/${id}`, { method: 'DELETE' }); }
  async downloadReport(id: string) { return this.requestRaw(`/reports/${id}/download`); }
  async generateCampaignReport(campaignId: string) {
    return this.request(`/reports/campaign/${campaignId}`, { method: 'POST' });
  }
  async generatePlatformReport(platform: string) {
    return this.request(`/reports/platform/${platform}`, { method: 'POST' });
  }
  async generateEngagementReport() {
    return this.request('/reports/engagement', { method: 'POST' });
  }
  async scheduleReport(data: any) {
    return this.request('/reports/schedule', { method: 'POST', body: JSON.stringify(data) });
  }
  async getScheduledReports() { return this.request('/reports/schedules'); }
  async updateReportSchedule(id: string, data: any) {
    return this.request(`/reports/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deleteReportSchedule(id: string) {
    return this.request(`/reports/schedules/${id}`, { method: 'DELETE' });
  }
  async toggleReportSchedule(id: string) {
    return this.request(`/reports/schedules/${id}/toggle`, { method: 'POST' });
  }

  // ─── Notifications ──────────────────────────────────────
  async getNotifications(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/notifications${q}`);
  }
  async getUnreadCount() { return this.request('/notifications/unread-count'); }
  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'POST' });
  }
  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'POST' });
  }
  async deleteNotification(id: string) {
    return this.request(`/notifications/${id}`, { method: 'DELETE' });
  }
  async deleteAllNotifications() {
    return this.request('/notifications', { method: 'DELETE' });
  }

  // ─── Settings ───────────────────────────────────────────
  async getSettings() { return this.request('/settings'); }
  async updateSettings(data: any) {
    return this.request('/settings', { method: 'PATCH', body: JSON.stringify(data) });
  }
  async updateNotificationSettings(data: any) {
    return this.request('/settings/notifications', { method: 'PATCH', body: JSON.stringify(data) });
  }
  async getTeamMembers() { return this.request('/settings/team'); }
  async inviteTeamMember(data: { email: string; role: string }) {
    return this.request('/settings/team/invite', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateTeamMemberRole(memberId: string, role: string) {
    return this.request(`/settings/team/${memberId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
  }
  async removeTeamMember(memberId: string) {
    return this.request(`/settings/team/${memberId}`, { method: 'DELETE' });
  }
  async getTeamActivityLogs() { return this.request('/settings/team/logs'); }

  // ─── Storage ────────────────────────────────────────────
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${API_URL}/storage/upload`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }
  async getMediaFiles() { return this.request('/storage/media'); }
  async getMediaFile(id: string) { return this.request(`/storage/media/${id}`); }
  async getMediaUrl(id: string) { return this.request(`/storage/media/${id}/url`); }
  async deleteMediaFile(id: string) { return this.request(`/storage/media/${id}`, { method: 'DELETE' }); }

  // ─── Webhooks ───────────────────────────────────────────
  async getWebhooks() { return this.request('/webhooks'); }
  async getWebhook(id: string) { return this.request(`/webhooks/${id}`); }
  async createWebhook(data: any) {
    return this.request('/webhooks', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateWebhook(id: string, data: any) {
    return this.request(`/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deleteWebhook(id: string) {
    return this.request(`/webhooks/${id}`, { method: 'DELETE' });
  }
  async testWebhook(id: string) {
    return this.request(`/webhooks/${id}/test`, { method: 'POST' });
  }
  async getWebhookLogs(id: string) { return this.request(`/webhooks/${id}/logs`); }
  async getWebhookStats() { return this.request('/webhooks/stats'); }

  // ─── API Keys ───────────────────────────────────────────
  async getApiKeys() { return this.request('/api-keys'); }
  async getApiKey(id: string) { return this.request(`/api-keys/${id}`); }
  async createApiKey(data: { name: string; permissions?: string[] }) {
    return this.request('/api-keys', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateApiKey(id: string, data: any) {
    return this.request(`/api-keys/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deleteApiKey(id: string) { return this.request(`/api-keys/${id}`, { method: 'DELETE' }); }
  async revokeApiKey(id: string) { return this.request(`/api-keys/${id}/revoke`, { method: 'POST' }); }
  async rotateApiKey(id: string) { return this.request(`/api-keys/${id}/rotate`, { method: 'POST' }); }

  // ─── Research ───────────────────────────────────────────
  async conductResearch(data: any) {
    return this.request('/research/conduct', { method: 'POST', body: JSON.stringify(data) });
  }
  async quickResearch(data: { company: string }) {
    return this.request('/research/quick', { method: 'POST', body: JSON.stringify(data) });
  }
  async deepResearch(data: { url: string }) {
    return this.request('/research/deep', { method: 'POST', body: JSON.stringify(data) });
  }
  async findEmail(data: { firstName: string; lastName: string; domain: string }) {
    return this.request('/research/email/find', { method: 'POST', body: JSON.stringify(data) });
  }
  async verifyEmail(data: { email: string }) {
    return this.request('/research/email/verify', { method: 'POST', body: JSON.stringify(data) });
  }
  async bulkFindEmails(data: { contacts: any[] }) {
    return this.request('/research/email/bulk', { method: 'POST', body: JSON.stringify(data) });
  }
  async getCompanyInfo(data: { domain: string }) {
    return this.request('/research/company/info', { method: 'POST', body: JSON.stringify(data) });
  }
  async bulkCompanyEnrichment(data: { domains: string[] }) {
    return this.request('/research/company/bulk', { method: 'POST', body: JSON.stringify(data) });
  }
  async generateLeads(data: any) {
    return this.request('/research/leads/generate', { method: 'POST', body: JSON.stringify(data) });
  }
  async searchDatasets(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/research/datasets/search${q}`);
  }
  async getB2BDatasets() { return this.request('/research/datasets/b2b'); }
  async getPopularDatasets() { return this.request('/research/datasets/popular'); }
  async downloadDataset(data: { slug: string }) {
    return this.request('/research/datasets/download', { method: 'POST', body: JSON.stringify(data) });
  }
  async scrapeWebsite(data: { url: string }) {
    return this.request('/research/scrape/website', { method: 'POST', body: JSON.stringify(data) });
  }
  async scrapeEmails(data: { url: string }) {
    return this.request('/research/scrape/emails', { method: 'POST', body: JSON.stringify(data) });
  }
  async scrapePhones(data: { url: string }) {
    return this.request('/research/scrape/phones', { method: 'POST', body: JSON.stringify(data) });
  }
  async scrapeSocial(data: { url: string }) {
    return this.request('/research/scrape/social', { method: 'POST', body: JSON.stringify(data) });
  }
  async deepCrawl(data: { url: string; depth?: number }) {
    return this.request('/research/scrape/deep', { method: 'POST', body: JSON.stringify(data) });
  }
  async getResearchStatus() { return this.request('/research/status'); }

  // ─── LinkedIn ───────────────────────────────────────────
  async searchLinkedIn(data: { query: string; filters?: any }) {
    return this.request('/linkedin/search', { method: 'POST', body: JSON.stringify(data) });
  }
  async getLinkedInProfiles() { return this.request('/linkedin/profiles'); }
  async getLinkedInProfile(publicIdentifier: string) {
    return this.request(`/linkedin/profiles/${publicIdentifier}`);
  }
  async sendLinkedInConnection(data: { profileId: string; message?: string }) {
    return this.request('/linkedin/connect', { method: 'POST', body: JSON.stringify(data) });
  }
  async sendLinkedInMessage(data: { profileId: string; message: string }) {
    return this.request('/linkedin/message', { method: 'POST', body: JSON.stringify(data) });
  }
  async getLinkedInMessages() { return this.request('/linkedin/messages'); }
  async getLinkedInMessagesByProfile(profileId: string) {
    return this.request(`/linkedin/messages/profile/${profileId}`);
  }
  async getLinkedInStatistics() { return this.request('/linkedin/statistics'); }
  async createLinkedInSession(data: any) {
    return this.request('/linkedin/session', { method: 'POST', body: JSON.stringify(data) });
  }
  async getActiveLinkedInSession() { return this.request('/linkedin/session/active'); }

  // ─── Linkout (Email Finder) ─────────────────────────────
  async findEmailLinkout(data: { firstName: string; lastName: string; company: string; domain?: string }) {
    return this.request('/linkout/find-email', { method: 'POST', body: JSON.stringify(data) });
  }
  async findBulkEmails(data: { contacts: any[] }) {
    return this.request('/linkout/find-bulk', { method: 'POST', body: JSON.stringify(data) });
  }
  async getLinkoutResults() { return this.request('/linkout/results'); }
  async getLinkoutResultsByLead(leadId: string) { return this.request(`/linkout/results/lead/${leadId}`); }
  async getLinkoutStatistics() { return this.request('/linkout/statistics'); }
  async enrichLead(leadId: string) {
    return this.request(`/linkout/enrich-lead/${leadId}`, { method: 'POST' });
  }

  // ─── Admin ──────────────────────────────────────────────
  async getAdminUsers() { return this.request('/admin/users'); }
  async getAdminUserStatistics() { return this.request('/admin/users/statistics'); }
  async suspendUser(userId: string) { return this.request(`/admin/users/${userId}/suspend`, { method: 'POST' }); }
  async enableUser(userId: string) { return this.request(`/admin/users/${userId}/enable`, { method: 'POST' }); }
  async setUserExpiration(userId: string, data: { expiresAt: string }) {
    return this.request(`/admin/users/${userId}/expiration`, { method: 'POST', body: JSON.stringify(data) });
  }
  async deleteUser(userId: string) { return this.request(`/admin/users/${userId}`, { method: 'DELETE' }); }
  async bulkSuspendUsers(userIds: string[]) {
    return this.request('/admin/users/bulk-suspend', { method: 'POST', body: JSON.stringify({ userIds }) });
  }
  async getRoles() { return this.request('/admin/roles'); }
  async getDefaultRole() { return this.request('/admin/roles/default'); }
  async createRole(data: any) { return this.request('/admin/roles', { method: 'POST', body: JSON.stringify(data) }); }
  async updateRole(roleId: string, data: any) {
    return this.request(`/admin/roles/${roleId}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async deleteRole(roleId: string) { return this.request(`/admin/roles/${roleId}`, { method: 'DELETE' }); }
  async assignRole(userId: string, roleId: string) {
    return this.request(`/admin/users/${userId}/roles/${roleId}`, { method: 'POST' });
  }
  async removeRole(userId: string, roleId: string) {
    return this.request(`/admin/users/${userId}/roles/${roleId}`, { method: 'DELETE' });
  }
  async getUserRoles(userId: string) { return this.request(`/admin/users/${userId}/roles`); }
  async getAllPermissions() { return this.request('/admin/permissions'); }
  async getGroupedPermissions() { return this.request('/admin/permissions/grouped'); }
  async getPermissionCategories() { return this.request('/admin/permissions/categories'); }
  async checkPermission(data: { userId: string; permission: string }) {
    return this.request('/admin/permissions/check', { method: 'POST', body: JSON.stringify(data) });
  }
  async getUserUsage(userId: string) { return this.request(`/admin/usage/${userId}`); }
  async getUserUsageStatistics(userId: string) { return this.request(`/admin/usage/${userId}/statistics`); }
  async getUserUsageHistory(userId: string) { return this.request(`/admin/usage/${userId}/history`); }
  async setUsageLimits(userId: string, data: any) {
    return this.request(`/admin/usage/${userId}/limits`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async trackUsage(userId: string, data: any) {
    return this.request(`/admin/usage/${userId}/track`, { method: 'POST', body: JSON.stringify(data) });
  }
  async getNearLimitAlerts() { return this.request('/admin/usage/alerts/near-limits'); }
  async getUserSessions(userId: string) { return this.request(`/admin/sessions/user/${userId}`); }
  async revokeSession(sessionId: string) {
    return this.request(`/admin/sessions/${sessionId}/revoke`, { method: 'POST' });
  }
  async revokeAllSessions(userId: string) {
    return this.request(`/admin/sessions/user/${userId}/revoke-all`, { method: 'POST' });
  }
  async getAuditTrail(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/admin/audit${q}`);
  }
  async getAuditByResource(resource: string) { return this.request(`/admin/audit/resource/${resource}`); }
  async getAuditStatistics() { return this.request('/admin/audit/statistics'); }
  async searchAudit(params: Record<string, string>) {
    const q = '?' + new URLSearchParams(params).toString();
    return this.request(`/admin/audit/search${q}`);
  }

  // ─── Data Orchestration ─────────────────────────────────
  async executeDataQuery(data: { query: string; sources?: string[] }) {
    return this.request('/data/query', { method: 'POST', body: JSON.stringify(data) });
  }
  async planDataQuery(data: { query: string }) {
    return this.request('/data/query/plan', { method: 'POST', body: JSON.stringify(data) });
  }
  async getDataSources() { return this.request('/data/sources'); }
  async getDataSourceStats() { return this.request('/data/sources/statistics'); }
  async toggleDataSource(slug: string) {
    return this.request(`/data/sources/${slug}/toggle`, { method: 'POST' });
  }
  async getDataWorkflowStatus(id: string) { return this.request(`/data/workflows/${id}/status`); }
  async cancelDataWorkflow(id: string) {
    return this.request(`/data/workflows/${id}/cancel`, { method: 'POST' });
  }
  async getDataPlanStats() { return this.request('/data/plans/statistics'); }
  async getDataCacheStats() { return this.request('/data/cache/statistics'); }
  async getDataCacheHitRate() { return this.request('/data/cache/hit-rate'); }
  async clearDataCache() { return this.request('/data/cache/clear', { method: 'POST' }); }
  async getDataExamples() { return this.request('/data/examples'); }
  async getDataHealth() { return this.request('/data/health'); }

  // ─── Schedules ──────────────────────────────────────────
  async getSchedules() { return this.request('/schedules'); }
  async getSchedule(id: string) { return this.request(`/schedules/${id}`); }
  async createSchedule(data: any) {
    return this.request('/schedules', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateSchedule(id: string, data: any) {
    return this.request(`/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deleteSchedule(id: string) { return this.request(`/schedules/${id}`, { method: 'DELETE' }); }
  async toggleSchedule(id: string) { return this.request(`/schedules/${id}/toggle`, { method: 'POST' }); }

  // ─── Health ─────────────────────────────────────────────
  async healthCheck() { return this.request('/health'); }
  async healthDb() { return this.request('/health/db'); }
  async healthRedis() { return this.request('/health/redis'); }
}

export const api = new ApiClient();
export default api;
