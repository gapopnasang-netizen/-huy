'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function MemberDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'bet' | 'wallet' | 'checkin' | 'affiliate' | 'copybet' | 'ocr'>('bet');
const [latestResults, setLatestResults] = useState<any[]>([]);
  // State
  const [balance, setBalance] = useState(1250);
  const [checkedIn, setCheckedIn] = useState(false);
  const [betType, setBetType] = useState('3 ตัวบน');
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  
  // OCR States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: string; number: string; amount: number } | null>(null);

  const [myBets, setMyBets] = useState([
    { id: 1, type: '3 ตัวบน', number: '345', amount: 100, status: 'รอผล' },
    { id: 2, type: '2 ตัวล่าง', number: '89', amount: 50, status: 'รอผล' },
  ]);

  // ฟังก์ชันแทงหวย
  const handlePlaceBet = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(betAmount);
    if (!betNumber || !amountNum || amountNum <= 0) {
      alert('กรุณากรอกเลขและจำนวนเงินให้ถูกต้อง');
      return;
    }
    if (balance < amountNum) {
      alert('ยอดเงินคงเหลือไม่พอ กรุณาเติมเงิน!');
      return;
    }

    setBalance(prev => prev - amountNum);
    const newBet = {
      id: Date.now(),
      type: betType,
      number: betNumber,
      amount: amountNum,
      status: 'รอผล',
    };
    setMyBets([newBet, ...myBets]);
    setBetNumber('');
    setBetAmount('');
    alert(`แทงหวยสำเร็จ! เลข ${betNumber} (${betType}) จำนวน ${amountNum} บาท`);
  };

  const handleCheckIn = () => {
    if (checkedIn) return;
    setCheckedIn(true);
    setBalance(prev => prev + 50);
    alert('เช็คอินสำเร็จ! รับเครดิตฟรี 50 บาทเรียบร้อยแล้ว');
  };

  const handleCopyBetToForm = (number: string, type: string) => {
    setBetNumber(number);
    setBetType(type);
    setActiveTab('bet');
    alert(`ดึงเลข ${number} ลงแบบฟอร์มแทงหวยเรียบร้อยแล้ว!`);
  };

  // จัดการอัปโหลดรูปเพื่อสแกน OCR
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      setScanResult(null);
    }
  };

  const handleStartOCRScan = () => {
    if (!selectedImage) return;
    setIsScanning(true);
    setScanResult(null);

    // จำลองการทำงาน AI อ่านลายมือ (Handwriting Recognition Simulation)
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        type: '3 ตัวบน',
        number: '789',
        amount: 200,
      });
      alert('🤖 AI สแกนลายมือสำเร็จ! ตรวจพบโพยเลข 789 (3 ตัวบน) 200 บาท');
    }, 2000);
  };

  const handleUseScannedData = () => {
    if (!scanResult) return;
    setBetType(scanResult.type);
    setBetNumber(scanResult.number);
    setBetAmount(scanResult.amount.toString());
    setActiveTab('bet');
    alert('นำข้อมูลจากภาพเข้าสู่ฟอร์มแทงหวยเรียบร้อย!');
  };

  const totalBetAmount = myBets.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Profile & Wallet */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-amber-400">ยินดีต้อนรับ, สมาชิก</h1>
            <p className="text-slate-400 text-sm">ระบบแทงหวยและสแกนโพยอัจฉริยะด้วย AI</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs">ยอดเงินคงเหลือ</p>
            <p className="text-2xl font-black text-emerald-400">฿{balance.toLocaleString()}</p>
          </div>
          <button 
            onClick={() => { localStorage.clear(); router.push('/login'); }}
            className="bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* Navigation Tabs (6 แท็บ รวมสแกนโพย AI) */}
        <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
          <button 
            onClick={() => setActiveTab('bet')}
            className={`py-2.5 rounded-xl font-semibold text-sm transition ${activeTab === 'bet' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            🎰 แทงหวย
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={`py-2.5 rounded-xl font-semibold text-sm transition ${activeTab === 'wallet' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            💰 กระเป๋าเงิน
          </button>
          <button 
            onClick={() => setActiveTab('checkin')}
            className={`py-2.5 rounded-xl font-semibold text-sm transition ${activeTab === 'checkin' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            🎁 เช็คอิน
          </button>
          <button 
            onClick={() => setActiveTab('affiliate')}
            className={`py-2.5 rounded-xl font-semibold text-sm transition ${activeTab === 'affiliate' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            🔗 แนะนำเพื่อน
          </button>
          <button 
            onClick={() => setActiveTab('copybet')}
            className={`py-2.5 rounded-xl font-semibold text-sm transition ${activeTab === 'copybet' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            📋 ตลาดโพย
          </button>
          <button 
            onClick={() => setActiveTab('ocr')}
            className={`py-2.5 rounded-xl font-semibold text-sm transition col-span-2 md:col-span-1 ${activeTab === 'ocr' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            📸 สแกนโพย AI
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 min-h-[350px]">
          
          {/* 1. หน้าแทงหวย */}
          {activeTab === 'bet' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-amber-400">📝 ส่งโพยแทงหวย</h2>
              <form onSubmit={handlePlaceBet} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ประเภทหวย</label>
                  <select 
                    value={betType} 
                    onChange={(e) => setBetType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                  >
                    <option value="3 ตัวบน">3 ตัวบน</option>
                    <option value="3 ตัวโต๊ด">3 ตัวโต๊ด</option>
                    <option value="2 ตัวบน">2 ตัวบน</option>
                    <option value="2 ตัวล่าง">2 ตัวล่าง</option>
                    <option value="วิ่งบน">วิ่งบน</option>
                    <option value="วิ่งล่าง">วิ่งล่าง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">ระบุตัวเลข</label>
                  <input 
                    type="text" 
                    placeholder="เช่น 345 หรือ 89" 
                    value={betNumber}
                    onChange={(e) => setBetNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">จำนวนเงิน (บาท)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-amber-500/20"
                >
                  ยืนยันการแทงหวย
                </button>
              </form>
            </div>
          )}

          {/* 2. กระเป๋าเงิน & สถิติ */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-amber-400">สถิติและประวัติการเดิมพัน</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-slate-400 text-xs">ยอดแทงรวมงวดนี้</p>
                  <p className="text-xl font-bold text-slate-100">฿{totalBetAmount}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-slate-400 text-xs">สถานะกระเป๋า</p>
                  <p className="text-xl font-bold text-emerald-400">ปกติ</p>
                </div>
              </div>
              <h3 className="text-md font-semibold text-slate-300 mt-6">โพยล่าสุดของคุณ</h3>
              <div className="space-y-2">
                {myBets.map(bet => (
                  <div key={bet.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl">
                    <span>[{bet.type}] เลข: <strong className="text-amber-400">{bet.number}</strong> (฿{bet.amount})</span>
                    <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-full">{bet.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. เช็คอินรายวัน */}
          {activeTab === 'checkin' && (
            <div className="text-center space-y-6 py-8">
              <h2 className="text-xl font-bold text-amber-400">🎁 รับเครดิตฟรีประจำวัน</h2>
              <p className="text-slate-400 text-sm">กดเช็คอินวันนี้เพื่อรับเครดิตฟรี 50 บาท ไปลุ้นโชคกันเลย!</p>
              <button 
                onClick={handleCheckIn}
                disabled={checkedIn}
                className={`px-8 py-3 rounded-2xl font-bold text-lg transition ${checkedIn ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20'}`}
              >
                {checkedIn ? '✅ เช็คอินวันนี้เรียบร้อยแล้ว' : '🚀 กดรับเครดิตฟรี 50 บาท'}
              </button>
            </div>
          )}

          {/* 4. แนะนำเพื่อน */}
          {activeTab === 'affiliate' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-amber-400">🔗 ระบบแนะนำเพื่อน (Affiliate)</h2>
              <p className="text-slate-400 text-sm">คัดลอกลิงก์ด้านล่างนี้ไปแชร์ให้เพื่อนสมัคร เพื่อรับส่วนแบ่งค่าคอมมิชชันทันที!</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value="https://yourlotto.com/ref/member123" 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none"
                />
                <button 
                  onClick={() => alert('คัดลอกลิงก์สำเร็จ!')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-xl transition whitespace-nowrap"
                >
                  คัดลอก
                </button>
              </div>
            </div>
          )}

          {/* 5. ตลาดโพย */}
          {activeTab === 'copybet' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-amber-400">📋 ตลาดโพยยอดฮิต (Copy Bet)</h2>
              <p className="text-slate-400 text-sm">เลือกโพยเลขเด็ดจากเซียนแล้วกดคัดลอกลงฟอร์มแทงทันที</p>
              <div className="space-y-3">
                <div className="bg-slate-800 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-200">โพยชุด 3 ตัวบน (เซียนเอ)</p>
                    <p className="text-amber-400 text-sm font-semibold">เลข: 345 (฿100)</p>
                  </div>
                  <button 
                    onClick={() => handleCopyBetToForm('345', '3 ตัวบน')}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-sm font-bold transition"
                  >
                    คัดลอกไปแทง
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. 📸 ระบบสแกนโพยจากรูปภาพ AI (Handwriting OCR) */}
          {activeTab === 'ocr' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-amber-400">📸 สแกนโพยเขียนมือ / รูปภาพ (AI OCR)</h2>
              <p className="text-slate-400 text-sm">อัปโหลดรูปภาพโพยหวยเขียนมือ หรือรูปถ่ายโพยกระดาษ ระบบ AI จะช่วยแกะลายมือและดึงตัวเลขให้อัตโนมัติ</p>

              <div className="border-2 border-dashed border-slate-700 p-6 rounded-2xl text-center space-y-4 bg-slate-800/30">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-600 cursor-pointer"
                />

                {selectedImage && (
                  <div className="mt-4 space-y-4">
                    <div className="relative w-full h-48 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
                      <img src={selectedImage} alt="Uploaded Slip" className="max-h-full object-contain" />
                    </div>

                    <button 
                      onClick={handleStartOCRScan}
                      disabled={isScanning}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isScanning ? '🤖 AI กำลังแกะลายมือและวิเคราะห์ตัวเลข...' : '🔍 เริ่มสแกนลายมือด้วย AI'}
                    </button>
                  </div>
                )}
              </div>

              {scanResult && (
                <div className="bg-slate-800 p-4 rounded-2xl border border-emerald-500/50 space-y-3">
                  <h3 className="font-bold text-emerald-400">✅ ผลการสแกนลายมือสำเร็จ</h3>
                  <div className="grid grid-cols-3 gap-2 text-sm bg-slate-900 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-xs">ประเภท</span>
                      <strong className="text-slate-200">{scanResult.type}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">เลขที่อ่านได้</span>
                      <strong className="text-amber-400 text-lg">{scanResult.number}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs">จำนวนเงิน</span>
                      <strong className="text-emerald-400">฿{scanResult.amount}</strong>
                    </div>
                  </div>

                  <button 
                    onClick={handleUseScannedData}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl transition"
                  >
                    🚀 นำข้อมูลนี้ไปแทงทันที
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}