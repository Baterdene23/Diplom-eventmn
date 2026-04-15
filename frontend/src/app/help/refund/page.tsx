'use client';

import Link from 'next/link';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/help" className="text-primary-500 hover:text-primary-600 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Тусламж руу буцах
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Буцаалтын бодлого</h1>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          {/* Refund Tiers */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Буцаалтын хувь хэмжээ</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  100%
                </div>
                <div>
                  <p className="font-medium text-gray-900">48+ цагийн өмнө</p>
                  <p className="text-sm text-gray-600">Event эхлэхээс 48 цаг ба түүнээс өмнө цуцлавал бүрэн буцаалт</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                  50%
                </div>
                <div>
                  <p className="font-medium text-gray-900">24-48 цагийн хооронд</p>
                  <p className="text-sm text-gray-600">Event эхлэхээс 24-48 цагийн хооронд цуцлавал 50% буцаалт</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                  0%
                </div>
                <div>
                  <p className="font-medium text-gray-900">24 цагаас бага</p>
                  <p className="text-sm text-gray-600">Event эхлэхээс 24 цагийн дотор цуцлавал буцаалт байхгүй</p>
                </div>
              </div>
            </div>
          </div>

          {/* Process */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Буцаалтын процесс</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>&quot;Миний захиалгууд&quot; хэсэгт орно</li>
              <li>Цуцлах захиалгаа сонгоно</li>
              <li>&quot;Цуцлах&quot; товчийг дарна</li>
              <li>Буцаалтын хувь хэмжээг харж баталгаажуулна</li>
              <li>Буцаалт 3-5 ажлын өдрийн дотор шилжүүлэгдэнэ</li>
            </ol>
          </div>

          {/* Exceptions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Онцгой тохиолдол</h2>
            <p className="text-gray-600 mb-3">
              Дараах тохиолдолд бүрэн буцаалт хийгдэнэ:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Event цуцлагдсан тохиолдолд</li>
              <li>Event огноо, байршил өөрчлөгдсөн тохиолдолд</li>
              <li>Техникийн алдаанаас болж давхар захиалга үүссэн тохиолдолд</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Асуулт байвал <a href="mailto:support@eventmn.mn" className="text-primary-500 hover:underline">support@eventmn.mn</a> хаягаар холбогдоно уу.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
