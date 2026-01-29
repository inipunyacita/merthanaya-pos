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
    unit?: 'kg' | 'pcs' | 'item' | string;
}

export interface Order {
    id: string;
    daily_id: number;
    short_id: string;
    invoice_id: string;
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
    invoice_id: string;
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

export interface PaginatedOrdersResponse {
    orders: OrderSummary[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
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

// Analytics Types
export interface SalesSummary {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    total_items_sold: number;
    date_from: string;
    date_to: string;
}

export interface SalesSummaryResponse {
    summary: SalesSummary;
}

export interface TopProduct {
    product_id: string;
    product_name: string;
    category: string;
    units_sold: number;
    revenue: number;
    unit_type: string;
}

export interface TopProductsResponse {
    products: TopProduct[];
    date_from: string;
    date_to: string;
}

export interface CategorySales {
    category: string;
    revenue: number;
    order_count: number;
    percentage: number;
}

export interface CategorySalesResponse {
    categories: CategorySales[];
    date_from: string;
    date_to: string;
}

export interface DailySales {
    date: string;
    revenue: number;
    order_count: number;
}

export interface SalesTrendResponse {
    data: DailySales[];
    date_from: string;
    date_to: string;
}

export interface HourlyDistribution {
    hour: number;
    order_count: number;
    revenue: number;
}

export interface HourlyDistributionResponse {
    data: HourlyDistribution[];
    date_from: string;
    date_to: string;
}

// Inventory Types
export interface LowStockProduct {
    id: string;
    name: string;
    category: string;
    stock: number;
    unit_type: string;
    threshold: number;
}

export interface LowStockResponse {
    products: LowStockProduct[];
    threshold: number;
}

export interface StockAdjustment {
    product_id: string;
    adjustment: number;
    reason?: string;
}

export interface StockAdjustmentResponse {
    success: boolean;
    product_id: string;
    product_name: string;
    previous_stock: number;
    new_stock: number;
    adjustment: number;
}

// User Types
export type UserRole = 'admin' | 'staff';

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    is_active: boolean;
    created_at: string;
}

export interface UserCreate {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
}

export interface UserUpdate {
    email?: string;
    full_name?: string;
    role?: UserRole;
    is_active?: boolean;
}

export interface UserListResponse {
    users: User[];
    total: number;
}

// Store Types
export interface Store {
    id: string;
    owner_id: string;
    name: string;
    logo_url: string | null;
    address: string | null;
    phone: string | null;
    receipt_footer: string | null;
    created_at: string;
    updated_at: string;
}

export interface StoreUpdate {
    name?: string;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
    receipt_footer?: string | null;
}
