'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Үйлчилгээний нөхцөл</h1>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <p className="text-gray-600">
            Сүүлд шинэчилсэн: 2026 оны 3-р сарын 21
          </p>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Үйлчилгээний тодорхойлолт</h2>
            <p className="text-gray-600">
              EventMN нь арга хэмжээ, тоглолт, хурлын тасалбар захиалах платформ юм.
              Бид зохион байгуулагч болон үзэгч/оролцогчдыг холбох зуучлалын үйлчилгээ үзүүлдэг.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Хэрэглэгчийн бүртгэл</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Бүртгүүлэхдээ үнэн зөв мэдээлэл оруулах</li>
              <li>Нэг хүн нэг бүртгэлтэй байх</li>
              <li>Нууц үгээ хамгаалах үүрэгтэй</li>
              <li>18 нас хүрсэн байх (насанд хүрээгүй бол эцэг эхийн зөвшөөрөлтэй)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Захиалга ба төлбөр</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Суудал сонгосноос хойш 10 минутын дотор төлбөр хийх</li>
              <li>Төлбөр баталгаажсаны дараа захиалга идэвхжинэ</li>
              <li>Тасалбарын үнийг зохион байгуулагч тогтооно</li>
              <li>Үйлчилгээний шимтгэл нэмэгдэж болно</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Буцаалт ба цуцлалт</h2>
            <p className="text-gray-600 mb-2">
              Буцаалтын бодлогыг <Link href="/help/refund" className="text-primary-500 hover:underline">эндээс</Link> дэлгэрэнгүй харна уу:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>48+ цагийн өмнө: 100% буцаалт</li>
              <li>24-48 цаг: 50% буцаалт</li>
              <li>24 цагаас бага: Буцаалт байхгүй</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Зохион байгуулагчийн үүрэг</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Event-ийн мэдээллийг үнэн зөв оруулах</li>
              <li>Тасалбарын үнийг тогтоох</li>
              <li>Event цуцлагдвал хэрэглэгчдэд мэдэгдэх</li>
              <li>Захиалагчдад чанартай үйлчилгээ үзүүлэх</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Хориглох зүйлс</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Хуурамч мэдээлэл оруулах</li>
              <li>Тасалбар дахин борлуулах (scalping)</li>
              <li>Системд халдах оролдлого хийх</li>
              <li>Бусад хэрэглэгчдэд саад учруулах</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Хариуцлагын хязгаарлалт</h2>
            <p className="text-gray-600">
              EventMN нь зуучлалын үйлчилгээ үзүүлдэг бөгөөд event-ийн чанар, агуулгад хариуцлага хүлээхгүй.
              Зохион байгуулагч болон үзэгчийн хоорондын маргаанд шууд оролцохгүй.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Нөхцөлийн өөрчлөлт</h2>
            <p className="text-gray-600">
              Бид энэхүү нөхцөлийг хэдийд ч өөрчлөх эрхтэй. Томоохон өөрчлөлтийн тухай 
              бүртгэлтэй хэрэглэгчдэд имэйлээр мэдэгдэнэ.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Холбоо барих</h2>
            <p className="text-gray-600">
              Үйлчилгээний нөхцөлийн талаар асуулт байвал <a href="mailto:legal@eventmn.mn" className="text-primary-500 hover:underline">legal@eventmn.mn</a> хаягаар холбогдоно уу.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-primary-500 hover:text-primary-600 text-sm">
            Нүүр хуудас руу буцах
          </Link>
        </div>
      </div>
    </div>
  );
}
