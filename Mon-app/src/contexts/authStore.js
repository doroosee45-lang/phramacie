import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const { data } = await api.post('/auth/login', credentials);
        if (data.requiresMfa) return { requiresMfa: true, userId: data.userId };
        set({ user: data.user, token: data.token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        return { success: true };
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      },

      refreshToken: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return get().logout();
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          set({ token: data.token });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        } catch { get().logout(); }
      },

      updateUser: (updates) => set(s => ({ user: { ...s.user, ...updates } })),

      hasRole: (...roles) => roles.includes(get().user?.role),
      hasModule: (...modules) => modules.includes(get().user?.module) || get().user?.role === 'super_admin',
      isAdmin: () => ['super_admin','admin'].includes(get().user?.role),
      isSuperAdmin: () => get().user?.role === 'super_admin',
    }),
    { name: 'pharmaerp-auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);

export default useAuthStore;
