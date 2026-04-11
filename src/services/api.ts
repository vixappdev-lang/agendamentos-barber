/**
 * API Service Layer
 * Comunicação com o backend PHP (MySQL)
 * Supabase é usado APENAS para autenticação
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

class ApiService {
  private baseUrl: string;
  private tenantId: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  setTenantId(id: string) {
    this.tenantId = id;
  }

  getTenantId() {
    return this.tenantId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/api/${endpoint.replace(/^\//, '')}`);

    // Add tenant_id to GET requests
    if (this.tenantId && (!options.method || options.method === 'GET')) {
      url.searchParams.set('tenant_id', this.tenantId);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    // Add domain header for tenant detection
    headers['X-Tenant-Domain'] = window.location.hostname;

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request<T>(fullEndpoint);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ========== TENANT ==========
  async getTenantByDomain(domain: string) {
    return this.get('tenants', { domain });
  }

  async getTenantBySlug(slug: string) {
    return this.get('tenants', { slug });
  }

  // ========== SERVICES ==========
  async getServices(all = false) {
    return this.get('services', all ? { all: '1' } : {});
  }

  async createService(data: any) {
    return this.post('services', data);
  }

  async updateService(id: string | number, data: any) {
    return this.put(`services/${id}`, data);
  }

  async deleteService(id: string | number) {
    return this.delete(`services/${id}`);
  }

  // ========== BARBERS ==========
  async getBarbers(all = false) {
    return this.get('barbers', all ? { all: '1' } : {});
  }

  async createBarber(data: any) {
    return this.post('barbers', data);
  }

  async updateBarber(id: string | number, data: any) {
    return this.put(`barbers/${id}`, data);
  }

  async deleteBarber(id: string | number) {
    return this.delete(`barbers/${id}`);
  }

  // ========== APPOINTMENTS ==========
  async getAppointments(filters?: Record<string, string>) {
    return this.get('appointments', filters);
  }

  async createAppointment(data: any) {
    return this.post('appointments', data);
  }

  async updateAppointmentStatus(id: string | number, status: string) {
    return this.put(`appointments/${id}`, { status });
  }

  async deleteAppointment(id: string | number) {
    return this.delete(`appointments/${id}`);
  }

  async getOccupiedSlots(date: string) {
    return this.get('appointments/slots', { date });
  }

  // ========== PRODUCTS ==========
  async getProducts(all = false) {
    return this.get('products', all ? { all: '1' } : {});
  }

  async createProduct(data: any) {
    return this.post('products', data);
  }

  async updateProduct(id: string | number, data: any) {
    return this.put(`products/${id}`, data);
  }

  async deleteProduct(id: string | number) {
    return this.delete(`products/${id}`);
  }

  // ========== COUPONS ==========
  async getCoupons() {
    return this.get('coupons');
  }

  async validateCoupon(code: string) {
    return this.post('coupons/validate', { code });
  }

  async createCoupon(data: any) {
    return this.post('coupons', data);
  }

  async updateCoupon(id: string | number, data: any) {
    return this.put(`coupons/${id}`, data);
  }

  async deleteCoupon(id: string | number) {
    return this.delete(`coupons/${id}`);
  }

  // ========== FINANCE ==========
  async getFinanceDashboard(period = 'month') {
    return this.get('finance/dashboard', { period });
  }

  async getBarberRanking(period = 'month') {
    return this.get('finance/ranking', { period });
  }

  async getRevenueChart(days = 14) {
    return this.get('finance/chart', { days: String(days) });
  }

  async getTopServices() {
    return this.get('finance/top-services');
  }

  async getExpenses(period = 'month') {
    return this.get('finance/expenses', { period });
  }

  async addExpense(data: any) {
    return this.post('finance/expenses', data);
  }

  async getCashFlow(period = 'month') {
    return this.get('finance/cash-flow', { period });
  }

  // ========== SETTINGS ==========
  async getSettings() {
    return this.get('settings');
  }

  async updateSettings(data: Record<string, string>) {
    return this.post('settings/update', data);
  }

  // ========== DATABASE CONFIG ==========
  async getDatabaseConfig() {
    return this.get('database');
  }

  async testDatabaseConnection(data: any) {
    return this.post('database/test-connection', data);
  }

  async saveDatabaseConfig(data: any) {
    return this.post('database/save-config', data);
  }
}

export const api = new ApiService();
export default api;
