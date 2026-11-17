import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  Category,
  DeliveryInfo,
  Order,
  OrderItemInput,
  OrderStatus,
  OrderTracking,
  PriceSummary,
  Product,
  UserProfile,
} from '../types';

function resolveBackendHost(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const lanIp = debuggerHost.split(':')[0];
    if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
      return `${lanIp}:8085`;
    }
  }
  return Platform.select({
    android: '10.0.2.2:8085',
    default: 'localhost:8085',
  }) as string;
}

const DEFAULT_HOST = resolveBackendHost();

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}/api/v1`;

export const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_URL || `ws://${DEFAULT_HOST}/ws`;

export const TOKEN_STORAGE_KEY = '@lpc_auth_token';
export const USER_STORAGE_KEY = '@lpc_auth_user';
export const LAST_ORDER_STORAGE_KEY = '@lpc_last_order_id';

// Map backend image filenames to bundled static assets
const ASSET_IMAGE_MAP: Record<string, any> = {
  'cat-grid-1.png': require('../../assets/images/cat-grid-1.png'),
  'cat-grid-2.png': require('../../assets/images/cat-grid-2.png'),
  'cat-grid-3.png': require('../../assets/images/cat-grid-3.png'),
  'cat-grid-4.png': require('../../assets/images/cat-grid-4.png'),
  'burger-boss.png': require('../../assets/images/burger-boss.png'),
  'burger-meal.png': require('../../assets/images/burger-meal.png'),
  'burger-colonel.png': require('../../assets/images/burger-colonel.png'),
  'burger-crunch.png': require('../../assets/images/burger-crunch.png'),
  'soda-2l.png': require('../../assets/images/soda-2l.png'),
  'cold-brew.jpg': require('../../assets/images/cold-brew.jpg'),
  'latte.jpg': require('../../assets/images/latte.jpg'),
  'pancakes.jpg': require('../../assets/images/pancakes.jpg'),
  'croissant.jpg': require('../../assets/images/croissant.jpg'),
  'hero-banner-promo.jpg': require('../../assets/images/hero-banner-promo.jpg'),
  'hero-promo1.jpg': require('../../assets/images/hero-promo1.jpg'),
  'hero-promo2.jpg': require('../../assets/images/hero-promo2.jpg'),
};

export function resolveBackendImage(image: any, fallbackKey = 'burger-boss.png'): any {
  if (!image) return ASSET_IMAGE_MAP[fallbackKey];
  if (typeof image === 'number' || typeof image === 'object') return image;
  if (typeof image === 'string') {
    if (ASSET_IMAGE_MAP[image]) return ASSET_IMAGE_MAP[image];
    const basename = image.split('/').pop() || '';
    if (ASSET_IMAGE_MAP[basename]) return ASSET_IMAGE_MAP[basename];
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return { uri: image };
    }
  }
  return ASSET_IMAGE_MAP[fallbackKey];
}

// Generate RFC4122 v4 UUID for Idempotency-Key header without native binary dependencies
export function generateIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Storage helpers
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage write error
  }
}

export async function getStoredUser(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage write error
  }
}

export async function clearAuthStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
  } catch {
    // Ignore storage clear error
  }
}

export interface ApiRequestOptions extends RequestInit {
  idempotencyKey?: string;
  timeoutMs?: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { idempotencyKey, timeoutMs = 5000, headers: customHeaders, ...rest } = options;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const errMessage =
        json?.error || json?.message || `Request failed with status ${response.status}`;
      throw new ApiError(errMessage, response.status);
    }

    return (json?.data !== undefined ? json.data : json) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Reusable Domain API Services
// ============================================================================

export interface AuthResponsePayload {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
}

export const authApi = {
  register: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) =>
    apiRequest<{ message: string; user: UserProfile }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (identifier: string, password: string) =>
    apiRequest<AuthResponsePayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  requestOtp: (type: 'email' | 'phone', identifier: string) =>
    apiRequest<{
      message: string;
      identifier: string;
      type: string;
      devCode?: string;
    }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ type, identifier }),
    }),

  verifyOtp: (identifier: string, code: string, name?: string) =>
    apiRequest<AuthResponsePayload>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ identifier, code, name }),
    }),

  adminLogin: (email: string, password: string) =>
    apiRequest<AuthResponsePayload>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => apiRequest<UserProfile>('/profile', { method: 'GET' }),

  updateProfile: (payload: {
    name?: string;
    phone?: string;
    email?: string;
    dob?: string;
  }) =>
    apiRequest<UserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const menuApi = {
  getFullMenu: async (): Promise<{ categories: Category[]; products: Product[] }> => {
    const data = await apiRequest<{ categories: Category[]; products: Product[] }>('/menu', {
      method: 'GET',
    });
    return {
      categories: (data.categories || []).map((cat) => ({
        ...cat,
        image: resolveBackendImage(cat.image, 'cat-grid-1.png'),
      })),
      products: (data.products || []).map((prod) => ({
        ...prod,
        image: resolveBackendImage(prod.image, 'burger-boss.png'),
      })),
    };
  },

  getPromos: () =>
    apiRequest<Array<{ id: string; title: string; subtitle: string; image: string }>>(
      '/menu/promos',
      { method: 'GET' }
    ),

  getProduct: async (id: string): Promise<Product> => {
    const prod = await apiRequest<Product>(`/menu/products/${id}`, { method: 'GET' });
    return {
      ...prod,
      image: resolveBackendImage(prod.image, 'burger-boss.png'),
    };
  },
};

export const activitiesApi = {
  getActivities: () => apiRequest<any[]>('/activities', { method: 'GET' }),
  getActivity: (id: string) => apiRequest<any>(`/activities/${id}`, { method: 'GET' }),
};

export const ordersApi = {
  calculatePrice: (items: OrderItemInput[], deliveryType: 'delivery' | 'pickup' = 'delivery') =>
    apiRequest<PriceSummary>('/orders/calculate', {
      method: 'POST',
      body: JSON.stringify({ items, deliveryType }),
    }),

  createOrder: (
    payload: {
      items: OrderItemInput[];
      deliveryInfo: DeliveryInfo;
      paymentMethod: 'mpesa' | 'card' | 'cash';
      workOrderNotes?: string;
    },
    idempotencyKey = generateIdempotencyKey()
  ) =>
    apiRequest<Order>('/orders', {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify(payload),
    }),

  getMyOrders: () => apiRequest<Order[]>('/orders/my-orders', { method: 'GET' }),

  getOrder: (orderId: string) => apiRequest<Order>(`/orders/${orderId}`, { method: 'GET' }),

  getOrderTracking: (orderId: string) =>
    apiRequest<OrderTracking>(`/orders/${orderId}/tracking`, { method: 'GET' }),
};

export const adminApi = {
  getAllOrders: (status?: OrderStatus) =>
    apiRequest<Order[]>(`/admin/orders${status ? `?status=${status}` : ''}`, {
      method: 'GET',
    }),

  updateOrderStatus: (orderId: string, status: OrderStatus) =>
    apiRequest<Order>(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  dispatchCourier: (
    orderId: string,
    payload: {
      courierName: string;
      courierPhone: string;
      location?: { lat: number; lng: number };
      estimatedDeliveryMinutes?: number;
    }
  ) =>
    apiRequest<Order>(`/admin/orders/${orderId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCourierLocation: (orderId: string, lat: number, lng: number) =>
    apiRequest<{ message: string }>(`/admin/orders/${orderId}/location`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    }),

  getStats: () => apiRequest<any>('/admin/stats', { method: 'GET' }),

  updateStock: (
    productId: string,
    payload: { isAvailable?: boolean; stockQuantity?: number }
  ) =>
    apiRequest<{ message: string }>(`/admin/menu/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  createProduct: (product: Partial<Product>) =>
    apiRequest<Product>('/admin/menu/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  deleteProduct: (productId: string) =>
    apiRequest<{ message: string }>(`/admin/menu/products/${productId}`, {
      method: 'DELETE',
    }),
};
