import type { AdminAnalytics } from '@/app/api/admin/analytics/route';

export type { AdminAnalytics };

export interface AdminUser {
  id: string;
  email: string | null;
  displayName: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  accessMode: string;
  createdAt: string;
  totalReadings: number;
  totalCharts: number;
  readingsThisMonth: number;
  chartsThisMonth: number;
}

interface ListUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
}

interface ToggleAdminResponse {
  success: boolean;
  message: string;
  userId: string;
  makeAdmin: boolean;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
  userId: string;
}

class AdminApi {
  async listUsers(page: number = 1, perPage: number = 20): Promise<ListUsersResponse> {
    const res = await fetch(`/api/admin/users?page=${page}&perPage=${perPage}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить пользователей');
    return data;
  }

  async getAnalytics(): Promise<AdminAnalytics> {
    const res = await fetch('/api/admin/analytics');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить аналитику');
    return data as AdminAnalytics;
  }

  async toggleAdmin(userId: string, isAdmin: boolean): Promise<ToggleAdminResponse> {
    const res = await fetch(`/api/admin/users/${userId}/admin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ makeAdmin: isAdmin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось изменить права администратора');
    return data;
  }

  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось удалить пользователя');
    return data;
  }
}

export const adminApi = new AdminApi();
