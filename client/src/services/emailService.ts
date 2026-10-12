import api from '../lib/api';
import { Email, Account } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EWSConfig {
  url: string;
  auth: {
    username: string;
    password: string;
  };
}

export class EmailService {
  async login(credentials: LoginCredentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  }

  async logout() {
    await api.post('/auth/logout');
  }

  async getAccounts() {
    const response = await api.get('/accounts');
    return response.data as Account[];
  }

  async addAccount(account: Partial<Account> & IMAPConfig | EWSConfig) {
    const response = await api.post('/accounts', account);
    return response.data as Account;
  }

  async removeAccount(id: string) {
    await api.delete(`/accounts/${id}`);
  }

  async getFolders(accountId?: string) {
    const response = await api.get('/folders', {
      params: accountId ? { accountId } : {},
    });
    return response.data;
  }

  async getEmails(params: {
    folder?: string;
    page?: number;
    limit?: number;
    search?: string;
    accountId?: string;
  }) {
    const response = await api.get('/emails', { params });
    return response.data as Email[];
  }

  async getEmail(id: string) {
    const response = await api.get(`/emails/${id}`);
    return response.data as Email;
  }

  async markAsRead(id: string, read: boolean) {
    await api.patch(`/emails/${id}`, { isRead: read });
  }

  async toggleStar(id: string) {
    await api.patch(`/emails/${id}`, { isStarred: true });
  }

  async delete(id: string) {
    await api.delete(`/emails/${id}`);
  }

  async sendEmail(data: {
    accountId: string;
    to: string;
    subject: string;
    body: string;
    html?: string;
    attachments?: File[];
  }) {
    const formData = new FormData();
    formData.append('to', data.to);
    formData.append('subject', data.subject);
    formData.append('body', data.body);
    if (data.html) formData.append('html', data.html);
    if (data.accountId) formData.append('accountId', data.accountId);
    
    if (data.attachments) {
      data.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await api.post('/emails/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

export const emailService = new EmailService();
