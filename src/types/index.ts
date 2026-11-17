export interface ProductOption {
  id: string;
  name: string;
  extraPrice?: number;
}

export interface ProductOptionGroup {
  id: string;
  title: string;
  required: boolean;
  min: number;
  max: number;
  options: ProductOption[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image: any;
  hasOptions?: boolean;
  optionsGroup?: ProductOptionGroup;
  isAvailable?: boolean;
  stockQuantity?: number;
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  selectedOption?: ProductOption;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryInfo {
  addressName: string;
  landmark: string;
  estateBuilding: string;
  deliveryInstructions: string;
  phone: string;
  saveAddress: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  dob?: string;
  role?: 'customer' | 'admin';
}

export interface Category {
  id: string;
  name: string;
  image: any;
  displayOrder?: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItemInput {
  productId: string;
  optionId?: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  optionId?: string;
  optionName?: string;
  quantity: number;
  unitPrice: number;
  optionPrice: number;
  totalPrice: number;
}

export interface PriceSummary {
  subtotal: number;
  deliveryFee: number;
  vat: number;
  total: number;
  items: OrderItem[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CourierInfo {
  name: string;
  phone: string;
  location?: Coordinates;
}

export interface TrackingStep {
  status: OrderStatus;
  label: string;
  time?: string;
  completed: boolean;
}

export interface OrderTracking {
  orderId: string;
  status: OrderStatus;
  statusStep: number;
  totalSteps: number;
  estimatedDeliveryMinutes: number;
  courier?: CourierInfo;
  timeline: TrackingStep[];
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  vat: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryInfo: DeliveryInfo;
  courier?: CourierInfo;
  estimatedDeliveryMinutes: number;
  items: OrderItem[];
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}
