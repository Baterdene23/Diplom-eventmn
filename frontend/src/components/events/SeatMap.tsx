'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Seat {
  seatId?: string;
  sectionId: string;
  sectionName: string;
  row: number;
  seatNumber: number;
  price: number;
}

interface SeatMapProps {
  sections: Array<{
    id: string;
    name: string;
    rows: number;
    seatsPerRow: number;
    price: number;
    color: string;
    capacity?: number;
  }>;
  lockedSeats: Array<{ sectionId: string; row: number; seatNumber: number }>;
  bookedSeats: Array<{ sectionId: string; row: number; seatNumber: number }>;
  selectedSeats: Seat[];
  onSeatClick: (seat: Seat) => void;
  currentUserId?: string;
}

// Row labels (A, B, C, ...)
const getRowLabel = (rowIndex: number): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (rowIndex < 26) return alphabet[rowIndex];
  return `${alphabet[Math.floor(rowIndex / 26) - 1]}${alphabet[rowIndex % 26]}`;
};

export function SeatMap({
  sections,
  lockedSeats,
  bookedSeats,
  selectedSeats,
  onSeatClick,
}: SeatMapProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'section'>('overview');
  const [activeSection, setActiveSection] = useState(sections[0]?.id);

  // Calculate statistics
  const sectionStats = useMemo(() => {
    return sections.map(section => {
      const totalSeats = section.rows * section.seatsPerRow;
      const capacity = typeof section.capacity === 'number' && Number.isFinite(section.capacity)
        ? Math.max(0, Math.floor(section.capacity))
        : totalSeats;
      const bookedCount = bookedSeats.filter(s => s.sectionId === section.id).length;
      const lockedCount = lockedSeats.filter(s => s.sectionId === section.id).length;
      const availableCount = capacity - bookedCount - lockedCount;
      return {
        ...section,
        totalSeats,
        capacity,
        bookedCount,
        lockedCount,
        availableCount,
        availablePercent: capacity > 0 ? Math.round((availableCount / capacity) * 100) : 0,
      };
    });
  }, [sections, bookedSeats, lockedSeats]);

  // Check if seat is locked/booked/selected
  const getSeatStatus = (sectionId: string, row: number, seatNumber: number) => {
    if (bookedSeats.some(s => s.sectionId === sectionId && s.row === row && s.seatNumber === seatNumber)) {
      return 'booked';
    }
    if (lockedSeats.some(s => s.sectionId === sectionId && s.row === row && s.seatNumber === seatNumber)) {
      return 'locked';
    }
    if (selectedSeats.some(s => s.sectionId === sectionId && s.row === row && s.seatNumber === seatNumber)) {
      return 'selected';
    }
    return 'available';
  };

  const currentSection = sections.find(s => s.id === activeSection);
  const currentStats = sectionStats.find(s => s.id === activeSection);

  const isSeatInCapacity = (sectionId: string, row: number, seatNumber: number) => {
    const stats = sectionStats.find((s) => s.id === sectionId);
    const cap = stats?.capacity;
    if (typeof cap !== 'number') return true;
    if (cap <= 0) return false;

    const base = (row - 1) * (stats?.seatsPerRow || 0);
    const index = base + seatNumber;
    return index >= 1 && index <= cap;
  };

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setViewMode('overview')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewMode === 'overview'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Заалны зураг
          </button>
          <button
            onClick={() => setViewMode('section')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              viewMode === 'section'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Суудал сонгох
          </button>
        </div>
        
        {/* Selection count */}
        {selectedSeats.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {selectedSeats.length} суудал сонгосон
          </div>
        )}
      </div>

      {/* Overview Mode - Hall Layout */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Stage */}
          <div className="relative">
            <div className="w-full h-16 bg-gradient-to-b from-gray-300 to-gray-200 rounded-t-[50%] flex items-center justify-center shadow-inner">
              <span className="text-sm text-gray-600 font-semibold tracking-[0.3em] uppercase">Тайз</span>
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4/5 h-6 bg-gray-200/50 rounded-[100%] blur-lg" />
          </div>

          {/* Hall Layout - Sections Overview */}
          <div className="relative pt-8 pb-4">
            <div className="flex flex-col items-center gap-3">
              {sectionStats.map((section, index) => {
                const isSelected = selectedSeats.some(s => s.sectionId === section.id);
                const width = index === 0 ? '60%' : index === 1 ? '75%' : '90%';
                
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setViewMode('section');
                    }}
                    className={cn(
                      'relative py-4 px-6 rounded-xl transition-all duration-300 group',
                      'hover:shadow-lg hover:scale-[1.02]',
                      isSelected && 'ring-2 ring-primary-500 ring-offset-2'
                    )}
                    style={{ 
                      width,
                      backgroundColor: section.color || '#6366f1',
                      opacity: section.availableCount > 0 ? 1 : 0.5
                    }}
                  >
                    <div className="flex items-center justify-between text-white">
                      <div className="text-left">
                        <p className="font-bold text-lg">{section.name}</p>
                        <p className="text-sm opacity-90">{section.price.toLocaleString()}₮</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{section.availableCount}</p>
                        <p className="text-xs opacity-75">/{section.totalSeats} сул</p>
                      </div>
                    </div>
                    
                    {/* Availability bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 rounded-b-xl overflow-hidden">
                      <div 
                        className="h-full bg-white/80 transition-all"
                        style={{ width: `${section.availablePercent}%` }}
                      />
                    </div>
                    
                    {/* Hover indicator */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white font-medium flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Суудал үзэх
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            {sectionStats.map(section => (
              <div 
                key={section.id}
                className="bg-gray-50 rounded-xl p-4 text-center"
              >
                <div 
                  className="w-4 h-4 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: section.color || '#6366f1' }}
                />
                <p className="text-sm text-gray-600 mb-1">{section.name}</p>
                <p className="text-lg font-bold text-gray-900">
                  {section.availableCount} <span className="text-sm font-normal text-gray-500">сул</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Mode - Seat Selection */}
      {viewMode === 'section' && (
        <div className="space-y-6">
          {/* Section Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sectionStats.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex flex-col items-center gap-1',
                  activeSection === section.id
                    ? 'text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                style={activeSection === section.id ? { backgroundColor: section.color || '#6366f1' } : {}}
              >
                <span>{section.name}</span>
                <span className="text-xs opacity-80">
                  {section.price.toLocaleString()}₮ • {section.availableCount} сул
                </span>
              </button>
            ))}
          </div>

          {/* Stage */}
          <div className="relative">
            <div className="w-full h-12 bg-gradient-to-b from-gray-200 to-gray-100 rounded-t-3xl flex items-center justify-center">
              <span className="text-sm text-gray-500 font-medium tracking-wider">ТАЙЗ</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-gray-200 rounded-full blur-md opacity-50" />
          </div>

          {/* Seat Grid */}
          {currentSection && currentStats && (
            <div className="p-6 bg-gray-50 rounded-2xl overflow-x-auto">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: currentSection.color || '#6366f1' }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{currentSection.name}</h3>
                    <p className="text-sm text-gray-500">
                      {currentStats.rows} эгнээ × {currentStats.seatsPerRow} суудал = {currentStats.totalSeats} суудал
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: currentSection.color || '#6366f1' }}>
                    {currentSection.price.toLocaleString()}₮
                  </p>
                  <p className="text-sm text-gray-500">нэг суудал</p>
                </div>
              </div>

              {/* Seats */}
              <div className="min-w-[400px] space-y-2">
                {Array.from({ length: currentSection.rows }, (_, rowIndex) => {
                  const rowLabel = getRowLabel(rowIndex);
                  return (
                    <div key={rowIndex} className="flex items-center gap-3">
                      {/* Row Label (left) */}
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-500 font-bold bg-gray-100 rounded-lg">
                        {rowLabel}
                      </div>
                      
                      {/* Seats */}
                      <div className="flex-1 flex justify-center gap-1.5">
                        {/* Left side seats */}
                        {Array.from({ length: Math.ceil(currentSection.seatsPerRow / 2) }, (_, seatIndex) => {
                          const seatNum = seatIndex + 1;
                          const inCapacity = isSeatInCapacity(currentSection.id, rowIndex + 1, seatNum);
                          const status = getSeatStatus(currentSection.id, rowIndex + 1, seatNum);
                          const seat: Seat = {
                            sectionId: currentSection.id,
                            sectionName: currentSection.name,
                            row: rowIndex + 1,
                            seatNumber: seatNum,
                            price: currentSection.price,
                          };

                          return (
                            <button
                              key={`left-${seatIndex}`}
                              onClick={() => inCapacity && (status === 'available' || status === 'selected') ? onSeatClick(seat) : null}
                              disabled={!inCapacity || status === 'booked' || status === 'locked'}
                              className={cn(
                                'w-9 h-9 rounded-t-lg rounded-b-md text-xs font-medium transition-all duration-200 relative',
                                !inCapacity && 'bg-transparent border-2 border-transparent cursor-default',
                                status === 'available' && 'bg-white border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-pointer hover:scale-110',
                                status === 'selected' && 'bg-primary-500 text-white border-2 border-primary-600 shadow-lg shadow-primary-500/30 scale-110',
                                status === 'locked' && 'bg-amber-100 border-2 border-amber-300 cursor-not-allowed',
                                status === 'booked' && 'bg-gray-300 border-2 border-gray-400 cursor-not-allowed'
                              )}
                              style={status === 'selected' ? { backgroundColor: currentSection.color || '#6366f1' } : {}}
                              title={
                                !inCapacity ? '' :
                                status === 'booked' ? 'Баталгаажсан' :
                                status === 'locked' ? 'Түр түгжигдсэн (10 мин)' :
                                `${rowLabel} эгнээ, ${seatNum} суудал - ${currentSection.price.toLocaleString()}₮`
                              }
                            >
                              {inCapacity ? seatNum : ''}
                            </button>
                          );
                        })}
                        
                        {/* Aisle - walking space */}
                        <div className="w-8 flex items-center justify-center">
                          <div className="w-1 h-6 bg-gray-200 rounded-full" />
                        </div>
                        
                        {/* Right side seats */}
                        {Array.from({ length: Math.floor(currentSection.seatsPerRow / 2) }, (_, seatIndex) => {
                          const seatNum = Math.ceil(currentSection.seatsPerRow / 2) + seatIndex + 1;
                          const inCapacity = isSeatInCapacity(currentSection.id, rowIndex + 1, seatNum);
                          const status = getSeatStatus(currentSection.id, rowIndex + 1, seatNum);
                          const seat: Seat = {
                            sectionId: currentSection.id,
                            sectionName: currentSection.name,
                            row: rowIndex + 1,
                            seatNumber: seatNum,
                            price: currentSection.price,
                          };

                          return (
                            <button
                              key={`right-${seatIndex}`}
                              onClick={() => inCapacity && (status === 'available' || status === 'selected') ? onSeatClick(seat) : null}
                              disabled={!inCapacity || status === 'booked' || status === 'locked'}
                              className={cn(
                                'w-9 h-9 rounded-t-lg rounded-b-md text-xs font-medium transition-all duration-200 relative',
                                !inCapacity && 'bg-transparent border-2 border-transparent cursor-default',
                                status === 'available' && 'bg-white border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-pointer hover:scale-110',
                                status === 'selected' && 'bg-primary-500 text-white border-2 border-primary-600 shadow-lg shadow-primary-500/30 scale-110',
                                status === 'locked' && 'bg-amber-100 border-2 border-amber-300 cursor-not-allowed',
                                status === 'booked' && 'bg-gray-300 border-2 border-gray-400 cursor-not-allowed'
                              )}
                              style={status === 'selected' ? { backgroundColor: currentSection.color || '#6366f1' } : {}}
                              title={
                                !inCapacity ? '' :
                                status === 'booked' ? 'Баталгаажсан' :
                                status === 'locked' ? 'Түр түгжигдсэн (10 мин)' :
                                `${rowLabel} эгнээ, ${seatNum} суудал - ${currentSection.price.toLocaleString()}₮`
                              }
                            >
                              {inCapacity ? seatNum : ''}
                            </button>
                          );
                        })}
                      </div>

                      {/* Row Label (right) */}
                      <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-500 font-bold bg-gray-100 rounded-lg">
                        {rowLabel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Back to Overview */}
          <button
            onClick={() => setViewMode('overview')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Заалны зураг руу буцах
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-t-lg rounded-b-md bg-white border-2 border-gray-200" />
          <span className="text-gray-600">Сул</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-t-lg rounded-b-md bg-primary-500 border-2 border-primary-600" />
          <span className="text-gray-600">Сонгосон</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-t-lg rounded-b-md bg-amber-100 border-2 border-amber-300" />
          <span className="text-gray-600">Түгжигдсэн</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-t-lg rounded-b-md bg-gray-300 border-2 border-gray-400" />
          <span className="text-gray-600">Баталгаажсан</span>
        </div>
      </div>
    </div>
  );
}
