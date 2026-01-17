'use client';

import { useState, useEffect } from 'react';
import {
    TrendingUp,
    ShoppingCart,
    DollarSign,
    Package,
    RefreshCw
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from 'recharts';
import { analyticsApi } from '@/lib/api';
import {
    SalesSummary,
    TopProduct,
    CategorySales,
    DailySales,
    HourlyDistribution
} from '@/types';
import { AdminLayout } from '@/components/admin';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AnalyticsPage() {
    const [days, setDays] = useState(7);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<SalesSummary | null>(null);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [categoryData, setCategoryData] = useState<CategorySales[]>([]);
    const [trendData, setTrendData] = useState<DailySales[]>([]);
    const [hourlyData, setHourlyData] = useState<HourlyDistribution[]>([]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [summaryRes, topRes, categoryRes, trendRes, hourlyRes] = await Promise.all([
                analyticsApi.getSummary({ days }),
                analyticsApi.getTopProducts({ days, limit: 10 }),
                analyticsApi.getSalesByCategory({ days }),
                analyticsApi.getSalesTrend({ days }),
                analyticsApi.getHourlyDistribution({ days })
            ]);

            setSummary(summaryRes.summary);
            setTopProducts(topRes.products);
            setCategoryData(categoryRes.categories);
            setTrendData(trendRes.data);
            setHourlyData(hourlyRes.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [days]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
    };

    return (
        <AdminLayout title="📊 Analytics Dashboard" description="Sales performance and insights">
            {/* Controls */}
            <div className="flex items-center gap-3 mb-6">
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-3 py-2 border rounded-lg bg-white text-sm"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
                <button
                    onClick={fetchAllData}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary ? formatCurrency(summary.total_revenue) : '-'}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary?.total_orders ?? '-'}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <ShoppingCart className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Avg Order Value</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary ? formatCurrency(summary.average_order_value) : '-'}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Items Sold</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {summary?.total_items_sold ?? '-'}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Package className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Sales Trend */}
                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <h3 className="text-lg font-semibold mb-4">📈 Revenue Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    fontSize={12}
                                />
                                <YAxis
                                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                    fontSize={12}
                                />
                                <Tooltip
                                    formatter={(value) => formatCurrency(Number(value))}
                                    labelFormatter={(label) => formatDate(String(label))}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <h3 className="text-lg font-semibold mb-4">🥧 Sales by Category</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData as unknown as Record<string, unknown>[]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="revenue"
                                    nameKey="category"
                                    label={({ name, payload }) => `${name} ${payload?.percentage ?? 0}%`}
                                    labelLine={false}
                                >
                                    {categoryData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly Distribution */}
                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <h3 className="text-lg font-semibold mb-4">🕐 Orders by Hour</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(h) => `${h}:00`}
                                    fontSize={12}
                                />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    labelFormatter={(h) => `${h}:00 - ${h}:59`}
                                />
                                <Bar dataKey="order_count" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-sm p-6 border">
                    <h3 className="text-lg font-semibold mb-4">🏆 Top Products</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {topProducts.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No data available</p>
                        ) : (
                            topProducts.map((product, index) => (
                                <div key={product.product_id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-50 text-gray-500'
                                            }`}>
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-sm">{product.product_name}</p>
                                            <p className="text-xs text-gray-500">{product.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-sm">{formatCurrency(product.revenue)}</p>
                                        <p className="text-xs text-gray-500">{product.units_sold} sold</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
