export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
  available: boolean;
  featured?: boolean;
  spiceLevel?: 0 | 1 | 2 | 3;
  prepTime?: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
  cartId?: string;
  accessories?: { id: string; name: string; description: string }[];
}

export interface Order {
  id: string;
  items: CartItem[];
  customer: CustomerInfo;
  total: number;
  subtotal: number;
  deliveryFee: number;
  status: OrderStatus;
  type: "delivery" | "pickup" | "dine-in";
  createdAt: Date;
  estimatedTime?: number;
  trackingSteps?: TrackingStep[];
  paymentMethod: "card" | "cash" | "transfer";
  paymentStatus: "pending" | "paid" | "failed";
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export interface TrackingStep {
  id: string;
  label: string;
  description: string;
  time?: string;
  completed: boolean;
  active: boolean;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  specialRequests?: string;
  status: "pending" | "confirmed" | "cancelled";
  tableNumber?: number;
  createdAt: Date;
}

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  reservationsToday: number;
  popularItems: { name: string; count: number }[];
}
