'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminLotteryPage() {
  const [lotteryType, setLotteryType] = useState('lao');
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [fourDigits, setFourDigits] = useState('');
  const [threeTop, setThreeTop] = useState('');
  const [twoBottom, setTwoBottom] = useState('');
  const [animalName, setAnimalName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fourDigits || !threeTop || !twoBottom) {
      alert('กรุณากรอกข้อมูลตัวเลขให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        lottery_type: lotteryType,
        draw_date: drawDate,
        four_digits: fourDigits,
        three_top: threeTop,
        two_bottom: twoBottom,
        animal_name: animalName,
      };

      // บันทึกหรืออัปเดตลงตาราง lottery_results ใน Supabase
      const { error } = await supabase
        .from('lottery_results')
        .upsert([payload], { onConflict: 'draw_date,lottery_type' });

      if (error) throw error;

      alert('บันทึกผลหวยสำเร็จเรียบร้อยแล้ว!');
      // เคลียร์ช่องกรอกเฉพาะตัวเลข
      setFourDigits('');
      setThreeTop('');
      setTwoBottom('');
      setAnimalName('');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-xl mx-auto bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-amber-400">🛠️ หลังบ้าน: บันทึกผลหวย</h1>
          <p className="text-slate-400 text-sm mt-1">กรอกผลรางวัลประจำงวดเพื่อให้หน้าสมาชิกแสดงผลอัตโนมัติ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">ประเภทหวย</label>
            <select
              value={lotteryType}
              onChange={(e) => setLotteryType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
            >
              <option value="lao">หวยลาวพัฒนา</option>
              <option value="hnoy">หวยฮานอย</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">งวดประจำวันที่</label>
            <input
              type="date"
              value={drawDate}
              onChange={(e) => setDrawDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">เลข 4 ตัว</label>
              <input
                type="text"
                maxLength={4}
                placeholder="เช่น 3653"
                value={fourDigits}
                onChange={(e) => setFourDigits(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">ชื่อนามสัตว์</label>
              <input
                type="text"
                placeholder="เช่น ช้าง"
                value={animalName}
                onChange={(e) => setAnimalName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">3 ตัวบน</label>
              <input
                type="text"
                maxLength={3}
                placeholder="เช่น 653"
                value={threeTop}
                onChange={(e) => setThreeTop(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">2 ตัวล่าง</label>
              <input
                type="text"
                maxLength={2}
                placeholder="เช่น 53"
                value={twoBottom}
                onChange={(e) => setTwoBottom(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-4"
          >
            {loading ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกผลรางวัล'}
          </button>
        </form>
      </div>
    </div>
  );
}