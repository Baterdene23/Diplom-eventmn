'use client';

import Link from 'next/link';
import { Calendar, Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">EventMN</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Монголын шилдэг арга хэмжээ захиалгын платформ. 
              Концерт, хурал, спорт тэмцээн болон бусад арга хэмжээнд хялбархан захиалга хийгээрэй.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-pink-600 flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-blue-500 flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Холбоосууд</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/events" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Бүх арга хэмжээ
                </Link>
              </li>
              <li>
                <Link href="/events?category=CONCERT" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Тоглолтууд
                </Link>
              </li>
              <li>
                <Link href="/events?category=CONFERENCE" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Хурал, семинар
                </Link>
              </li>
              <li>
                <Link href="/events?category=SPORTS" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Спорт тэмцээн
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Тусламж</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/help" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Түгээмэл асуултууд
                </Link>
              </li>
              <li>
                <Link href="/help/refund" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Буцаалтын бодлого
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Үйлчилгээний нөхцөл
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Нууцлалын бодлого
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Холбоо барих</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">Улаанбаатар хот, СБД</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">+976 9911 2233</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">info@eventmn.mn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2024 EventMN. Бүх эрх хуулиар хамгаалагдсан.
          </p>
          <p className="text-gray-500 text-sm">
            Microservices Architecture Demo - Diploma Project
          </p>
        </div>
      </div>
    </footer>
  );
}
