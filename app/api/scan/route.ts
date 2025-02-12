import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Job from '@/models/Job'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 dakika

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type application/json olmalıdır' },
        { status: 415 }
      )
    }

    const body = await request.json()
    console.log('Gelen istek:', body)

    const urlIds = Array.isArray(body.urls) ? body.urls : [body.urlId]

    if (!urlIds || urlIds.length === 0) {
      return NextResponse.json(
        { error: 'Geçerli URL gereklidir' },
        { status: 400 }
      )
    }

    // Aktif job'ları temizle
    await Job.deleteMany({
      urlId: { $in: urlIds },
      status: { $in: ['pending', 'processing'] },
    })

    // Her URL için bir job oluştur
    const jobs = await Promise.all(
      urlIds.map((urlId: string, index: number) =>
        Job.create({
          urlId,
          status: 'pending',
          order: index + 1,
        })
      )
    )
    console.log(`${jobs.length} adet job oluşturuldu`)

    return NextResponse.json({
      message: 'Tarama işlemi başlatıldı',
      jobs: jobs.map(job => ({
        id: job._id,
        urlId: job.urlId,
        status: job.status,
        order: job.order,
      })),
    })
  } catch (error) {
    if (error instanceof Error) {
      console.error('Tarama sırasında hata oluştu:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.error('Tarama sırasında bilinmeyen hata oluştu:', error)
    return NextResponse.json(
      { error: 'Tarama sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}
