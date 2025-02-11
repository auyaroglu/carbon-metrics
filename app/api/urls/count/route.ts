import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Url from '@/models/Url';

export async function GET() {
  try {
    await connectDB();
    
    // Toplam URL sayısını al
    const total = await Url.countDocuments();
    
    return NextResponse.json({ total });
  } catch (error) {
    console.error('URL sayısı alınırken hata oluştu:', error);
    return NextResponse.json(
      { error: 'URL sayısı alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 