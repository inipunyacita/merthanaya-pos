import axios from 'axios';
import {
    Product,
    ProductCreate,
    ProductUpdate,
    ProductListResponse,
    Order,
    OrderCreate,
    PendingOrdersResponse,
    PaginatedOrdersResponse,
    SalesSummaryResponse,
    TopProductsResponse,
    CategorySalesResponse,
    SalesTrendResponse,
    HourlyDistributionResponse,
    LowStockResponse,
    StockAdjustment,
    StockAdjustmentResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Product API
export const productApi = {
    list: async (params?: { category?: string; active_only?: boolean; search?: string; page?: number; page_size?: number }) => {
        const response = await api.get<ProductListResponse>('/products/', { params });
        return response.data;
    },

    get: async (id: string) => {
        const response = await api.get<Product>(`/products/${id}`);
        return response.data;
    },

    getByBarcode: async (barcode: string) => {
        const response = await api.get<Product>(`/products/barcode/${barcode}`);
        return response.data;
    },

    create: async (product: ProductCreate) => {
        const response = await api.post<Product>('/products/', product);
        return response.data;
    },

    update: async (id: string, product: ProductUpdate) => {
        const response = await api.put<Product>(`/products/${id}`, product);
        return response.data;
    },

    delete: async (id: string, hardDelete = false) => {
        const response = await api.delete(`/products/${id}`, { params: { hard_delete: hardDelete } });
        return response.data;
    },
};

// Order API
export const orderApi = {
    create: async (order: OrderCreate) => {
        const response = await api.post<Order>('/orders/', order);
        return response.data;
    },

    getPending: async () => {
        const response = await api.get<PendingOrdersResponse>('/orders/pending');
        return response.data;
    },

    get: async (id: string) => {
        const response = await api.get<Order>(`/orders/${id}`);
        return response.data;
    },

    pay: async (id: string) => {
        const response = await api.post(`/orders/${id}/pay`);
        return response.data;
    },

    cancel: async (id: string) => {
        const response = await api.post(`/orders/${id}/cancel`);
        return response.data;
    },

    getPaid: async (page: number = 1, pageSize: number = 6) => {
        const response = await api.get<PaginatedOrdersResponse>('/orders/paid', {
            params: { page, page_size: pageSize }
        });
        return response.data;
    },

    getHistory: async (params?: {
        page?: number;
        page_size?: number;
        status?: string;
        date_from?: string;
        date_to?: string;
        search?: string
    }) => {
        const response = await api.get<PaginatedOrdersResponse>('/orders/history/all', { params });
        return response.data;
    },
};

// Analytics API
export const analyticsApi = {
    getSummary: async (params?: { days?: number; date_from?: string; date_to?: string }) => {
        const response = await api.get<SalesSummaryResponse>('/analytics/summary', { params });
        return response.data;
    },

    getTopProducts: async (params?: { days?: number; limit?: number }) => {
        const response = await api.get<TopProductsResponse>('/analytics/top-products', { params });
        return response.data;
    },

    getSalesByCategory: async (params?: { days?: number }) => {
        const response = await api.get<CategorySalesResponse>('/analytics/sales-by-category', { params });
        return response.data;
    },

    getSalesTrend: async (params?: { days?: number }) => {
        const response = await api.get<SalesTrendResponse>('/analytics/sales-trend', { params });
        return response.data;
    },

    getHourlyDistribution: async (params?: { days?: number }) => {
        const response = await api.get<HourlyDistributionResponse>('/analytics/hourly-distribution', { params });
        return response.data;
    },
};

// Inventory API
export const inventoryApi = {
    getLowStock: async (threshold?: number) => {
        const response = await api.get<LowStockResponse>('/inventory/low-stock', {
            params: threshold ? { threshold } : undefined
        });
        return response.data;
    },

    adjustStock: async (adjustment: StockAdjustment) => {
        const response = await api.post<StockAdjustmentResponse>('/inventory/adjust', adjustment);
        return response.data;
    },
};

export default api;
