'use client';

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Нууцлалын бодлого</h1>
        
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
          <p className="text-gray-600">
            Сүүлд шинэчилсэн: 2026 оны 3-р сарын 21
          </p>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Ерөнхий мэдээлэл</h2>
            <p className="text-gray-600">
              EventMN нь таны хувийн мэдээллийг хамгаалах, нууцлалыг хангахад онцгой анхаарал хандуулдаг.
              Энэхүү бодлого нь бидний вэбсайт болон үйлчилгээг ашиглах үед таны мэдээллийг хэрхэн цуглуулж, 
              ашиглаж, хадгалдаг талаар тайлбарлана.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Цуглуулдаг мэдээлэл</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Бүртгэлийн мэдээлэл:</strong> Нэр, имэйл хаяг, утасны дугаар</li>
              <li><strong>Төлбөрийн мэдээлэл:</strong> Төлбөрийн түүх (картын мэдээлэл хадгалагдахгүй)</li>
              <li><strong>Захиалгын мэдээлэл:</strong> Захиалсан event, суудлын мэдээлэл</li>
              <li><strong>Техникийн мэдээлэл:</strong> IP хаяг, хөтчийн төрөл, cookie</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Мэдээллийн ашиглалт</h2>
            <p className="text-gray-600 mb-2">Бид таны мэдээллийг дараах зорилгоор ашиглана:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Захиалга боловсруулах, баталгаажуулах</li>
              <li>Event-ийн талаар мэдэгдэл илгээх</li>
              <li>Үйлчилгээгээ сайжруулах</li>
              <li>Хэрэглэгчийн дэмжлэг үзүүлэх</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Мэдээллийн хамгаалалт</h2>
            <p className="text-gray-600">
              Бид таны мэдээллийг хамгаалахын тулд салбарын стандарт аюулгүй байдлын арга хэмжээг авдаг:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mt-2">
              <li>SSL/TLS шифрлэлт</li>
              <li>Нууц үгийг bcrypt-ээр hash хийх</li>
              <li>JWT токен баталгаажуулалт</li>
              <li>Тогтмол аюулгүй байдлын шалгалт</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookie</h2>
            <p className="text-gray-600">
              Бид сессийн удирдлага болон хэрэглэгчийн туршлагыг сайжруулахад cookie ашигладаг.
              Та хөтчийнхөө тохиргооноос cookie-г идэвхгүй болгох боломжтой.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Таны эрхүүд</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Өөрийн мэдээлэлд хандах эрх</li>
              <li>Мэдээллээ засах эрх</li>
              <li>Мэдээллээ устгуулах эрх</li>
              <li>Мэдээллийн боловсруулалтаас татгалзах эрх</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Холбоо барих</h2>
            <p className="text-gray-600">
              Нууцлалын талаар асуулт байвал <a href="mailto:privacy@eventmn.mn" className="text-primary-500 hover:underline">privacy@eventmn.mn</a> хаягаар холбогдоно уу.
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
