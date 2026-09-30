'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(2500);
  const [activeTab, setActiveTab] = useState<'bet' | 'wallet' | 'history'>('bet');

  // แทงหวย State
  const [betType, setBetType] = useState<'3top' | '2bottom'>('3top');
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [myBets, setMyBets] = useState([
    { id: 1, type: '3 ตัวตรง', number: '789', amount: 100, status: 'รอออกผล', time: '10:30 น.' },
    { id: 2, type: '2 ตัวล่าง', number: '45', amount: 200, status: 'ถูกรางวัล 🏆', time: 'เมื่อวาน' },
  ]);

  // ฝาก-ถอน State
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');

  const handleBet = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!number || !numAmt) return alert('กรุณากรอกเลขและจำนวนเงินให้ครบถ้วน');
    if (numAmt > balance) return alert('ยอดเงินคงเหลือไม่พอแทง');

    setBalance(prev => prev - numAmt);
    setMyBets([
      { 
        id: Date.now(), 
        type: betType === '3top' ? '3 ตัวตรง' : '2 ตัวล่าง', 
        number, 
        amount: numAmt, 
        status: 'รอออกผล', 
        time: 'เพิ่งนี้' 
      },
      ...myBets
    ]);
    alert('ส่งโพยหวยสำเร็จ!');
    setNumber('');
    setAmount('');
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount) return alert('กรุณากรอกจำนวนเงินฝาก');
    alert(`แจ้งฝากเงิน ฿${Number(depositAmount).toLocaleString()} สำเร็จ! กรุณารอแอดมินตรวจสอบสลีปสักครู่`);
    setDepositAmount('');
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const wAmt = Number(withdrawAmount);
    if (!wAmt || !withdrawBank) return alert('กรุณากรอกข้อมูลการถอนให้ครบถ้วน');
    if (wAmt > balance) return alert('ยอดเงินคงเหลือไม่พอถอน');

    setBalance(prev => prev - wAmt);
    alert('ส่งคำขอถอนเงินเรียบร้อยแล้ว');
    setWithdrawAmount('');
    setWithdrawBank('');
  };

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* Header ยอดเงิน & ปุ่ม Logout */}
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl flex justify-between items-center shadow-xl">
          <div>
            <p className="text-xs text-slate-400">ยินดีต้อนรับสมาชิก (081-234-5678)</p>
            <h2 className="text-2xl font-black text-amber-400">฿ {balance.toLocaleString()}</h2>
          </div>
          <button 
            onClick={handleLogout} 
            className="bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/20 px-3 py-2 rounded-xl text-xs font-bold transition"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button onClick={() => setActiveTab('bet')} className={`py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'bet' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>🎲 แทงหวย</button>
          <button onClick={() => setActiveTab('wallet')} className={`py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'wallet' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>💳 ฝาก-ถอน</button>
          <button onClick={() => setActiveTab('history')} className={`py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'history' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>📜 โพยของฉัน</button>
        </div>

        {/* Tab 1: แทงหวย */}
        {activeTab === 'bet' && (
          <form onSubmit={handleBet} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h3 className="font-bold text-amber-400">📝 แทงหวยลาว</h3>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setBetType('3top')} className={`py-2 rounded-xl text-xs font-bold border ${betType === '3top' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>3 ตัวตรง</button>
              <button type="button" onClick={() => setBetType('2bottom')} className={`py-2 rounded-xl text-xs font-bold border ${betType === '2bottom' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>2 ตัวล่าง</button>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">ระบุตัวเลข ({betType === '3top' ? '3 หลัก' : '2 หลัก'})</label>
              <input type="text" maxLength={betType === '3top' ? 3 : 2} value={number} onChange={e => setNumber(e.target.value)} placeholder={betType === '3top' ? 'เช่น 789' : 'เช่น 45'} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-amber-400 text-lg font-bold focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">จำนวนเงินเดิมพัน (บาท)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-bold focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg transition">ยืนยันการส่งโพย</button>
          </form>
        )}

        {/* Tab 2: ฝาก-ถอน */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* ฝากเงิน */}
            <form onSubmit={handleDeposit} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <h3 className="font-bold text-emerald-400">💵 แจ้งฝากเงิน (อัปโหลดสลีป)</h3>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <p>ธนาคาร: <span className="text-white font-bold">กสิกรไทย 123-4-56789-0</span></p>
                <p>ชื่อบัญชี: <span className="text-white font-bold">บริษัท หวยออนไลน์ จำกัด</span></p>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">จำนวนเงินที่โอน</label>
                <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-bold focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">แนบหลักฐานสลีปโอนเงิน</label>
                <input type="file" accept="image/*" className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl transition">ยืนยันแจ้งฝากเงิน</button>
            </form>

            {/* ถอนเงิน */}
            <form onSubmit={handleWithdraw} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <h3 className="font-bold text-rose-400">🏧 แจ้งถอนเงิน</h3>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ธนาคารและเลขบัญชีรับเงินของคุณ</label>
                <input type="text" value={withdrawBank} onChange={e => setWithdrawBank(e.target.value)} placeholder="เช่น กสิกรไทย 987-x-xxxxx" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-bold focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">จำนวนเงินที่ต้องการถอน</label>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 font-bold focus:outline-none" />
              </div>
              <button type="submit" className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-3 rounded-xl transition">ยืนยันแจ้งถอนเงิน</button>
            </form>
          </div>
        )}

        {/* Tab 3: โพยของฉัน */}
        {activeTab === 'history' && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h3 className="font-bold text-slate-200">📜 ประวัติโพยหวยของคุณ</h3>
            <div className="space-y-3">
              {myBets.map(bet => (
                <div key={bet.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-0.5 rounded border border-amber-500/20">{bet.type}</span>
                      <span className="font-black text-lg text-slate-100">{bet.number}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">เดิมพัน: ฿{bet.amount} • {bet.time}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${bet.status.includes('ถูก') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                    {bet.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}