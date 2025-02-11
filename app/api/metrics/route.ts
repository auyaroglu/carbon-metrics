import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Metric from '@/models/Metric';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    
    const metric = await Metric.create(body);
    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Metrik kaydedilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const urlId = searchParams.get('urlId');
    const period = searchParams.get('period') || 'week';

    const date = new Date();
    if (period === 'week') {
      date.setDate(date.getDate() - 7);
    } else if (period === 'month') {
      date.setMonth(date.getMonth() - 1);
    }

    const metrics = await Metric.find({
      urlId,
      timestamp: { $gte: date }
    }).sort({ timestamp: 1 });

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Metrikler alınırken bir hata oluştu.' },
      { status: 500 }
    );
  }
} 