import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Job from "@/models/Job";
import Url from "@/models/Url";

export async function GET(request: Request) {
  try {
    // API key kontrolü
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    
    if (apiKey !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Gün kontrolü (Pazar günü mü?)
    const now = new Date();
    if (now.getDay() !== 0 || now.getHours() !== 0) {
      return NextResponse.json({ 
        message: "Bu endpoint sadece Pazar günü gece yarısı çalışır" 
      });
    }

    await dbConnect();

    // Tüm URL'leri al
    const urls = await Url.find({}).select('_id');

    // Her URL için job oluştur (failed olanlar hariç)
    const existingJobs = await Job.find({ 
      status: { $in: ['pending', 'processing'] } 
    }).select('urlId');
    
    const existingUrlIds = existingJobs.map(job => job.urlId.toString());

    const newJobs = [];
    for (const url of urls) {
      // URL'in zaten aktif bir job'u varsa atla
      if (existingUrlIds.includes(url._id.toString())) {
        continue;
      }

      newJobs.push({
        urlId: url._id,
        status: 'pending'
      });
    }

    // Yeni jobları toplu ekle
    if (newJobs.length > 0) {
      await Job.insertMany(newJobs);
    }

    return NextResponse.json({ 
      message: "Haftalık jobs oluşturuldu",
      createdCount: newJobs.length 
    });

  } catch (error) {
    console.error("Haftalık cron hatası:", error);
    return NextResponse.json(
      { error: "Haftalık jobs oluşturulurken hata oluştu" },
      { status: 500 }
    );
  }
} 