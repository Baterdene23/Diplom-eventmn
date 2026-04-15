'use client';

import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Тусламж</h1>
        
        <div className="space-y-6">
          {/* FAQ Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Түгээмэл асуултууд</h2>
            
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-medium text-gray-900 mb-2">Хэрхэн бүртгүүлэх вэ?</h3>
                <p className="text-gray-600 text-sm">
                  Нүүр хуудасны баруун дээд буланд байрлах &quot;Бүртгүүлэх&quot; товчийг дарж, имэйл хаяг, нууц үг оруулна уу.
                </p>
              </div>
              
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-medium text-gray-900 mb-2">Суудал хэрхэн сонгох вэ?</h3>
                <p className="text-gray-600 text-sm">
                  Event дэлгэрэнгүй хуудаснаас суудлын зураглалаас хүссэн суудлаа сонгоод &quot;Захиалах&quot; товчийг дарна уу.
                  Суудал 10 минутын турш түгжигдэнэ.
                </p>
              </div>
              
              <div className="border-b border-gray-100 pb-4">
                <h3 className="font-medium text-gray-900 mb-2">Захиалгаа хэрхэн цуцлах вэ?</h3>
                <p className="text-gray-600 text-sm">
                  Миний захиалгууд хэсэгт орж, захиалгаа сонгоод &quot;Цуцлах&quot; товчийг дарна уу.
                  Буцаалтын бодлогыг <Link href="/help/refund" className="text-primary-500 hover:underline">эндээс</Link> харна уу.
                </p>
              </div>
              
              <div className="pb-4">
                <h3 className="font-medium text-gray-900 mb-2">Төлбөр хэрхэн хийх вэ?</h3>
                <p className="text-gray-600 text-sm">
                  Одоогоор QPay болон карт төлбөрийн системтэй холбогдсон. Захиалга баталгаажуулах үед төлбөрийн хэлбэрээ сонгоно уу.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Холбоо барих</h2>
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">
                <span className="font-medium text-gray-900">Имэйл:</span> support@eventmn.mn
              </p>
              <p className="text-gray-600">
                <span className="font-medium text-gray-900">Утас:</span> +976 7711-1234
              </p>
              <p className="text-gray-600">
                <span className="font-medium text-gray-900">Ажлын цаг:</span> Даваа-Баасан 09:00-18:00
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Холбоосууд</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/help/refund" className="text-primary-500 hover:text-primary-600 text-sm">
                Буцаалтын бодлого
              </Link>
              <Link href="/privacy" className="text-primary-500 hover:text-primary-600 text-sm">
                Нууцлалын бодлого
              </Link>
              <Link href="/terms" className="text-primary-500 hover:text-primary-600 text-sm">
                Үйлчилгээний нөхцөл
              </Link>
              <Link href="/" className="text-primary-500 hover:text-primary-600 text-sm">
                Нүүр хуудас
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
