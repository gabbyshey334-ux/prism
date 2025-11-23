import axios from 'axios';
import { auth as firebaseAuth } from '@/lib/firebaseClient';
import { signOut } from 'firebase/auth';

// Development mode - bypass auth (safe checks for non-browser/SSR contexts)
const IS_BROWSER = typeof window !== 'undefined';
const DEV_MODE = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
const BYPASS_AUTH = false; // Set to false when ready to test real auth

// Create axios instance
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  || (import.meta.env && import.meta.env.PROD ? 'https://api.prism-app.com/api' : 'http://localhost:4000/api');
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Token management
let currentUser = null;
let authToken = null;
const DEV_BRANDS = [];

// Auth API
export const auth = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    currentUser = response.data.user;
    authToken = response.data.token;
    // Store token in localStorage
    if (authToken) {
      localStorage.setItem('auth_token', authToken);
    }
    return response.data;
  },
  
  register: async (email, password, userData) => {
    const response = await api.post('/auth/register', { email, password, ...userData });
    currentUser = response.data.user;
    authToken = response.data.token;
    if (authToken) {
      localStorage.setItem('auth_token', authToken);
    }
    return response.data;
  },
  
  logout: async () => {
    let resData = { ok: true };
    try {
      const response = await api.post('/auth/logout');
      resData = response.data;
    } catch {}
    currentUser = null;
    authToken = null;
    if (IS_BROWSER) {
      localStorage.removeItem('auth_token');
    }
    try { await signOut(firebaseAuth); } catch {}
    return resData;
  },
  
  getCurrentUser: async () => {
    if (DEV_MODE && BYPASS_AUTH) {
      return { id: 'dev-user', email: 'dev@prism.com', name: 'Development User' };
    }
    const stored = IS_BROWSER ? localStorage.getItem('auth_token') : null;
    if (!currentUser && stored) {
      try {
        const response = await api.get('/auth/me');
        currentUser = response.data.user;
        return currentUser;
      } catch (error) {
        if (IS_BROWSER) localStorage.removeItem('auth_token');
        return null;
      }
    }
    return currentUser;
  },
  me: async function () {
    return this.getCurrentUser();
  },
  updateMe: async (data) => {
    try {
      const res = await api.put('/auth/me', data);
      return res.data;
    } catch (e) {
      if (DEV_MODE) {
        currentUser = { ...(currentUser || {}), ...data };
        return { user: currentUser };
      }
      throw e;
    }
  },

  // Base44 compatibility methods
  isAuthenticated: () => {
    // Dev mode bypass
    if (DEV_MODE && BYPASS_AUTH) {
      return true;
    }
    const tokenStored = IS_BROWSER ? localStorage.getItem('auth_token') : null;
    return !!(authToken || tokenStored || currentUser);
  },

  redirectToLogin: (fromUrl) => {
    if (fromUrl && IS_BROWSER) {
      localStorage.setItem('redirect_after_login', fromUrl);
    }
    if (DEV_MODE && BYPASS_AUTH) {
      return;
    }
    if (IS_BROWSER) {
      window.location.href = '/login';
    }
  },

  getAccessToken: () => {
    const tokenStored = IS_BROWSER ? localStorage.getItem('auth_token') : null;
    return authToken || tokenStored;
  }
};

// Add token to all requests if it exists
api.interceptors.request.use((config) => {
  const token = auth.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Social Media API
export const social = {
  connect: async (platform) => {
    try {
      const response = await api.post('/social/connect', { platform });
      return response.data;
    } catch (e) {
      if (DEV_MODE) {
        const state = `platform-${platform}-${Date.now()}`;
        return { authUrl: `/oauth-callback?code=devcode&state=${encodeURIComponent(state)}` };
      }
      throw e;
    }
  },
  
  post: async (platform, content) => {
    const response = await api.post('/social/post', { platform, content });
    return response.data;
  },
  
  disconnect: async (platform) => {
    const response = await api.post('/social/disconnect', { platform });
    return response.data;
  },
  
  getConnections: async () => {
    const response = await api.get('/social/connections');
    return response.data;
  }
};

// Functions API (matches Base44 functions)
export const functions = {
  socialMediaConnect: async (platform) => social.connect(platform),
  socialMediaPost: async (platform, content) => social.post(platform, content),
  invoke: async (name, payload = {}) => {
    switch (name) {
      case 'socialMediaConnect':
        return { data: await social.connect(payload.platform) };
      case 'socialMediaPost':
        return { data: await social.post(payload.platform, payload.content) };
      case 'socialMediaRefreshToken':
        return { data: await api.post('/social/refresh', { platform: payload.platform }) };
      case 'socialMediaCallback':
        {
          const state = payload.state || '';
          const platMatch = String(state).match(/platform-([a-zA-Z0-9_\-]+)/);
          const platform = platMatch ? platMatch[1] : 'unknown';
          return { data: { success: true, platform, account_name: 'dev_account' } };
        }
      case 'tiktokVerification':
      case 'testOAuthCallback':
      default:
        return { data: { status: 'stub', name } };
    }
  }
};

// Entities API
export const entities = {
  Brand: {
    list: async () => {
      try { const res = await api.get('/brands'); return res.data; }
      catch (e) { if (DEV_MODE) return DEV_BRANDS; throw e; }
    },
    create: async (data) => {
      try { const res = await api.post('/brands', data); return res.data; }
      catch (e) {
        if (DEV_MODE) {
          const id = 'dev-' + Math.random().toString(36).slice(2);
          const brand = { ...data, id };
          DEV_BRANDS.push(brand);
          return brand;
        }
        throw e;
      }
    },
    update: async (id, data) => {
      try { const res = await api.put(`/brands/${id}`, data); return res.data; }
      catch (e) { if (DEV_MODE) { const i = DEV_BRANDS.findIndex(b=>b.id===id); if (i>=0) DEV_BRANDS[i] = { ...DEV_BRANDS[i], ...data }; return DEV_BRANDS[i] || { id, ...data }; } throw e; }
    },
    delete: async (id) => {
      try { const res = await api.delete(`/brands/${id}`); return res.data; }
      catch (e) { if (DEV_MODE) { const i = DEV_BRANDS.findIndex(b=>b.id===id); if (i>=0) DEV_BRANDS.splice(i,1); return { ok: true }; } throw e; }
    },
  },
  SocialMediaConnection: {
    list: async () => {
      try { const res = await api.get('/connections'); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    filter: async (params) => {
      try { const res = await api.get('/connections/filter', { params }); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    delete: async (id) => {
      try { const res = await api.delete(`/connections/${id}`); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ok: true }; throw e; }
    },
  },
  Content: {
    list: async (order, limit) => {
      try {
        const res = await api.get('/content');
        let data = res.data || [];
        if (order === '-created_date') {
          data = data.sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
        }
        if (typeof limit === 'number') {
          data = data.slice(0, limit);
        }
        return data;
      } catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    filter: async (params) => {
      try { const res = await api.get('/content/filter', { params }); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    update: async (id, data) => {
      try { const res = await api.put(`/content/${id}`, data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { id, ...data }; throw e; }
    },
    create: async (data) => {
      try { const res = await api.post('/content', data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ...data, id: 'dev-content' }; throw e; }
    },
    delete: async (id) => {
      try { const res = await api.delete(`/content/${id}`); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ok: true }; throw e; }
    },
  },
  BrandSettings: {
    list: async () => {
      try { const res = await api.get('/brand_settings'); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    create: async (data) => {
      try { const res = await api.post('/brand_settings', data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ...data, id: 'dev-brand-settings' }; throw e; }
    },
    update: async (id, data) => {
      try { const res = await api.put(`/brand_settings/${id}`, data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { id, ...data }; throw e; }
    },
    delete: async (id) => {
      try { const res = await api.delete(`/brand_settings/${id}`); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ok: true }; throw e; }
    },
  },
  AutolistSettings: {
    list: async () => {
      try { const res = await api.get('/autolist_settings'); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    create: async (data) => {
      try { const res = await api.post('/autolist_settings', data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ...data, id: 'dev-autolist-settings' }; throw e; }
    },
    update: async (id, data) => {
      try { const res = await api.put(`/autolist_settings/${id}`, data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { id, ...data }; throw e; }
    },
    delete: async (id) => {
      try { const res = await api.delete(`/autolist_settings/${id}`); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ok: true }; throw e; }
    },
  },
  TrendingTopic: {
    list: async (order) => {
      try {
        const res = await api.get('/trending_topics');
        let data = res.data || [];
        if (order === '-created_date') {
          data = data.sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return data;
      } catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    create: async (data) => {
      try { const res = await api.post('/trending_topics', data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ...data, id: 'dev-trend' }; throw e; }
    },
    update: async (id, data) => {
      try { const res = await api.put(`/trending_topics/${id}`, data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { id, ...data }; throw e; }
    },
  },
  Template: {
    list: async (order) => {
      try {
        const res = await api.get('/templates');
        let data = res.data || [];
        if (order === '-created_date') {
          data = data.sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return data;
      } catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    get: async (id) => {
      try { const res = await api.get(`/templates/${id}`); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { id, name: 'Dev Template' }; throw e; }
    },
    filter: async (params) => {
      try { const res = await api.get('/templates/filter', { params }); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    create: async (data) => {
      try { const res = await api.post('/templates', data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ...data, id: 'dev-template' }; throw e; }
    },
    update: async (id, data) => {
      try { const res = await api.put(`/templates/${id}`, data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { id, ...data }; throw e; }
    },
    delete: async (id) => {
      try { const res = await api.delete(`/templates/${id}`); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ok: true }; throw e; }
    },
  },
  Upload: {
    list: async () => {
      try { const res = await api.get('/uploads'); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return []; throw e; }
    },
    create: async (data) => {
      try { const res = await api.post('/uploads', data); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ...data, id: 'dev-upload' }; throw e; }
    },
    delete: async (id) => {
      try { const res = await api.delete(`/uploads/${id}`); return res.data; }
      catch (e) { if (DEV_MODE && BYPASS_AUTH) return { ok: true }; throw e; }
    },
  },
};

// Default export
// Integrations API
export const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const proj = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined;
      const bucket = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined;
      const bucketHost = bucket ? bucket.replace(/^https?:\/\//, '') : undefined;
      const bucketUrl = bucketHost ? (bucketHost.startsWith('gs://') ? bucketHost : `gs://${bucketHost}`) : (proj ? `gs://${proj}.appspot.com` : undefined);
      const storage = bucketUrl ? getStorage(undefined, bucketUrl) : getStorage();
      
      // Generate unique filename with timestamp and sanitized name
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `uploads/${timestamp}_${sanitizedName}`;
      const storageRef = ref(storage, path);
      
      // Upload with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadTime: new Date().toISOString(),
          size: file.size.toString(),
          sizeHumanReadable: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        }
      };
      
      const snap = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(snap.ref);
      
      return { 
        file_url: url,
        storage_path: path,
        metadata: {
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          uploaded_at: new Date().toISOString()
        }
      };
    },
    InvokeLLM: async ({ prompt }) => {
      try {
        const res = await api.post('/integrations/llm', { prompt });
        return res.data || { trends: [] };
      } catch (e) {
        return { trends: [] };
      }
    }
  }
};

export default {
  auth,
  integrations,
  social,
  functions,
  entities
};