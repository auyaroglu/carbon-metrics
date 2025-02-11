import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Job from "@/models/Job";
import Metric from "@/models/Metric";
import Url from "@/models/Url";

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

async function getPageSpeedMetrics(url: string) {
  try {
    const apiUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url)}&key=${PAGESPEED_API_KEY}&strategy=mobile`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const metrics = {
      cls: data.lighthouseResult?.audits['cumulative-layout-shift']?.numericValue || 0,
      lcp: data.lighthouseResult?.audits['largest-contentful-paint']?.numericValue || 0,
      inp: data.lighthouseResult?.audits['interaction-to-next-paint']?.numericValue || 0
    };

    return metrics;
  } catch (error) {
    console.error(`PageSpeed API hatası (${url}):`, error);
    throw error;
  }
}

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

    // 5 dakika kontrolü
    const now = new Date();
    if (now.getMinutes() % 5 !== 0) {
      return NextResponse.json({ 
        message: "Bu endpoint sadece her 5 dakikada bir çalışır" 
      });
    }

    await dbConnect();

    // Bekleyen ve işlenmeyen jobları sıralı olarak al
    const pendingJobs = await Job.find({ 
      status: "pending"
    })
    .sort({ order: 1 }) // Sıra numarasına göre artan sıralama
    .limit(5);

    const results = {
      total: pendingJobs.length,
      successful: 0,
      failed: 0,
      details: {
        success: [] as string[],
        errors: [] as { url: string; error: string }[]
      }
    };

    // Her job için işlem yap
    for (const job of pendingJobs) {
      try {
        const url = await Url.findById(job.urlId);
        if (!url) {
          results.failed++;
          results.details.errors.push({
            url: job.urlId,
            error: "URL bulunamadı"
          });
          continue;
        }

        // Job'u işleniyor durumuna güncelle
        job.status = "processing";
        await job.save();

        // PageSpeed metriklerini al
        const metrics = await getPageSpeedMetrics(url.url);

        // Metrikleri kaydet
        await Metric.create({
          urlId: url._id,
          ...metrics
        });

        // URL'in son tarama tarihini güncelle
        url.lastScanned = new Date();
        await url.save();

        // Başarılı job'u sil
        await job.deleteOne();

        results.successful++;
        results.details.success.push(url.url);

      } catch (error) {
        results.failed++;
        results.details.errors.push({
          url: job.urlId,
          error: error instanceof Error ? error.message : "Bilinmeyen hata"
        });

        // Hata durumunda job'u failed olarak işaretle
        job.status = "failed";
        job.error = error instanceof Error ? error.message : "Bilinmeyen hata";
        await job.save();
      }
    }

    console.log("Cron İşlem Sonuçları:", {
      timestamp: new Date().toISOString(),
      ...results
    });

    return NextResponse.json({ 
      message: "Jobs işlendi",
      results
    });

  } catch (error) {
    console.error("Cron işlemi hatası:", error);
    return NextResponse.json(
      { error: "Cron işlemi sırasında hata oluştu" },
      { status: 500 }
    );
  }
} 