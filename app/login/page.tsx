'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('username', phone)
  .eq('password', password)
  .limit(1);

    setLoading(false);

    if (error) {
      alert('เกิดข้อผิดพลาดจากฐานข้อมูล: ' + error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      return;
    }

    const user = data[0];
    localStorage.setItem('user', JSON.stringify(user));

    // แยกทางวิ่งตามยศอย่างชัดเจน
    if (user.role === 'admin') {
      router.push('/admin');
    } else if (user.role === 'agent') {
      router.push('/agent');
    } else {
      router.push('/members');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md space-y-4 shadow-xl">
        <h1 className="text-2xl font-bold text-center text-amber-400">🎰 Borndee</h1>
        <div>
          <label className="text-sm text-slate-400">ชื่อผู้ใช้งาน</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full mt-1 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
            placeholder="เช่น admin01 หรือ agent01"
            required
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 p-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-400 text-white"
            placeholder="********"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition"
        >
          {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}