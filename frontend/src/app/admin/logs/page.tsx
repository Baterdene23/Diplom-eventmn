'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/store';

interface AuditLog {
  id: string;
  action: string;
  category: 'USER' | 'EVENT' | 'BOOKING' | 'VENUE' | 'PAYMENT' | 'SYSTEM' | 'AUTH';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  targetId?: string;
  targetType?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function AuditLogsPage() {
  const { accessToken } = useAuthStore();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchLogs = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const res = (await adminApi.getLogs(accessToken, {
        limit: 200,
        search: searchQuery || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo ? `${filterDateTo}T23:59:59.999Z` : undefined,
      })) as any;

      setLogs(Array.isArray(res?.logs) ? res.logs : []);
    } catch (err: any) {
      setError(err?.message || 'Лог татахад алдаа гарлаа');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);

    return () => clearTimeout(timer);
  }, [accessToken, searchQuery, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter((l) => l.severity === 'INFO').length,
      warning: logs.filter((l) => l.severity === 'WARNING').length,
      error: logs.filter((l) => l.severity === 'ERROR').length,
      critical: logs.filter((l) => l.severity === 'CRITICAL').length,
    };
  }, [logs]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'CRITICAL':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'WARNING':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'ERROR':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'CRITICAL':
        return (
          <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'USER':
        return 'bg-purple-100 text-purple-700';
      case 'EVENT':
        return 'bg-blue-100 text-blue-700';
      case 'BOOKING':
        return 'bg-green-100 text-green-700';
      case 'VENUE':
        return 'bg-orange-100 text-orange-700';
      case 'PAYMENT':
        return 'bg-emerald-100 text-emerald-700';
      case 'SYSTEM':
        return 'bg-gray-100 text-gray-700';
      case 'AUTH':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryText = (category: string) => {
    const categories: Record<string, string> = {
      USER: 'Хэрэглэгч',
      EVENT: 'Эвент',
      BOOKING: 'Захиалга',
      VENUE: 'Заал',
      PAYMENT: 'Төлбөр',
      SYSTEM: 'Систем',
      AUTH: 'Нэвтрэлт',
    };
    return categories[category] || category;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const logDate = new Date(date);
    const diffMs = now.getTime() - logDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Дөнгөж сая';
    if (diffMins < 60) return `${diffMins} минутын өмнө`;
    if (diffHours < 24) return `${diffHours} цагийн өмнө`;
    return `${diffDays} өдрийн өмнө`;
  };

  const openDetailModal = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        log.description.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        log.ipAddress.includes(searchQuery);
    const matchesCategory = !filterCategory || log.category === filterCategory;
    const matchesSeverity = !filterSeverity || log.severity === filterSeverity;
    
    let matchesDate = true;
    if (filterDateFrom) {
      matchesDate = matchesDate && new Date(log.createdAt) >= new Date(filterDateFrom);
    }
    if (filterDateTo) {
      matchesDate = matchesDate && new Date(log.createdAt) <= new Date(filterDateTo + 'T23:59:59');
    }
    
      return matchesSearch && matchesCategory && matchesSeverity && matchesDate;
    });
  }, [logs, searchQuery, filterCategory, filterSeverity, filterDateFrom, filterDateTo]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аудит лог</h1>
          <p className="text-gray-600 mt-1">Системийн бүх үйлдлүүдийн бүртгэл</p>
        </div>
        <button
          onClick={() => {
            // Export functionality
            alert('Лог экспортлох боломж хөгжүүлэлтэнд байна');
          }}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Экспорт
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Нийт лог</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => setFilterSeverity(filterSeverity === 'INFO' ? '' : 'INFO')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
              <p className="text-xs text-gray-500">Мэдээлэл</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-yellow-300 transition-colors"
          onClick={() => setFilterSeverity(filterSeverity === 'WARNING' ? '' : 'WARNING')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              <p className="text-xs text-gray-500">Анхааруулга</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-red-300 transition-colors"
          onClick={() => setFilterSeverity(filterSeverity === 'ERROR' ? '' : 'ERROR')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.error}</p>
              <p className="text-xs text-gray-500">Алдаа</p>
            </div>
          </div>
        </div>

        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-red-400 transition-colors"
          onClick={() => setFilterSeverity(filterSeverity === 'CRITICAL' ? '' : 'CRITICAL')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
              <p className="text-xs text-gray-500">Ноцтой</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Үйлдэл, хэрэглэгч, IP хайх..."
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

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Бүх ангилал</option>
            <option value="AUTH">Нэвтрэлт</option>
            <option value="USER">Хэрэглэгч</option>
            <option value="EVENT">Эвент</option>
            <option value="BOOKING">Захиалга</option>
            <option value="VENUE">Заал</option>
            <option value="PAYMENT">Төлбөр</option>
            <option value="SYSTEM">Систем</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Бүх түвшин</option>
            <option value="INFO">Мэдээлэл</option>
            <option value="WARNING">Анхааруулга</option>
            <option value="ERROR">Алдаа</option>
            <option value="CRITICAL">Ноцтой</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Эхлэх огноо"
          />

          {/* Date To */}
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Дуусах огноо"
          />

          {/* Clear Filters */}
          {(filterCategory || filterSeverity || filterDateFrom || filterDateTo || searchQuery) && (
            <button
              onClick={() => {
                setFilterCategory('');
                setFilterSeverity('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSearchQuery('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Цэвэрлэх
            </button>
          )}
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {loading && (
            <div className="p-6 text-sm text-gray-500">Ачаалж байна...</div>
          )}
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => openDetailModal(log)}
            >
              <div className="flex items-start gap-4">
                {/* Severity Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getSeverityIcon(log.severity)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(log.category)}`}>
                      {getCategoryText(log.category)}
                    </span>
                    <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{log.action}</code>
                  </div>
                  <p className="text-sm text-gray-900">{log.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    {log.userName && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {log.userName}
                        {log.userRole && <span className="text-gray-300">({log.userRole})</span>}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      {log.ipAddress}
                    </span>
                    <span title={formatDate(log.createdAt)}>{getRelativeTime(log.createdAt)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {!loading && filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">Лог олдсонгүй</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Лог дэлгэрэнгүй</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(selectedLog.severity)}`}>
                  {getSeverityIcon(selectedLog.severity)}
                  {selectedLog.severity}
                </span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedLog.category)}`}>
                  {getCategoryText(selectedLog.category)}
                </span>
              </div>

              {/* Action & Description */}
              <div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">{selectedLog.action}</code>
                <p className="text-gray-900 mt-2">{selectedLog.description}</p>
              </div>

              {/* Time */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Огноо & Цаг</p>
                <p className="font-medium text-gray-900">{formatDate(selectedLog.createdAt)}</p>
                <p className="text-sm text-gray-500">{getRelativeTime(selectedLog.createdAt)}</p>
              </div>

              {/* User Info */}
              {selectedLog.userName && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Хэрэглэгч</p>
                  <div className="space-y-1">
                    <p className="text-gray-900">{selectedLog.userName}</p>
                    {selectedLog.userRole && (
                      <p className="text-sm text-gray-500">Эрх: {selectedLog.userRole}</p>
                    )}
                    {selectedLog.userId && (
                      <p className="text-xs text-gray-400">ID: {selectedLog.userId}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Target Info */}
              {selectedLog.targetId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Зорилтот объект</p>
                  <div className="space-y-1">
                    <p className="text-gray-900">{selectedLog.targetType}</p>
                    <p className="text-xs text-gray-400">ID: {selectedLog.targetId}</p>
                  </div>
                </div>
              )}

              {/* Network Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Сүлжээний мэдээлэл</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500">IP хаяг</p>
                    <p className="text-gray-900 font-mono">{selectedLog.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User Agent</p>
                    <p className="text-gray-900 text-sm break-all">{selectedLog.userAgent}</p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Нэмэлт мэдээлэл (Metadata)</p>
                  <pre className="text-sm text-gray-900 bg-gray-100 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
