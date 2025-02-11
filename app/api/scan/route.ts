import { NextResponse } from "next/server"
import dbConnect from "@/lib/dbConnect"
import Job from "@/models/Job"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await dbConnect()

    const body = await request.json()
    console.log('Gelen istek:', body)

    const urlIds = Array.isArray(body.urls) ? body.urls : [body.urlId]

    if (!urlIds || urlIds.length === 0) {
      return NextResponse.json(
        { error: "Geçerli URL gereklidir" },
        { status: 400 }
      )
    }

    // Aktif job'ları temizle
    await Job.deleteMany({ 
      urlId: { $in: urlIds },
      status: { $in: ['pending', 'processing'] }
    });

    // Her URL için bir job oluştur
    const jobs = await Promise.all(
      urlIds.map((urlId: string) => Job.create({ urlId }))
    )
    console.log(`${jobs.length} adet job oluşturuldu`)

    return NextResponse.json({
      message: "Tarama işlemi başlatıldı",
      jobs: jobs.map(job => ({
        id: job._id,
        urlId: job.urlId,
        status: job.status
      }))
    });
  } catch (error) {
    console.error("Tarama sırasında hata oluştu:", error)
    return NextResponse.json(
      { error: "Tarama sırasında bir hata oluştu" },
      { status: 500 }
    )
  }
} 