'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { authApi, userApi } from '@/lib/api';
import { Camera, User, ShieldCheck, Smartphone, KeyRound } from 'lucide-react';
import { useInterestsStore } from '@/store';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface OrganizerForm {
  organizationName: string;
  description: string;
  website: string;
}


export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, accessToken, isAuthenticated, setAuth, logout } = useAuthStore();
  const { tags: interestTags, toggleTag, clearTags } = useInterestsStore();
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  const interestOptions = [
    'Бөхийн барилдаан',
    'Концерт',
    'Спорт',
    'Үзэсгэлэн',
    'Сургалт',
    'Хурал & Семинар',
    'Уулзалт',
  ];
  
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'app' | 'sms'>('app');
  const [twoFactorPhone, setTwoFactorPhone] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [sendingTwoFactor, setSendingTwoFactor] = useState(false);
  const [verifyingTwoFactor, setVerifyingTwoFactor] = useState(false);

  const [organizerForm, setOrganizerForm] = useState<OrganizerForm>({
    organizationName: '',
    description: '',
    website: '',
  });
  const [organizerStep, setOrganizerStep] = useState<'form' | 'otp' | 'done'>('form');
  const [organizerOtpCode, setOrganizerOtpCode] = useState('');
  const [submittingOrganizer, setSubmittingOrganizer] = useState(false);
  const [sendingOrganizerOtp, setSendingOrganizerOtp] = useState(false);
  const [verifyingOrganizerOtp, setVerifyingOrganizerOtp] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: '',
      });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isOrganizer) {
      setOrganizerStep('done');
    }
  }, [isAuthenticated, isOrganizer]);


  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Зөвхөн зураг оруулах боломжтой');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Зургийн хэмжээ 5MB-с бага байх ёстой');
      return;
    }

    setUploadingAvatar(true);
    setError(null);

    try {
      // Store avatar as a data URL in user profile.
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        try {
          const response = await userApi.updateMe({ avatar: base64 }, accessToken!);

          if (response.user && accessToken) {
            setAuth(
              { ...user!, avatar: base64 },
              accessToken,
              useAuthStore.getState().refreshToken!
            );
          }
          setSuccess('Профайл зураг амжилттай солигдлоо');
        } catch (err: any) {
          setError(err.message || 'Зураг оруулахад алдаа гарлаа');
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Зураг уншихад алдаа гарлаа');
      setUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await userApi.updateMe(
        {
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone?.trim() || undefined,
        },
        accessToken!
      );

      if (response.user && accessToken) {
        setAuth(
          { ...user!, ...response.user },
          accessToken,
          useAuthStore.getState().refreshToken!
        );
      }
      setSuccess('Профайл амжилттай хадгалагдлаа');
    } catch (err: any) {
      setError(err.message || 'Профайл хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Шинэ нууц үг таарахгүй байна');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой');
      return;
    }

    setSaving(true);

    try {
      const response = await userApi.changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        accessToken!
      );

      setSuccess('Нууц үг амжилттай солигдлоо');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      if ((response as any)?.requireReLogin) {
        logout();
        router.push('/auth?mode=login');
      }
    } catch (err: any) {
      setError(err.message || 'Нууц үг солиход алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTwoFactorCode = async () => {
    setError(null);
    setSuccess(null);
    setSendingTwoFactor(true);

    try {
      if (twoFactorMethod === 'sms' && !twoFactorPhone.trim()) {
        setError('Утасны дугаараа оруулна уу');
        return;
      }

      if (!accessToken) {
        setError('Нэвтрэх шаардлагатай');
        return;
      }

      if (twoFactorMethod === 'sms' && twoFactorPhone.trim()) {
        await userApi.updateMe({ phone: twoFactorPhone.trim() }, accessToken);
      }

      const otpType = twoFactorMethod === 'sms' ? 'PHONE_VERIFY' : 'EMAIL_VERIFY';
      await authApi.resendOtp({ type: otpType }, accessToken);
      setSuccess('Баталгаажуулах код илгээгдлээ');
    } catch (err: any) {
      setError(err.message || 'Код илгээхэд алдаа гарлаа');
    } finally {
      setSendingTwoFactor(false);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setVerifyingTwoFactor(true);

    try {
      if (twoFactorCode.trim().length !== 6) {
        setError('Код 6 оронтой байх ёстой');
        return;
      }

      if (!accessToken) {
        setError('Нэвтрэх шаардлагатай');
        return;
      }

      const otpType = twoFactorMethod === 'sms' ? 'PHONE_VERIFY' : 'EMAIL_VERIFY';
      await authApi.verifyOtp({ code: twoFactorCode.trim(), type: otpType }, accessToken);
      setTwoFactorEnabled(true);
      setTwoFactorCode('');
      setSuccess('2FA амжилттай идэвхжлээ');
    } catch (err: any) {
      setError(err.message || '2FA баталгаажуулалт амжилтгүй');
    } finally {
      setVerifyingTwoFactor(false);
    }
  };

  const handleSubmitBecomeOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmittingOrganizer(true);

    try {
      if (!accessToken) {
        setError('Нэвтрэх шаардлагатай');
        return;
      }

      const organizationName = organizerForm.organizationName.trim();
      if (organizationName.length < 2) {
        setError('Байгууллагын нэр хамгийн багадаа 2 тэмдэгт байх ёстой');
        return;
      }

      await authApi.becomeOrganizer(
        {
          organizationName,
          description: organizerForm.description.trim() || undefined,
          website: organizerForm.website.trim() || undefined,
        },
        accessToken
      );

      setOrganizerStep('otp');
      setSuccess('Баталгаажуулах код илгээгдлээ');
    } catch (err: any) {
      const message = err?.message || 'Хүсэлт илгээх амжилтгүй боллоо';
      const status = err?.status;

      if (status === 400 && /OTP/i.test(message)) {
        setOrganizerStep('otp');
        setSuccess('Таны өмнөх хүсэлт бүртгэлтэй байна. OTP кодоо оруулна уу');
        return;
      }

      setError(message);
    } finally {
      setSubmittingOrganizer(false);
    }
  };

  const handleResendOrganizerOtp = async () => {
    setError(null);
    setSuccess(null);
    setSendingOrganizerOtp(true);

    try {
      if (!accessToken) {
        setError('Нэвтрэх шаардлагатай');
        return;
      }

      await authApi.resendOtp({ type: 'BECOME_ORGANIZER' }, accessToken);
      setSuccess('Баталгаажуулах код дахин илгээгдлээ');
    } catch (err: any) {
      setError(err.message || 'Код илгээхэд алдаа гарлаа');
    } finally {
      setSendingOrganizerOtp(false);
    }
  };

  const handleVerifyOrganizerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setVerifyingOrganizerOtp(true);

    try {
      if (organizerOtpCode.trim().length !== 6) {
        setError('Код 6 оронтой байх ёстой');
        return;
      }

      if (!accessToken) {
        setError('Нэвтрэх шаардлагатай');
        return;
      }

      const verified = (await authApi.verifyOtp(
        { code: organizerOtpCode.trim(), type: 'BECOME_ORGANIZER' },
        accessToken
      )) as any;

      if (!verified?.accessToken || !verified?.refreshToken) {
        throw new Error('Token шинэчлэх амжилтгүй');
      }

      const me = (await authApi.me(verified.accessToken)) as any;
      if (!me?.user) {
        throw new Error('Хэрэглэгчийн мэдээлэл авах боломжгүй');
      }

      setAuth(me.user, verified.accessToken, verified.refreshToken);
      setOrganizerStep('done');
      setOrganizerOtpCode('');
      setSuccess('Та амжилттай зохион байгуулагч боллоо!');

      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Баталгаажуулалт амжилтгүй');
    } finally {
      setVerifyingOrganizerOtp(false);
    }
  };


  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Page Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Хувийн мэдээлэл</h2>
        <p className="text-gray-500 mt-1">Хувийн мэдээллээ удирдах</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-green-600">{success}</p>
          </div>
        </div>
      )}

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Хувийн мэдээлэл</h3>
            <p className="text-sm text-gray-500">Үндсэн мэдээллээ шинэчилнэ</p>
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.firstName || 'User'}
                      className="w-24 h-24 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Профайл зураг</h3>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG. Хамгийн ихдээ 5MB</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Нэр
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Овог
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  И-мэйл
                </label>
                <input
                  type="email"
                  id="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">И-мэйл хаяг өөрчлөх боломжгүй</p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Утасны дугаар
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="99001122"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 focus:ring-4 focus:ring-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Хадгалж байна...
                    </span>
                  ) : (
                    'Хадгалах'
                  )}
                </button>
              </div>
            </form>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Сонирхол</h3>
              <p className="text-sm text-gray-500">Санал болгох арга хэмжээг таны сонголтоор шүүнэ</p>
            </div>
            {(interestTags || []).length > 0 && (
              <button
                type="button"
                onClick={() => clearTags()}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Бүгдийг арилгах
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {interestOptions.map((tag) => {
              const active = (interestTags || []).includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-primary-50 text-primary-700 border-primary-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Сонголт таны төхөөрөмж дээр хадгалагдана.
          </p>
        </div>

        {/* Password Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Нууц үг солих</h3>
            <p className="text-sm text-gray-500">Нууц үгээ тогтмол шинэчилж байгаарай</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Одоогийн нууц үг
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Шинэ нууц үг
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                required
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Шинэ нууц үг давтах
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 focus:ring-4 focus:ring-primary-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Хадгалж байна...
                  </span>
                ) : (
                  'Нууц үг солих'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 2FA Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">2FA баталгаажуулалт</h3>
              <p className="text-sm text-gray-500">Давхар хамгаалалт идэвхжүүлснээр аюулгүй байдал нэмэгдэнэ</p>
            </div>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full ${
                twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              {twoFactorEnabled ? 'Идэвхтэй' : 'Идэвхгүй'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setTwoFactorMethod('app')}
              className={`flex items-center gap-3 p-4 border rounded-xl transition-all ${
                twoFactorMethod === 'app'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <KeyRound className="w-5 h-5" />
              <div className="text-left">
                <p className="text-sm font-medium">Authenticator app</p>
                <p className="text-xs text-gray-500">Google Authenticator, Authy</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTwoFactorMethod('sms')}
              className={`flex items-center gap-3 p-4 border rounded-xl transition-all ${
                twoFactorMethod === 'sms'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              <div className="text-left">
                <p className="text-sm font-medium">SMS баталгаажуулалт</p>
                <p className="text-xs text-gray-500">Утасны дугаарт код ирнэ</p>
              </div>
            </button>
          </div>

          {twoFactorMethod === 'sms' && (
            <div className="mb-4">
              <label htmlFor="twoFactorPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Утасны дугаар
              </label>
              <input
                type="tel"
                id="twoFactorPhone"
                value={twoFactorPhone}
                onChange={(e) => setTwoFactorPhone(e.target.value)}
                placeholder="99001122"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <button
              type="button"
              onClick={handleSendTwoFactorCode}
              disabled={sendingTwoFactor}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {sendingTwoFactor ? 'Илгээж байна...' : 'Код илгээх'}
            </button>
            <p className="text-xs text-gray-500">Код ирмэгц доор оруулна уу</p>
          </div>

          <form onSubmit={handleVerifyTwoFactor} className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                Баталгаажуулах код
              </label>
              <input
                type="text"
                id="twoFactorCode"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={verifyingTwoFactor}
              className="inline-flex items-center justify-center px-5 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {verifyingTwoFactor ? 'Баталгаажуулж байна...' : 'Баталгаажуулах'}
            </button>
          </form>
        </div>

        {/* Become Organizer Card */}
        {!isOrganizer && (
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Зохион байгуулагч болох</h3>
              <p className="text-sm text-gray-500">Арга хэмжээ үүсгэх эрх авахын тулд хүсэлт илгээнэ</p>
            </div>

            {organizerStep === 'form' && (
              <form onSubmit={handleSubmitBecomeOrganizer} className="space-y-5">
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
                    Байгууллагын нэр
                  </label>
                  <input
                    id="organizationName"
                    type="text"
                    value={organizerForm.organizationName}
                    onChange={(e) =>
                      setOrganizerForm((s) => ({
                        ...s,
                        organizationName: e.target.value,
                      }))
                    }
                    placeholder="Ж: EventMN"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="organizerDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Тайлбар (сонголтоор)
                  </label>
                  <textarea
                    id="organizerDescription"
                    value={organizerForm.description}
                    onChange={(e) =>
                      setOrganizerForm((s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Товч танилцуулга"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="organizerWebsite" className="block text-sm font-medium text-gray-700 mb-2">
                    Вэбсайт (сонголтоор)
                  </label>
                  <input
                    id="organizerWebsite"
                    type="url"
                    value={organizerForm.website}
                    onChange={(e) =>
                      setOrganizerForm((s) => ({
                        ...s,
                        website: e.target.value,
                      }))
                    }
                    placeholder="https://example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-400">Зөв URL хэлбэртэй байх шаардлагатай</p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <p className="text-xs text-gray-500">Хүсэлт илгээсний дараа и-мэйлээр 6 оронтой код ирнэ</p>
                  <button
                    type="submit"
                    disabled={submittingOrganizer}
                    className="inline-flex items-center justify-center px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {submittingOrganizer ? 'Илгээж байна...' : 'Хүсэлт илгээх'}
                  </button>
                </div>
              </form>
            )}

            {organizerStep === 'otp' && (
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <p className="text-sm text-gray-600">И-мэйлээр ирсэн кодоо оруулж баталгаажуулна уу</p>
                  <button
                    type="button"
                    onClick={handleResendOrganizerOtp}
                    disabled={sendingOrganizerOtp}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {sendingOrganizerOtp ? 'Илгээж байна...' : 'Код дахин илгээх'}
                  </button>
                </div>

                <form onSubmit={handleVerifyOrganizerOtp} className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="organizerOtpCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Баталгаажуулах код
                    </label>
                    <input
                      id="organizerOtpCode"
                      type="text"
                      value={organizerOtpCode}
                      onChange={(e) => setOrganizerOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifyingOrganizerOtp}
                    className="inline-flex items-center justify-center px-5 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {verifyingOrganizerOtp ? 'Баталгаажуулж байна...' : 'Баталгаажуулах'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Organizer Events section moved to /dashboard/events */}
      </div>
    </>
  );
}
