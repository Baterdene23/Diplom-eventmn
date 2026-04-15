'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store';

type UserRole = 'USER' | 'ORGANIZER' | 'ADMIN';

interface User {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  organizerProfile?: {
    organizationName?: string;
    isVerified?: boolean;
  } | null;
}

export default function UsersManagement() {
  const { accessToken } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const isActiveFilter =
        filterStatus === 'ACTIVE' ? true : filterStatus === 'BLOCKED' ? false : undefined;

      const response = (await adminApi.getUsers(accessToken, {
        role: filterRole || undefined,
        search: searchQuery || undefined,
        isActive: isActiveFilter,
        limit: 200,
      })) as { users: User[] };

      setUsers(response.users || []);
    } catch (err: any) {
      setError(err?.message || 'Хэрэглэгчдийн мэдээлэл татахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [accessToken, filterRole, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      blocked: users.filter((u) => !u.isActive).length,
      organizers: users.filter((u) => u.role === 'ORGANIZER').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
    };
  }, [users]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'ORGANIZER':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Админ';
      case 'ORGANIZER':
        return 'Зохион байгуулагч';
      default:
        return 'Хэрэглэгч';
    }
  };

  const getStatusColor = (isActive: boolean) =>
    isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  const getStatusText = (isActive: boolean) => (isActive ? 'Идэвхтэй' : 'Блоклогдсон');

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('mn-MN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const patchUser = async (userId: string, payload: { role?: UserRole; isActive?: boolean }) => {
    if (!accessToken) return;

    try {
      setActionLoadingId(userId);
      await adminApi.updateUser(userId, payload, accessToken);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...payload } : user))
      );
      setSelectedUser((prev) => (prev?.id === userId ? { ...prev, ...payload } : prev));
    } catch (err: any) {
      setError(err?.message || 'Хэрэглэгч шинэчлэх үед алдаа гарлаа');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Хэрэглэгчид</h1>
          <p className="text-gray-600 mt-1">Хэрэглэгчийн эрх ба төлөв удирдах</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Нийт</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Идэвхтэй</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Блоклогдсон</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.blocked}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Organizer</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{stats.organizers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Админ</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.admins}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Нэр, имэйлээр хайх..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Бүх үүрэг</option>
            <option value="USER">Хэрэглэгч</option>
            <option value="ORGANIZER">Зохион байгуулагч</option>
            <option value="ADMIN">Админ</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Бүх төлөв</option>
            <option value="ACTIVE">Идэвхтэй</option>
            <option value="BLOCKED">Блоклогдсон</option>
          </select>

          {(searchQuery || filterRole || filterStatus) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterRole('');
                setFilterStatus('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Цэвэрлэх
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Уншиж байна...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Хэрэглэгч
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Баталгаажуулалт
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Үүрэг
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Төлөв
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Бүртгүүлсэн
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Үйлдэл
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.isActive ? 'bg-red-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          !user.isActive ? 'bg-gray-400' : 'bg-gradient-to-br from-primary-500 to-primary-600'
                        }`}>
                          {user.firstName?.[0] || user.email[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          user.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {user.isVerified ? 'Баталгаажсан' : 'Баталгаажаагүй'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' ? (
                        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                          {getRoleText(user.role)}
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={actionLoadingId === user.id}
                          onChange={(e) => patchUser(user.id, { role: e.target.value as UserRole })}
                          className={`text-xs font-medium rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer ${getRoleColor(user.role)}`}
                        >
                          <option value="USER">Хэрэглэгч</option>
                          <option value="ORGANIZER">Зохион байгуулагч</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(user.isActive)}`}>
                        {getStatusText(user.isActive)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Дэлгэрэнгүй"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {user.role !== 'ADMIN' && (
                          <button
                            onClick={() => patchUser(user.id, { isActive: !user.isActive })}
                            disabled={actionLoadingId === user.id}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Блоклох' : 'Идэвхжүүлэх'}
                          >
                            {actionLoadingId === user.id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : user.isActive ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Хэрэглэгч олдсонгүй</p>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedUser(null)} />

            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Хэрэглэгчийн мэдээлэл</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold ${
                    selectedUser.isActive ? 'bg-gradient-to-br from-primary-500 to-primary-600' : 'bg-gray-400'
                  }`}>
                    {selectedUser.firstName?.[0] || selectedUser.email[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-gray-500">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {getRoleText(selectedUser.role)}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedUser.isActive)}`}>
                        {getStatusText(selectedUser.isActive)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Утас</p>
                    <p className="font-medium text-gray-900">{selectedUser.phone || '-'}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Бүртгүүлсэн</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  {selectedUser.organizerProfile?.organizationName && (
                    <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">Байгууллагын нэр</p>
                      <p className="font-medium text-gray-900">{selectedUser.organizerProfile.organizationName}</p>
                    </div>
                  )}
                </div>

                {selectedUser.role !== 'ADMIN' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => patchUser(selectedUser.id, { isActive: !selectedUser.isActive })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                        selectedUser.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {selectedUser.isActive ? 'Блоклох' : 'Идэвхжүүлэх'}
                    </button>
                    <button
                      onClick={() =>
                        patchUser(selectedUser.id, {
                          role: selectedUser.role === 'USER' ? 'ORGANIZER' : 'USER',
                        })
                      }
                      className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                    >
                      {selectedUser.role === 'USER' ? 'Organizer болгох' : 'User болгох'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
