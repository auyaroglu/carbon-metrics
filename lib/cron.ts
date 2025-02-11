import { CronJob } from 'cron';
import dbConnect from './dbConnect';
import Job from '@/models/Job';
import Url from '@/models/Url';
import Metric from '@/models/Metric';

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

class CronManager {
  private weeklyJob: CronJob;
  private scanJob: CronJob;

  constructor() {
    // Her Pazar günü gece yarısı çalışacak cron
    this.weeklyJob = new CronJob('0 0 * * 2', this.handleWeeklyJob);

    // Her 5 dakikada bir çalışacak cron
    this.scanJob = new CronJob('*/5 * * * *', this.handleScanJob);
  }

  // Tüm URL'leri Jobs tablosuna ekler
  private handleWeeklyJob = async () => {
    try {
      console.log('Haftalık job başlatıldı:', new Date().toISOString());
      await dbConnect();

      const urls = await Url.find({}).select('_id');
      const existingJobs = await Job.find({ 
        status: { $in: ['pending', 'processing'] } 
      }).select('urlId');
      
      const existingUrlIds = existingJobs.map(job => job.urlId.toString());
      const newJobs = [];

      for (const url of urls) {
        if (!existingUrlIds.includes(url._id.toString())) {
          newJobs.push({
            urlId: url._id,
            status: 'pending'
          });
        }
      }

      if (newJobs.length > 0) {
        await Job.insertMany(newJobs);
      }

      console.log(`Haftalık job tamamlandı: ${newJobs.length} yeni job oluşturuldu`);
    } catch (error) {
      console.error('Haftalık job hatası:', error);
    }
  }

  // Bekleyen işleri işler
  private handleScanJob = async () => {
    try {
      console.log('Tarama job başlatıldı:', new Date().toISOString());
      await dbConnect();

      const pendingJobs = await Job.find({ status: "pending" }).limit(5);
      const results = {
        total: pendingJobs.length,
        successful: 0,
        failed: 0
      };

      for (const job of pendingJobs) {
        try {
          const url = await Url.findById(job.urlId);
          if (!url) {
            results.failed++;
            continue;
          }

          job.status = "processing";
          await job.save();

          // PageSpeed metriklerini al
          const apiUrl = `${PAGESPEED_API_URL}?url=${encodeURIComponent(url.url)}&key=${PAGESPEED_API_KEY}&strategy=mobile`;
          const response = await fetch(apiUrl);
          const data = await response.json();

          if (data.error) {
            throw new Error(data.error.message);
          }

          const metrics = {
            cls: data.loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile || 0,
            lcp: data.loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentile || 0,
            inp: data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile || 0
          };

          // Metrikleri kaydet
          await Metric.create({
            urlId: url._id,
            ...metrics
          });

          // URL'i güncelle
          url.lastScanned = new Date();
          await url.save();

          // Job'u sil
          await job.deleteOne();
          results.successful++;

        } catch (error) {
          results.failed++;
          job.status = "failed";
          job.error = error instanceof Error ? error.message : "Bilinmeyen hata";
          await job.save();
        }
      }

      console.log('Tarama job tamamlandı:', results);
    } catch (error) {
      console.error('Tarama job hatası:', error);
    }
  }

  // Cron'ları başlat
  public start() {
    this.weeklyJob.start();
    this.scanJob.start();
    console.log('Cron jobs başlatıldı');
  }

  // Cron'ları durdur
  public stop() {
    this.weeklyJob.stop();
    this.scanJob.stop();
    console.log('Cron jobs durduruldu');
  }
}

export const cronManager = new CronManager(); 