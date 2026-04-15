'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store';
import { 
  User,
  Building2,
  Bell,
  CreditCard,
  Globe,
  Save,
  Camera
} from 'lucide-react';

export default function DashboardSettingsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'organization' | 'notifications' | 'billing'>('profile');
  const [saving, setSaving] = useState(false);

  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  const [orgForm, setOrgForm] = useState({
    organizationName: '',
    organizationType: 'individual',
    website: '',
    description: '',
    socialFacebook: '',
    socialInstagram: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNewBooking: true,
    emailEventReminder: true,
    emailWeeklyReport: false,
    pushNewBooking: true,
    pushEventReminder: true,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert('Тохиргоо хадгалагдлаа');
  };

  if (!isAuthenticated || !isOrganizer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Энэ хуудсыг харах эрх байхгүй байна.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Профайл', icon: User },
    { id: 'organization', label: 'Байгууллага', icon: Building2 },
    { id: 'notifications', label: 'Мэдэгдэл', icon: Bell },
    { id: 'billing', label: 'Төлбөр', icon: CreditCard },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Тохиргоо</h2>
        <p className="text-gray-500 mt-1">Таны бүртгэл болон байгууллагын тохиргоо</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-500 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              {/* Avatar */}
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.firstName || 'User'}
                      className="w-24 h-24 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                      <User className="w-12 h-12 text-white" />
                    </div>
                  )}
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <p className="text-xs text-primary-600 mt-1">Зохион байгуулагч</p>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Овог</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Нэр</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имэйл</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Утасны дугаар</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+976 9999 9999"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="max-w-2xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Байгууллагын нэр</label>
                  <input
                    type="text"
                    value={orgForm.organizationName}
                    onChange={(e) => setOrgForm({ ...orgForm, organizationName: e.target.value })}
                    placeholder="Таны байгууллагын нэр"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Төрөл</label>
                  <select
                    value={orgForm.organizationType}
                    onChange={(e) => setOrgForm({ ...orgForm, organizationType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="individual">Хувь хүн</option>
                    <option value="company">Компани</option>
                    <option value="ngo">Төрийн бус байгууллага</option>
                    <option value="government">Төрийн байгууллага</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Вэб хуудас</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={orgForm.website}
                      onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Танилцуулга</label>
                  <textarea
                    value={orgForm.description}
                    onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                    rows={4}
                    placeholder="Байгууллагын тухай товч танилцуулга..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Сошиал хаягууд</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Facebook</label>
                      <input
                        type="url"
                        value={orgForm.socialFacebook}
                        onChange={(e) => setOrgForm({ ...orgForm, socialFacebook: e.target.value })}
                        placeholder="https://facebook.com/..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Instagram</label>
                      <input
                        type="url"
                        value={orgForm.socialInstagram}
                        onChange={(e) => setOrgForm({ ...orgForm, socialInstagram: e.target.value })}
                        placeholder="https://instagram.com/..."
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <div className="space-y-6">
                {/* Email Notifications */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Имэйл мэдэгдэл</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Шинэ захиалга</p>
                        <p className="text-xs text-gray-500">Тасалбар захиалах бүрт мэдэгдэл авах</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNewBooking}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNewBooking: e.target.checked })}
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Арга хэмжээний сануулга</p>
                        <p className="text-xs text-gray-500">Арга хэмжээ эхлэхээс өмнө сануулга авах</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailEventReminder}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailEventReminder: e.target.checked })}
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Долоо хоногийн тайлан</p>
                        <p className="text-xs text-gray-500">7 хоног тутамд тайлан авах</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailWeeklyReport}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, emailWeeklyReport: e.target.checked })}
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Push Notifications */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Push мэдэгдэл</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Шинэ захиалга</p>
                        <p className="text-xs text-gray-500">Тасалбар захиалах бүрт push мэдэгдэл авах</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushNewBooking}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNewBooking: e.target.checked })}
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Арга хэмжээний сануулга</p>
                        <p className="text-xs text-gray-500">Арга хэмжээ эхлэхээс өмнө push сануулга авах</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushEventReminder}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, pushEventReminder: e.target.checked })}
                        className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="max-w-2xl">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Төлбөрийн тохиргоо</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Тун удахгүй! Та орлогоо шууд банкны данс руу хүлээн авах боломжтой болно.
                </p>
                <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium cursor-not-allowed">
                  Тун удахгүй
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Хадгалж байна...' : 'Хадгалах'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
