import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface JobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export async function GET() {
  try {
    await connectDB();
    
    // Job'ların durumunu al
    const stats = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // İstatistikleri düzenle
    const jobStats: JobStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0
    };

    stats.forEach(stat => {
      const status = stat._id as JobStatus;
      if (status in jobStats) {
        jobStats[status] = stat.count;
        jobStats.total += stat.count;
      }
    });

    return NextResponse.json(jobStats);
  } catch (error) {
    console.error('Job durumları alınırken hata oluştu:', error);
    return NextResponse.json(
      { error: 'Job durumları alınırken bir hata oluştu' },
      { status: 500 }
    );
  }
} 