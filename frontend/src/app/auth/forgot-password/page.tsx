'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = useMemo(() => {
    const target = searchParams.get('redirect');
    if (!target) return '/dashboard';
    return target.startsWith('/') ? target : '/dashboard';
  }, [searchParams]);

  const [step, setStep] = useState<Step>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setSuccess('Хэрэв и-мэйл бүртгэлтэй бол сэргээх код илгээгдэнэ. Кодоороо үргэлжлүүлнэ үү.');
      setStep('reset');
    } catch (err: any) {
      setError(err?.message || 'Код илгээхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Нууц үг таарахгүй байна');
      return;
    }
    if (newPassword.length < 8) {
      setError('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, code, newPassword });
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Нууц үг солиход алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
              EventMN
            </span>
          </Link>
          <p className="text-gray-500 mt-2">Нууц үг сэргээх</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {step === 'request' && (
              <form onSubmit={requestOtp} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    И-мэйл
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 focus:ring-4 focus:ring-primary-500/20 transition-all',
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                >
                  {loading ? 'Илгээж байна...' : 'Сэргээх код илгээх'}
                </button>

                <p className="text-sm text-gray-500 text-center">
                  <Link href={`/auth?redirect=${encodeURIComponent(redirect)}`} className="text-primary-600 hover:text-primary-700 font-medium">
                    Нэвтрэх рүү буцах
                  </Link>
                </p>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={resetPassword} className="space-y-5">
                <div>
                  <label htmlFor="email2" className="block text-sm font-medium text-gray-700 mb-2">
                    И-мэйл
                  </label>
                  <input
                    type="email"
                    id="email2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Сэргээх код
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6 оронтой код"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-mono tracking-widest"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Шинэ нууц үг
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Шинэ нууц үг давтах
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={loading || !email}
                    className={cn(
                      'px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors',
                      loading || !email ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                  >
                    Код дахин илгээх
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      'flex-1 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 focus:ring-4 focus:ring-primary-500/20 transition-all',
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    )}
                  >
                    {loading ? 'Сольж байна...' : 'Нууц үг солих'}
                  </button>
                </div>

                <p className="text-sm text-gray-500 text-center">
                  <Link href={`/auth?redirect=${encodeURIComponent(redirect)}`} className="text-primary-600 hover:text-primary-700 font-medium">
                    Нэвтрэх рүү буцах
                  </Link>
                </p>
              </form>
            )}

            {step === 'done' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Амжилттай</h1>
                <p className="text-gray-500 mt-2">Нууц үг солигдлоо. Одоо нэвтэрнэ үү.</p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Link
                    href={`/auth?redirect=${encodeURIComponent(redirect)}`}
                    className="px-5 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-colors"
                  >
                    Нэвтрэх
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.replace(`/auth?redirect=${encodeURIComponent(redirect)}`)}
                    className="px-5 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Буцах
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
