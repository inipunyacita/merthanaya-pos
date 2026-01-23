'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usersApi } from '@/lib/api';
import { User, UserCreate, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Toaster, toast } from 'sonner';
import {
    Plus, Pencil, Power, PowerOff, Trash2, Users, Eye, EyeOff, Loader2
} from 'lucide-react';
import { AdminLayout } from '@/components/admin';

function UsersContent() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<UserCreate>({
        email: '',
        password: '',
        full_name: '',
        role: 'staff',
    });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await usersApi.list();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            full_name: '',
            role: 'staff',
        });
        setEditingUser(null);
        setShowPassword(false);
    };

    const openCreateDialog = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '',
            full_name: user.full_name,
            role: user.role,
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingUser) {
                await usersApi.update(editingUser.id, {
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.role,
                });
                toast.success('User updated successfully');
            } else {
                if (!formData.password) {
                    toast.error('Password is required');
                    setSubmitting(false);
                    return;
                }
                await usersApi.create(formData);
                toast.success('User created successfully');
            }
            setDialogOpen(false);
            resetForm();
            fetchUsers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to save user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeactivate = async (user: User) => {
        if (!confirm(`Deactivate user "${user.full_name}"?`)) return;

        try {
            await usersApi.delete(user.id);
            toast.success('User deactivated');
            fetchUsers();
        } catch (error) {
            console.error('Failed to deactivate user:', error);
            toast.error('Failed to deactivate user');
        }
    };

    const handleReactivate = async (user: User) => {
        if (!confirm(`Reactivate user "${user.full_name}"?`)) return;

        try {
            await usersApi.reactivate(user.id);
            toast.success('User reactivated');
            fetchUsers();
        } catch (error) {
            console.error('Failed to reactivate user:', error);
            toast.error('Failed to reactivate user');
        }
    };

    const handleDelete = async (user: User) => {
        if (!confirm(`PERMANENTLY delete user "${user.full_name}"? This cannot be undone.`)) return;

        try {
            await usersApi.delete(user.id, true);
            toast.success('User permanently deleted');
            fetchUsers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } } };
            toast.error(err.response?.data?.detail || 'Failed to delete user');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <AdminLayout title="👥 Users" description="Manage system users and permissions">
            <Toaster richColors position="top-right" closeButton expand visibleToasts={5} />

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-600">Total Users: <strong>{users.length}</strong></span>
                    </div>
                </div>
                <Button onClick={openCreateDialog} className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                </Button>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
                <Table className="min-w-[600px]">
                    <TableHeader>
                        <TableRow className="border-gray-200 bg-gray-50 hover:bg-gray-100">
                            <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Email</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Role</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                            <TableHead className="text-gray-700 font-semibold">Created</TableHead>
                            <TableHead className="text-gray-700 font-semibold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                    No users found. Add your first user!
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className={`border-gray-200 hover:bg-gray-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                                    <TableCell className="font-medium text-gray-900">{user.full_name}</TableCell>
                                    <TableCell className="text-gray-600">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                                            className={user.role === 'admin' ? 'bg-purple-100 text-purple-700' : ''}
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.is_active ? 'default' : 'secondary'}
                                            className={user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                                        >
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-600">{formatDate(user.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(user)}
                                            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        {user.is_active ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeactivate(user)}
                                                disabled={user.id === currentUser?.id}
                                                className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                                                title="Deactivate"
                                            >
                                                <PowerOff className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleReactivate(user)}
                                                className="text-green-500 hover:text-green-600 hover:bg-green-50"
                                                title="Reactivate"
                                            >
                                                <Power className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(user)}
                                            disabled={user.id === currentUser?.id}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-white border-gray-200 text-gray-900">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-gray-900">{editingUser ? 'Edit User' : 'Create New User'}</DialogTitle>
                            <DialogDescription className="text-gray-500">
                                {editingUser ? 'Update user details below.' : 'Fill in the details to create a new user.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="full_name" className="text-right">Full Name</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="col-span-3 bg-white border-gray-300 text-gray-900"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="col-span-3 bg-white border-gray-300 text-gray-900"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>
                            {!editingUser && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">Password</Label>
                                    <div className="col-span-3 relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="bg-white border-gray-300 text-gray-900 pr-10"
                                            placeholder="••••••••"
                                            required={!editingUser}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">Role</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger className="col-span-3 bg-white border-gray-300 text-gray-900">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingUser ? 'Save Changes' : 'Create User'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}

export default function UsersPage() {
    return (
        <ProtectedRoute requireAdmin>
            <UsersContent />
        </ProtectedRoute>
    );
}
