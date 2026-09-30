'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AgentDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allBets, setAllBets] = useState<any[]>([]);
  const [blockedNumbers, setBlockedNumbers] = useState<any[]>([]);
  const [financeReqs, setFinanceReqs] = useState<any[]>([]);
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [balance, setBalance] = useState('');

  const [blockNum, setBlockNum] = useState('');
  const [blockType, setBlockType] = useState('ไม่ขายเลย');

  const [win3Top, setWin3Top] = useState('');
  const [win2Bottom, setWin2Bottom] = useState('');
  const [calculating, setCalculating] = useState(false);

  // แท็บการทำงานทั้งหมด
  const [activeTab, setActiveTab] = useState<'members' | 'finance' | 'monthly' | 'settlement' | 'risk' | 'draw' | 'blocked'>('monthly');
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'agent' && user.role !== 'admin') {
      router.push('/members');
      return;
    }
    setCurrentUser(user);
    fetchAllData(user);
  }, []);

  const fetchAllData = async (user: any) => {
    let query = supabase.from('users').select('*').order('created_at', { ascending: false });
    if (user.role === 'agent') query = query.eq('created_by', user.phone);
    const { data: mData } = await query;
    if (mData) {
      setMembers(mData);
      const phones = mData.map((m: any) => m.phone);
      if (phones.length > 0) {
        const { data: bData } = await supabase.from('bets').select('*').in('user_phone', phones).order('created_at', { ascending: false });
        if (bData) setAllBets(bData);
      }
    }

    const { data: blocks } = await supabase.from('blocked_numbers').select('*');
    if (blocks) setBlockedNumbers(blocks);

    const { data: reqs } = await supabase.from('deposits_withdrawals').select('*').order('created_at', { ascending: false });
    if (reqs) setFinanceReqs(reqs);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('users').insert([{ phone, password, balance: parseFloat(balance) || 0, role: 'member', created_by: currentUser.phone, status: 'active' }]);
    alert('🎉 เปิดบัญชีสมาชิกสำเร็จ!');
    setPhone(''); setPassword(''); setBalance('');
    fetchAllData(currentUser);
  };

  const handleApproveFinance = async (req: any, status: string) => {
    const targetMember = members.find((m) => m.phone === req.user_phone);
    if (!targetMember && status === 'อนุมัติแล้ว') return alert('ไม่พบสมาชิกนี้ในสายงาน');

    if (status === 'อนุมัติแล้ว') {
      let newBal = targetMember.balance || 0;
      if (req.type === 'deposit') newBal += req.amount;
      else {
        if (newBal < req.amount) return alert('ยอดเงินสมาชิกไม่พอถอน');
        newBal -= req.amount;
      }

      await supabase.from('users').update({ balance: newBal }).eq('phone', req.user_phone);
      await supabase.from('transactions').insert([
        { user_phone: req.user_phone, type: req.type, amount: req.type === 'deposit' ? req.amount : -req.amount, balance_after: newBal, description: `แอดมินอนุมัติ ${req.type === 'deposit' ? 'ฝากเงิน' : 'ถอนเงิน'}` }
      ]);
    }

    await supabase.from('deposits_withdrawals').update({ status }).eq('id', req.id);
    alert(`ทำรายการสำเร็จ: ${status}`);
    fetchAllData(currentUser);
  };

  const handleCalculateDraw = async () => {
    if (!win3Top && !win2Bottom) return alert('กรุณากรอกผลรางวัล');
    if (!confirm('ยืนยันออกผลรางวัลและจ่ายเงินอัตโนมัติ?')) return;

    setCalculating(true);
    for (const bet of allBets) {
      if (bet.status !== 'รอออกผล') continue;
      let isWinner = false;
      let multiplier = 0;

      if (bet.bet_type === '3ตัวบน' && bet.number === win3Top) { isWinner = true; multiplier = 900; }
      else if (bet.bet_type === '2ตัวล่าง' && bet.number === win2Bottom) { isWinner = true; multiplier = 90; }

      if (isWinner) {
        const winAmount = (bet.net_amount || bet.amount) * multiplier;
        await supabase.from('bets').update({ status: `ถูกรางวัล (+฿${winAmount})`, win_loss: winAmount }).eq('id', bet.id);
        const m = members.find(x => x.phone === bet.user_phone);
        if (m) {
          const newBal = (m.balance || 0) + winAmount;
          await supabase.from('users').update({ balance: newBal }).eq('phone', m.phone);
          await supabase.from('transactions').insert([{ user_phone: m.phone, type: 'win', amount: winAmount, balance_after: newBal, description: `ถูกรางวัลหวย ${bet.bet_type}` }]);
        }
      } else {
        await supabase.from('bets').update({ status: 'ไม่ถูกรางวัล', win_loss: -bet.amount }).eq('id', bet.id);
      }
    }
    setCalculating(false);
    alert('🎯 ออกผลและคำนวณเงินเสร็จสิ้น!');
    fetchAllData(currentUser);
  };

  // กรองเฉพาะข้อมูลของเดือนปัจจุบัน
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyBets = allBets.filter(b => b.created_at?.startsWith(currentMonthStr));
  const monthlySales = monthlyBets.reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyDiscount = monthlyBets.reduce((s, b) => s + (b.discount || 0), 0);
  const monthlyNetSales = monthlySales - monthlyDiscount;
  const monthlyCommission = monthlySales * 0.05; // ค่าคอมเอเย่นต์ 5%

  // คำนวณยอดตัดส่งเจ้ามือใหญ่ (สมมติส่วนแบ่งเจ้ามือใหญ่ 80%, เอเย่นต์เก็บไว้ 20% หรือเคลียร์สุทธิ)
  const uplineShare = monthlyNetSales * 0.80;
  const agentProfitShare = monthlyNetSales * 0.20;

  // จัดกลุ่มวิเคราะห์ความเสี่ยงเลขอั้น (Risk Exposure Radar)
  const riskMap: { [key: string]: { totalAmount: number; count: number; types: string[] } } = {};
  allBets.filter(b => b.status === 'รอออกผล').forEach(b => {
    if (!riskMap[b.number]) {
      riskMap[b.number] = { totalAmount: 0, count: 0, types: [] };
    }
    riskMap[b.number].totalAmount += b.amount;
    riskMap[b.number].count += 1;
    if (!riskMap[b.number].types.includes(b.bet_type)) {
      riskMap[b.number].types.push(b.bet_type);
    }
  });
  const sortedRisks = Object.entries(riskMap).sort((a, b) => b[1].totalAmount - a[1].totalAmount);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex justify-between items-center shadow-2xl">
          <div>
            <h1 className="text-xl font-bold text-amber-400">💼 แดชบอร์ดเอเย่นต์ & เจ้ามือ (Agent Pro Suite)</h1>
            <p className="text-xs text-slate-400">ผู้ใช้งาน: {currentUser?.phone}</p>
          </div>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl text-xs font-semibold">ออกจากระบบ</button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          <button onClick={() => setActiveTab('monthly')} className={`py-2.5 rounded-xl transition ${activeTab === 'monthly' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>📅 สรุปรายได้รายเดือน</button>
          <button onClick={() => setActiveTab('settlement')} className={`py-2.5 rounded-xl transition ${activeTab === 'settlement' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>💸 ตัดยอดส่งเจ้ามือ</button>
          <button onClick={() => setActiveTab('risk')} className={`py-2.5 rounded-xl transition ${activeTab === 'risk' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>🚨 เรดาร์ความเสี่ยง</button>
          <button onClick={() => setActiveTab('members')} className={`py-2.5 rounded-xl transition ${activeTab === 'members' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>👥 สมาชิก & ค่าคอม</button>
          <button onClick={() => setActiveTab('finance')} className={`py-2.5 rounded-xl transition ${activeTab === 'finance' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>💳 อนุมัติฝาก-ถอน</button>
          <button onClick={() => setActiveTab('draw')} className={`py-2.5 rounded-xl transition ${activeTab === 'draw' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>🏆 ออกผลรางวัล</button>
          <button onClick={() => setActiveTab('blocked')} className={`py-2.5 rounded-xl transition ${activeTab === 'blocked' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}>🚫 จัดการเลขอั้น</button>
        </div>

        {/* TAB 1: สรุปรายได้รายเดือน */}
        {activeTab === 'monthly' && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-md font-bold text-amber-300">📅 รายงานสรุปยอดประจำเดือน ({currentMonthStr})</h2>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs">อัปเดตแบบเรียลไทม์</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">ยอดแทงรวมทั้งเดือน</p>
                  <p className="text-lg font-extrabold text-white mt-1">฿{monthlySales.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">ส่วนลดรวมสมาชิก (5%)</p>
                  <p className="text-lg font-extrabold text-amber-400 mt-1">฿{monthlyDiscount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">ยอดขายสุทธิ</p>
                  <p className="text-lg font-extrabold text-emerald-400 mt-1">฿{monthlyNetSales.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                  <p className="text-xs text-slate-400">ค่าคอมมิชชั่นเอเย่นต์รวม</p>
                  <p className="text-lg font-extrabold text-cyan-400 mt-1">฿{monthlyCommission.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200">📜 รายการโพยเดือนนี้ ({monthlyBets.length} รายการ)</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {monthlyBets.map(b => (
                  <div key={b.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-amber-400">ยูส: {b.user_phone} | {b.bet_type} : <span className="text-white">{b.number}</span></p>
                      <p className="text-[10px] text-slate-500">{new Date(b.created_at).toLocaleString('th-TH')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-400">฿{b.amount}</p>
                      <span className="text-[10px] text-slate-400">{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ตัดยอดส่งเจ้ามือใหญ่ */}
        {activeTab === 'settlement' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-amber-400">💸 ระบบตัดยอดส่งเจ้ามือใหญ่ / เคลียร์บัญชี (Upline Net Settlement)</h2>
              <p className="text-xs text-slate-400 mt-1">คำนวณส่วนแบ่งยอดขายสุทธิที่ต้องส่งเจ้ามือใหญ่ (Upline) และส่วนแบ่งกำไรที่เอเย่นต์ได้รับ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-xs text-slate-400">ยอดขายสุทธิรวม</p>
                <p className="text-2xl font-extrabold text-white">฿{monthlyNetSales.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">ยอดซื้อหักส่วนลดสมาชิกแล้ว</p>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-xs text-slate-400">ยอดต้องตัดส่งเจ้ามือใหญ่ (80%)</p>
                <p className="text-2xl font-extrabold text-red-400">฿{uplineShare.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">ยอดส่งเครียร์กับ Upline</p>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-xs text-slate-400">กำไรสุทธิเอเย่นต์ (20% สเปรด)</p>
                <p className="text-2xl font-extrabold text-emerald-400">฿{agentProfitShare.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">รายได้เข้ากระเป๋าเอเย่นต์</p>
              </div>
            </div>

            <button onClick={() => alert('📤 บันทึกส่งยอดเคลียร์กับเจ้ามือใหญ่เรียบร้อย!')} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl shadow-lg transition">
              📤 ยืนยันทำเรื่องตัดยอดส่งเจ้ามือใหญ่ประจำงวดนี้
            </button>
          </div>
        )}

        {/* TAB 3: เรดาร์ความเสี่ยงเลขอั้น */}
        {activeTab === 'risk' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div>
              <h2 className="text-md font-bold text-red-400">🚨 เรดาร์วิเคราะห์ความเสี่ยงเลขอั้น (Top Bet Exposure)</h2>
              <p className="text-xs text-slate-400 mt-1">แสดงตัวเลขที่มีการเดิมพันสูงสุดในระบบ เพื่อช่วยให้คุณตัดสินใจ "อั้น" หรือ "ลดราคาจ่าย" ได้ทันท่วงที</p>
            </div>
            <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {sortedRisks.length === 0 ? (
                <p className="text-center py-10 text-slate-500 text-sm">ยังไม่มีข้อมูลโพยในระบบ</p>
              ) : (
                sortedRisks.map(([num, info], index) => (
                  <div key={num} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs ${index === 0 ? 'bg-red-500 text-white' : index === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                        #{index + 1}
                      </span>
                      <div>
                        <p className="text-lg font-black text-amber-400 tracking-wider">{num}</p>
                        <p className="text-[11px] text-slate-400">ประเภท: {info.types.join(', ')} ({info.count} โพย)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-emerald-400 text-sm">ยอดรวม ฿{info.totalAmount.toLocaleString()}</p>
                      {info.totalAmount > 1000 && (
                        <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full font-semibold">🔥 เสี่ยงสูง</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: สมาชิก & ค่าคอมแต่ละคน */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateMember} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
              <h2 className="text-md font-bold text-amber-300">➕ เปิดบัญชีสมาชิกใหม่</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input type="text" placeholder="เบอร์โทร / ยูสเซอร์" value={phone} onChange={(e) => setPhone(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" required />
                <input type="password" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" required />
                <input type="number" placeholder="เครดิตเริ่มต้น" value={balance} onChange={(e) => setBalance(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" required />
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-2xl text-xs transition">ยืนยันเปิดบัญชี</button>
            </form>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <h3 className="font-bold text-sm text-slate-200">👥 รายชื่อสมาชิกในสายงาน & ค่าคอมมิชชั่นรายคน</h3>
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {members.map(m => {
                  const mBets = allBets.filter(b => b.user_phone === m.phone);
                  const mTotalSales = mBets.reduce((s, b) => s + (b.amount || 0), 0);
                  const mCommission = mTotalSales * 0.05; // คอม 5% จากยอดแทงสมาชิกคนนี้
                  return (
                    <div key={m.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-amber-400 text-sm">{m.phone} <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded ml-2">เครดิต: ฿{m.balance?.toLocaleString()}</span></p>
                        <p className="text-[11px] text-slate-400 mt-1">ยอดแทงรวม: ฿{mTotalSales.toLocaleString()} | สร้างคอมให้คุณ: <span className="text-cyan-400 font-bold">฿{mCommission.toLocaleString()}</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-bold">ปกติ</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: อนุมัติฝาก-ถอน */}
        {activeTab === 'finance' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-emerald-400">💳 คิวคำขอฝาก-ถอนเงิน</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {financeReqs.map(r => (
                <div key={r.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-amber-300">ยูส: {r.user_phone} ({r.type === 'deposit' ? '📥 ฝาก' : '📤 ถอน'})</p>
                    <p className="text-sm font-extrabold text-white mt-0.5">฿{r.amount}</p>
                    <p className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleString('th-TH')}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] px-2 py-1 bg-slate-900 text-amber-400 rounded">{r.status}</span>
                    {r.status === 'รออนุมัติ' && (
                      <>
                        <button onClick={() => handleApproveFinance(r, 'อนุมัติแล้ว')} className="px-3 py-1.5 bg-emerald-600 font-bold rounded-xl">อนุมัติ</button>
                        <button onClick={() => handleApproveFinance(r, 'ปฏิเสธ')} className="px-3 py-1.5 bg-red-600 font-bold rounded-xl">ปฏิเสธ</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: ออกผลรางวัล */}
        {activeTab === 'draw' && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-amber-400">🏆 ออกผลรางวัลอัตโนมัติ</h2>
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
            <button onClick={handleCalculateDraw} disabled={calculating} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-2xl transition">
              {calculating ? 'กำลังประมวลผล...' : '🚀 ออกผลและคำนวณเครดิตจ่ายผู้ชนะทันที'}
            </button>
          </div>
        )}

        {/* TAB 7: เลขอั้น */}
        {activeTab === 'blocked' && (
          <form onSubmit={async (e) => { e.preventDefault(); await supabase.from('blocked_numbers').insert([{ number: blockNum, restriction_type: blockType }]); alert('บันทึกเลขอั้นแล้ว'); setBlockNum(''); fetchAllData(currentUser); }} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-md font-bold text-red-400">🚫 จัดการเลขอั้นความเสี่ยง</h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="เลข เช่น 789" value={blockNum} onChange={(e) => setBlockNum(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs" required />
              <select value={blockType} onChange={(e) => setBlockType(e.target.value)} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs">
                <option value="ไม่ขายเลย">ไม่ขายเลย</option>
                <option value="จ่ายครึ่งราคา">จ่ายครึ่งราคา</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-500 font-bold rounded-2xl text-xs transition">บันทึกเลขอั้น</button>
          </form>
        )}

      </div>
    </div>
  );
}