// Product Types
export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    barcode: string | null;
    image_url: string | null;
    unit_type: 'item' | 'weight' | 'pcs';
    is_active: boolean;
    created_at: string;
}

export interface ProductCreate {
    name: string;
    category: string;
    price: number;
    stock?: number;
    barcode?: string | null;
    image_url?: string | null;
    unit_type?: 'item' | 'weight' | 'pcs';
    is_active?: boolean;
}

export interface ProductUpdate {
    name?: string;
    category?: string;
    price?: number;
    stock?: number;
    barcode?: string | null;
    image_url?: string | null;
    unit_type?: 'item' | 'weight' | 'pcs';
    is_active?: boolean;
}

export interface ProductListResponse {
    products: Product[];
    total: number;
}

// Order Types
export interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    price_at_purchase: number;
    subtotal: number;
}

export interface Order {
    id: string;
    daily_id: number;
    short_id: string;
    runner_id: string | null;
    total_amount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    items: OrderItem[];
    created_at: string;
    updated_at: string;
}

export interface OrderSummary {
    id: string;
    daily_id: number;
    short_id: string;
    total_amount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    item_count: number;
    created_at: string;
}

export interface OrderCreate {
    items: Array<{
        product_id: string;
        quantity: number;
    }>;
    runner_id?: string;
}

export interface PendingOrdersResponse {
    orders: OrderSummary[];
    total: number;
}

// Cart Types (for Runner)
export interface CartItem {
    product: Product;
    quantity: number;
}

// Categories
export const PRODUCT_CATEGORIES = [
    'Sembako',
    'Daging',
    'Canang',
    'Sayur',
    'Buah',
    'Minuman',
    'Jajan',
    'Lainnya'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];
