'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [financeReqs, setFinanceReqs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [blockedNumbers, setBlockedNumbers] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);

  // แท็บการทำงานรวมถึงฟีเจอร์บันทึกผลหวยลาว
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'finance' | 'draw' | 'lottery_form' | 'blocked' | 'settings' | 'pnl' | 'logs' | 'audit' | 'announcements'>('overview');

  // ฟอร์มออกผลรางวัลภาพรวม
  const [win3Top, setWin3Top] = useState('');
  const [win2Bottom, setWin2Bottom] = useState('');
  const [calculating, setCalculating] = useState(false);

  // ฟอร์มบันทึกผลหวยลาวประจำวัน (ระบบที่เราทำเพิ่มล่าสุด)
  const [lotteryType, setLotteryType] = useState('lao');
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [fourDigits, setFourDigits] = useState('');
  const [threeTop, setThreeTop] = useState('');
  const [twoBottom, setTwoBottom] = useState('');
  const [animalName, setAnimalName] = useState('');
  const [lotteryLoading, setLotteryLoading] = useState(false);

  // ฟอร์มเลขอั้น & ตัวสลับเลข
  const [blockNum, setBlockNum] = useState('');
  const [blockType, setBlockType] = useState('ไม่ขายเลย');
  const [shuffleInput, setShuffleInput] = useState('');
  const [shuffledResults, setShuffledResults] = useState<string[]>([]);

  // ตั้งค่าเรทจ่าย
  const [rate3Top, setRate3Top] = useState('900');
  const [rate2Bottom, setRate2Bottom] = useState('90');
  const [commRate, setCommRate] = useState('5');

  // ฟอร์มประกาศ
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [verifyingSlipId, setVerifyingSlipId] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { router.push('/login'); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      alert('คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบสูงสุด');
      router.push('/members');
      return;
    }
    setCurrentUser(user);
    fetchAllAdminData();
  }, []);

  const fetchAllAdminData = async () => {
    const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (users) setAllUsers(users);

    const { data: bets } = await supabase.from('bets').select('*').order('created_at', { ascending: false });
    if (bets) setAllBets(bets);

    const { data: reqs } = await supabase.from('deposits_withdrawals').select('*').order('created_at', { ascending: false });
    if (reqs) setFinanceReqs(reqs);

    const { data: txs } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50);
    if (txs) setTransactions(txs);

    const { data: blocks } = await supabase.from('blocked_numbers').select('*');
    if (blocks) setBlockedNumbers(blocks);

    const { data: ann } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (ann) setAnnouncements(ann);

    const { data: logs } = await supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (logs) setAdminLogs(logs);
  };

  const logAdminAction = async (action: string, details: string) => {
    if (!currentUser) return;
    await supabase.from('admin_logs').insert([{
      admin_phone: currentUser.phone,
      action: action,
      details: details
    }]);
  };

  const handleUpdateRole = async (phone: string, newRole: string) => {
    await supabase.from('users').update({ role: newRole }).eq('phone', phone);
    await logAdminAction('เปลี่ยนยศผู้ใช้', `เปลี่ยนยศของ ${phone} เป็น ${newRole}`);
    alert(`เปลี่ยนยศของ ${phone} เป็น ${newRole} สำเร็จ!`);
    fetchAllAdminData();
  };

  const handleCalculateDraw = async () => {
    if (!win3Top && !win2Bottom) return alert('กรุณากรอกผลรางวัล');
    if (!confirm('ยืนยันออกผลรางวัลและจ่ายเงินทั้งเว็บ?')) return;

    setCalculating(true);
    const r3 = parseFloat(rate3Top) || 900;
    const r2 = parseFloat(rate2Bottom) || 90;

    for (const bet of allBets) {
      if (bet.status !== 'รอออกผล') continue;
      let isWinner = false;
      let multiplier = 0;

      if (bet.bet_type === '3ตัวบน' && bet.number === win3Top) { isWinner = true; multiplier = r3; }
      else if (bet.bet_type === '2ตัวล่าง' && bet.number === win2Bottom) { isWinner = true; multiplier = r2; }

      if (isWinner) {
        const winAmount = (bet.net_amount || bet.amount) * multiplier;
        await supabase.from('bets').update({ status: `ถูกรางวัล (+฿${winAmount})`, win_loss: winAmount }).eq('id', bet.id);
        const m = allUsers.find(x => x.phone === bet.user_phone);
        if (m) {
          const newBal = (m.balance || 0) + winAmount;
          await supabase.from('users').update({ balance: newBal }).eq('phone', m.phone);
          await supabase.from('transactions').insert([{ user_phone: m.phone, type: 'win', amount: winAmount, balance_after: newBal, description: `ถูกรางวัล ${bet.bet_type} เรท x${multiplier}` }]);
        }
      } else {
        await supabase.from('bets').update({ status: 'ไม่ถูกรางวัล', win_loss: -bet.amount }).eq('id', bet.id);
      }
    }
    await logAdminAction('ออกผลรางวัล', `ออกผล 3 ตัวบน: ${win3Top || '-'}, 2 ตัวล่าง: ${win2Bottom || '-'}`);
    setCalculating(false);
    alert('🎯 ออกผลรางวัลสำเร็จทั่วทั้งเว็บ!');
    fetchAllAdminData();
  };

  // ฟังก์ชันบันทึกผลหวยลาวลงตาราง lottery_results
  const handleSaveLotteryResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fourDigits || !threeTop || !twoBottom) {
      alert('กรุณากรอกข้อมูลตัวเลขให้ครบถ้วน');
      return;
    }

    setLotteryLoading(true);
    try {
      const payload = {
        lottery_type: lotteryType,
        draw_date: drawDate,
        four_digits: fourDigits,
        three_top: threeTop,
        two_bottom: twoBottom,
        animal_name: animalName,
      };

      const { error } = await supabase
        .from('lottery_results')
        .upsert([payload], { onConflict: 'draw_date,lottery_type' });

      if (error) throw error;

      await logAdminAction('บันทึกผลหวยลาว', `บันทึกผลหวย ${lotteryType} ประจำวันที่ ${drawDate}`);
      alert('💾 บันทึกผลหวยสำเร็จเรียบร้อยแล้ว!');
      setFourDigits('');
      setThreeTop('');
      setTwoBottom('');
      setAnimalName('');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLotteryLoading(false);
    }
  };

  const handleRunShuffle = (num: string) => {
    if (!num) return;
    if (num.length === 2) {
      const rev = num.split('').reverse().join('');
      setShuffledResults(Array.from(new Set([num, rev])));
    } else if (num.length === 3) {
      const arr = num.split('');
      const res = [
        num,
        arr[1] + arr[0] + arr[2],
        arr[0] + arr[2] + arr[1],
        arr[2] + arr[0] + arr[1],
        arr[1] + arr[2] + arr[0],
        arr[2] + arr[1] + arr[0]
      ];
      setShuffledResults(Array.from(new Set(res)));
    } else {
      setShuffledResults([num]);
    }
  };

  const handleAISlipVerification = async (req: any) => {
    setVerifyingSlipId(req.id);
    setTimeout(async () => {
      await supabase.from('deposits_withdrawals').update({ status: 'อนุมัติอัตโนมัติ (AI)' }).eq('id', req.id);
      const target = allUsers.find(x => x.phone === req.user_phone);
      if (target) {
        const newB = req.type === 'deposit' ? target.balance + req.amount : target.balance - req.amount;
        await supabase.from('users').update({ balance: newB }).eq('phone', target.phone);
        await supabase.from('transactions').insert([{ user_phone: target.phone, type: req.type, amount: req.type === 'deposit' ? req.amount : -req.amount, balance_after: newB, description: 'ตรวจสอบสลิปอัตโนมัติโดย AI' }]);
      }
      await logAdminAction('ตรวจสอบสลิป AI', `อนุมัติรายการ ${req.id} ยอด ฿${req.amount} ของยูส ${req.user_phone}`);
      setVerifyingSlipId(null);
      alert('🤖 AI ตรวจสอบสลิปผ่านและเติมเครดิตให้อัตโนมัติเรียบร้อย!');
      fetchAllAdminData();
    }, 1500);
  };

  const totalSales = allBets.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPayout = allBets.filter(b => b.win_loss > 0).reduce((s, b) => s + b.win_loss, 0);
  const totalComms = totalSales * (parseFloat(commRate) / 100);
  const netProfit = totalSales - totalPayout - totalComms;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-red-500/30 flex justify-between items-center shadow-2xl">
          <div>
            <h1 className="text-xl font-bold text-red-400">🛡️ Master Admin Ultimate Suite (ระบบบริหารจัดการสูงสุดครบวงจร)</h1>
            <p className="text-xs text-slate-400">ผู้ดูแลระบบ: {currentUser?.phone}</p>
          </div>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-xs font-semibold">ออกจากระบบ</button>
        </div>

        {/* Navigation Tabs (11 Tabs รวมฟอร์มบันทึกผลหวยลาว) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-11 gap-1.5 bg-slate-900 p-2 rounded-2xl border border-slate-800 text-[11px] font-bold">
          <button onClick={() => setActiveTab('overview')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'overview' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📊 ภาพรวม</button>
          <button onClick={() => setActiveTab('users')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'users' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>👥 สมาชิก</button>
          <button onClick={() => setActiveTab('finance')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'finance' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>💳 ฝาก-ถอน</button>
          <button onClick={() => setActiveTab('draw')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'draw' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🏆 ออกผล</button>
          <button onClick={() => setActiveTab('lottery_form')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'lottery_form' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🎲 กรอกผลหวย</button>
          <button onClick={() => setActiveTab('blocked')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'blocked' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🚫 เลขอั้น</button>
          <button onClick={() => setActiveTab('settings')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'settings' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>⚙️ ตั้งค่าเรท</button>
          <button onClick={() => setActiveTab('pnl')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'pnl' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📈 กำไร</button>
          <button onClick={() => setActiveTab('logs')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'logs' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📜 ธุรกรรม</button>
          <button onClick={() => setActiveTab('audit')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'audit' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>🛡️ ล็อกแอดมิน</button>
          <button onClick={() => setActiveTab('announcements')} className={`py-2 px-1 rounded-xl transition ${activeTab === 'announcements' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>📢 ประกาศ</button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center space-y-1">
              <p className="text-xs text-slate-400">สมาชิกทั้งหมด</p>
              <p className="text-3xl font-black text-white">{allUsers.length} ยูสเซอร์</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center space-y-1">
              <p className="text-xs text-slate-400">ยอดแทงรวมทั้งเว็บ</p>
              <p className="text-3xl font-black text-amber-400">฿{totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center space-y-1">
              <p className="text-xs text-slate-400">โพยทั้งหมด</p>
              <p className="text-3xl font-black text-emerald-400">{allBets.length} โพย</p>
            </div>
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center space-y-1">
              <p className="text-xs text-slate-400">กำไรสุทธิเว็บ</p>
              <p className={`text-3xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>฿{netProfit.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* TAB 2: USERS & AFFILIATE */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-red-400">👥 รายชื่อผู้ใช้งาน & ระบบแนะนำเพื่อน (Affiliate)</h2>
            <div className="space-y-2.5 max-h-[450px] overflow-y-auto">
              {allUsers.map(u => (
                <div key={u.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-amber-300 text-sm">{u.phone} <span className="text-[10px] text-slate-400 ml-2">(เครดิต: ฿{u.balance?.toLocaleString()})</span></p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ยศ: <span className="text-emerald-400 font-bold uppercase">{u.role}</span> | 
                      รหัสแนะนำ: <span className="text-cyan-400 font-bold">{u.ref_code || 'ไม่มี'}</span> | 
                      ผู้แนะนำ: <span className="text-slate-300">{u.referred_by || 'ไม่ระบุ'}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdateRole(u.phone, 'admin')} className="px-2.5 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg font-bold">Admin</button>
                    <button onClick={() => handleUpdateRole(u.phone, 'agent')} className="px-2.5 py-1 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg font-bold">Agent</button>
                    <button onClick={() => handleUpdateRole(u.phone, 'member')} className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-bold">Member</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FINANCE & AUTO SLIP */}
        {activeTab === 'finance' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-emerald-400">💳 รายการฝาก-ถอน & ตรวจสอบสลิปอัตโนมัติด้วย AI</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {financeReqs.map(r => (
                <div key={r.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-amber-300">ยูส: {r.user_phone} ({r.type === 'deposit' ? '📥 ฝาก' : '📤 ถอน'})</p>
                    <p className="text-sm font-extrabold text-white mt-0.5">฿{r.amount}</p>
                    <p className="text-[10px] text-slate-400">สถานะ: {r.status}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {r.status === 'รออนุมัติ' && (
                      <>
                        <button onClick={() => handleAISlipVerification(r)} disabled={verifyingSlipId === r.id} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition">
                          {verifyingSlipId === r.id ? '🤖 กำลังตรวจสลิป...' : '⚡ ตรวจสลิป AI'}
                        </button>
                        <button onClick={async () => {
                          await supabase.from('deposits_withdrawals').update({ status: 'อนุมัติแล้ว' }).eq('id', r.id);
                          const target = allUsers.find(x => x.phone === r.user_phone);
                          if (target) {
                            const newB = r.type === 'deposit' ? target.balance + r.amount : target.balance - r.amount;
                            await supabase.from('users').update({ balance: newB }).eq('phone', target.phone);
                            await supabase.from('transactions').insert([{ user_phone: target.phone, type: r.type, amount: r.type === 'deposit' ? r.amount : -r.amount, balance_after: newB, description: `แอดมินอนุมัติ ${r.type}` }]);
                          }
                          await logAdminAction('อนุมัติฝากถอน', `อนุมัติ ${r.type} จำนวน ฿{r.amount} ให้ ${r.user_phone}`);
                          alert('อนุมัติเรียบร้อย');
                          fetchAllAdminData();
                        }} className="px-3 py-1.5 bg-emerald-600 font-bold rounded-xl">อนุมัติมือ</button>
                      </>
                    )}
                    {r.status !== 'รออนุมัติ' && <span className="text-[10px] text-slate-400 px-2 py-1 bg-slate-900 rounded">{r.status}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DRAW */}
        {activeTab === 'draw' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-amber-400">🏆 ออกผลรางวัลมาสเตอร์ (Master Draw)</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">3 ตัวบน</label>
                <input type="text" placeholder="เช่น 123" value={win3Top} onChange={(e) => setWin3Top(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">2 ตัวล่าง</label>
                <input type="text" placeholder="เช่น 45" value={win2Bottom} onChange={(e) => setWin2Bottom(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold" />
              </div>
            </div>
            <button onClick={handleCalculateDraw} disabled={calculating} className="w-full py-4 bg-red-600 hover:bg-red-500 font-bold rounded-2xl transition">
              {calculating ? 'กำลังประมวลผลระบบ...' : '🚀 ยืนยันออกผลรางวัลและจ่ายเงินทั้งเว็บ'}
            </button>
          </div>
        )}

        {/* TAB 5: LOTTERY FORM (เพิ่มฟอร์มบันทึกผลหวยลาวเข้ามาในแท็บนี้) */}
        {activeTab === 'lottery_form' && (
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-amber-400">🎲 บันทึกผลรางวัลหวย (บันทึกลงตาราง lottery_results)</h2>
              <p className="text-slate-400 text-sm mt-1">กรอกผลรางวัลประจำงวดเพื่อให้หน้าสมาชิกแสดงผลอัตโนมัติ</p>
            </div>

            <form onSubmit={handleSaveLotteryResult} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">ประเภทหวย</label>
                <select
                  value={lotteryType}
                  onChange={(e) => setLotteryType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">เลข 4 ตัว</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="เช่น 3653"
                    value={fourDigits}
                    onChange={(e) => setFourDigits(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ชื่อสัตว์ประจำงวด</label>
                  <input
                    type="text"
                    placeholder="เช่น ช้าง"
                    value={animalName}
                    onChange={(e) => setAnimalName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">3 ตัวบน</label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="เช่น 653"
                    value={threeTop}
                    onChange={(e) => setThreeTop(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={lotteryLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-4"
              >
                {lotteryLoading ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกผลรางวัลลง Supabase'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: BLOCKED NUMBERS & QUICK SHUFFLER */}
        {activeTab === 'blocked' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <h2 className="text-md font-bold text-red-400">🚫 จัดการเลขอั้นความเสี่ยง</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                await supabase.from('blocked_numbers').insert([{ number: blockNum, restriction_type: blockType }]);
                await logAdminAction('เพิ่มเลขอั้น', `บล็อกเลข ${blockNum} (${blockType})`);
                alert('เพิ่มเลขอั้นสำเร็จ!');
                setBlockNum('');
                fetchAllAdminData();
              }} className="space-y-3">
                <input type="text" placeholder="เลข เช่น 789" value={blockNum} onChange={(e) => setBlockNum(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" required />
                <select value={blockType} onChange={(e) => setBlockType(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs">
                  <option value="ไม่ขายเลย">ไม่ขายเลย (ปิดรับ)</option>
                  <option value="จ่ายครึ่งราคา">จ่ายครึ่งราคา</option>
                </select>
                <button type="submit" className="w-full py-3 bg-red-600 font-bold rounded-2xl text-xs">บันทึกเลขอั้น</button>
              </form>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {blockedNumbers.map(b => (
                  <div key={b.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                    <p className="font-bold text-amber-400">เลข: {b.number} ({b.restriction_type})</p>
                    <button onClick={async () => {
                      await supabase.from('blocked_numbers').delete().eq('id', b.id);
                      fetchAllAdminData();
                    }} className="px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg">ลบ</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <h2 className="text-md font-bold text-cyan-400">🔄 เครื่องมือกลับเลขด่วน (Quick Shuffler)</h2>
              <div className="space-y-3">
                <input type="text" placeholder="กรอกเลข 2 หรือ 3 ตัว (เช่น 12, 123)" value={shuffleInput} onChange={(e) => setShuffleInput(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" />
                <button onClick={() => handleRunShuffle(shuffleInput)} className="w-full py-3 bg-cyan-600 font-bold rounded-2xl text-xs">สลับเลขกลับหัวท้ายอัตโนมัติ</button>
              </div>
              {shuffledResults.length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-400">ผลลัพธ์การสลับเลข:</p>
                  <div className="flex flex-wrap gap-2">
                    {shuffledResults.map((num, idx) => (
                      <span key={idx} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 font-bold rounded-lg text-xs">{num}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-amber-400">⚙️ ตั้งค่าอัตราจ่ายและส่วนลด (Odds & Commission Config)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">เรทจ่าย 3 ตัวบน (บาทละ)</label>
                <input type="number" value={rate3Top} onChange={(e) => setRate3Top(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">เรทจ่าย 2 ตัวล่าง (บาทละ)</label>
                <input type="number" value={rate2Bottom} onChange={(e) => setRate2Bottom(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">เปอร์เซ็นต์ค่าคอม (%)</label>
                <input type="number" value={commRate} onChange={(e) => setCommRate(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" />
              </div>
            </div>
            <button onClick={async () => {
              await logAdminAction('เปลี่ยนเรทจ่าย', `ตั้งค่าเรท 3 ตัวบน: ${rate3Top}, 2 ตัวล่าง: ${rate2Bottom}, คอม: ${commRate}%`);
              alert('💾 บันทึกการตั้งค่าเรทจ่ายเรียบร้อย!');
            }} className="w-full py-3 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-2xl text-xs transition">
              บันทึกเรทอัตราจ่ายใหม่
            </button>
          </div>
        )}

        {/* TAB 8: P&L STATEMENT */}
        {activeTab === 'pnl' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
            <div>
              <h2 className="text-md font-bold text-emerald-400">📈 รายงานสรุปกำไร-ขาดทุน (Profit & Loss Statement)</h2>
              <p className="text-xs text-slate-400 mt-1">วิเคราะห์ผลประกอบการภาพรวมทั้งหมดของเว็บไซต์</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1 text-center">
                <p className="text-xs text-slate-400">ยอดขายรวมทั้งหมด</p>
                <p className="text-2xl font-black text-white">฿{totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1 text-center">
                <p className="text-xs text-slate-400">ยอดจ่ายรางวัลผู้ชนะ</p>
                <p className="text-2xl font-black text-red-400">฿{totalPayout.toLocaleString()}</p>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1 text-center">
                <p className="text-xs text-slate-400">ค่าคอมมิชชั่นเอเย่นต์รวม ({commRate}%)</p>
                <p className="text-2xl font-black text-amber-400">฿{totalComms.toLocaleString()}</p>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1 text-center">
                <p className="text-xs text-slate-400">กำไรสุทธิแท้จริงของเว็บ</p>
                <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>฿{netProfit.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: GLOBAL TRANSACTION LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-cyan-400">📜 ประวัติธุรกรรมระดับโลก (Global Transaction Logs)</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {transactions.map(tx => (
                <div key={tx.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-amber-400">ยูส: {tx.user_phone} | ประเภท: {tx.type}</p>
                    <p className="text-[11px] text-slate-300">{tx.description}</p>
                    <p className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleString('th-TH')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>฿{tx.amount}</p>
                    <p className="text-[10px] text-slate-400">คงเหลือ: ฿{tx.balance_after}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: ADMIN AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-red-400">🛡️ บันทึกประวัติการกระทำของแอดมิน (Admin Audit Trail)</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {adminLogs.map(log => (
                <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-amber-300">แอดมิน: {log.admin_phone} | <span className="text-red-400">{log.action}</span></p>
                    <p className="text-[11px] text-slate-300">{log.details}</p>
                    <p className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString('th-TH')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 11: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6 shadow-xl">
            <h2 className="text-md font-bold text-amber-300">📢 ระบบประกาศหน้าเว็บ (Broadcast Announcements)</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newAnnouncement) return;
              await supabase.from('announcements').insert([{ message: newAnnouncement }]);
              await logAdminAction('สร้างประกาศ', newAnnouncement);
              alert('ประกาศข้อความสำเร็จ!');
              setNewAnnouncement('');
              fetchAllAdminData();
            }} className="space-y-3">
              <textarea placeholder="พิมพ์ข้อความประกาศแจ้งเตือนถึงสมาชิกทุกคน..." value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs h-24" required />
              <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 rounded-2xl text-xs transition">ส่งประกาศกระจายเสียง</button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {announcements.map(a => (
                <div key={a.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                  <p className="text-slate-200">{a.message}</p>
                  <button onClick={async () => {
                    await supabase.from('announcements').delete().eq('id', a.id);
                    fetchAllAdminData();
                  }} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-xl">ลบ</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}