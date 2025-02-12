import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Url from "@/models/Url"
import Metric from "@/models/Metric"
import Job from "@/models/Job"
import dbConnect from "@/lib/dbConnect"

const API_KEY = process.env.PAGESPEED_API_KEY
const DELAY_BETWEEN_REQUESTS = 2000 // 2 saniye bekle

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPageSpeedTest(url: string) {
  try {
    console.log('Tarama başlatılıyor:', url)
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${API_KEY}`
    
    console.log('PageSpeed API isteği gönderiliyor:', apiUrl)
    const response = await fetch(apiUrl)
    const data = await response.json()

    if (!response.ok) {
      console.error('PageSpeed API hatası:', data)
      throw new Error(data.error?.message || "PageSpeed API isteği başarısız oldu")
    }

    console.log('PageSpeed API yanıtı alındı:', JSON.stringify(data, null, 2))

    if (!data.lighthouseResult) {
      throw new Error("Lighthouse sonuçları alınamadı")
    }

    const audits = data.lighthouseResult.audits
    const metrics = {
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      inp: audits['interaction-to-next-paint']?.numericValue || audits['interactive']?.numericValue || 0,
      timestamp: new Date()
    }

    console.log('Hesaplanan metrikler:', metrics)
    return metrics
  } catch (error) {
    console.error('PageSpeed testi çalıştırma hatası:', error)
    throw error
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const writeMessage = async (message: any) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
  };

  const processUrls = async () => {
    try {
      await dbConnect();

      // Tüm URL'leri al
      const urls = await Url.find({}).select('_id url').lean();
      
      if (!urls || urls.length === 0) {
        await writeMessage({ type: 'error', error: 'Hiç URL bulunamadı' });
        return;
      }

      // Mevcut jobs'ları temizle
      await Job.deleteMany({
        status: { $in: ['pending', 'processing'] }
      });

      // Her URL için sıralı job oluştur
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        await Job.create({
          urlId: url._id,
          status: 'pending',
          order: i + 1
        });

        await writeMessage({
          type: 'progress',
          scanned: i,
          total: urls.length,
          currentUrl: url.url
        });
      }

      // İlk taramayı tetikle
      const cronResponse = await fetch(
        `${request.headers.get('origin')}/api/cron/scan?key=${process.env.CRON_SECRET_KEY}`,
        { method: 'GET' }
      );

      if (!cronResponse.ok) {
        throw new Error('Cron tetikleme başarısız oldu');
      }

      await writeMessage({
        type: 'complete',
        message: 'Tarama işlemi başlatıldı'
      });

    } catch (error) {
      console.error('Toplu tarama hatası:', error);
      await writeMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
      });
    } finally {
      writer.close();
    }
  };

  processUrls();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
} 