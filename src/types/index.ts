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
}

export interface Category {
  id: string;
  name: string;
  image: any;
}
