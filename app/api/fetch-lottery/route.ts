import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lotteryType = searchParams.get('type') || 'lao';

    // 💡 ในระบบจริง: คุณสามารถเปลี่ยนส่วนนี้เป็นการ fetch ข้อมูลจาก API ผู้ให้บริการหวยภายนอกที่คุณใช้งานอยู่
    // เช่น const res = await fetch(`https://api.your-provider.com/results?type=${lotteryType}`);
    // const externalData = await res.json();

    // ข้อมูลจำลองผลรางวัลจริงที่จะถูกบันทึกเข้าระบบ
    const today = new Date().toISOString().split('T')[0];
    const fetchedData = {
      lottery_type: lotteryType,
      draw_date: today,
      three_top: lotteryType === 'lao' ? '589' : '456',
      two_bottom: lotteryType === 'lao' ? '24' : '91',
    };

    // บันทึกลง Supabase แบบ Upsert (ถ้ามีผลของวันนี้แล้ว จะทำการอัปเดตให้ทันทีไม่ให้ซ้ำ)
    const { data, error } = await supabase
      .from('lottery_results')
      .upsert([fetchedData], { onConflict: 'draw_date,lottery_type' })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `ดึงผลหวย ${lotteryType.toUpperCase()} อัตโนมัติสำเร็จ`,
      data: data[0],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}