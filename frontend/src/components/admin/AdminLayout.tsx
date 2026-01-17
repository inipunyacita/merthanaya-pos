'use client';

import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header - with left padding for hamburger on mobile */}
                <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
                    <div className="pl-12 lg:pl-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
                        {description && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">{description}</p>
                        )}
                    </div>
                </header>

                {/* Content - responsive padding */}
                <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
