import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Url from '@/models/Url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await connectDB()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 })
    }

    const url = await Url.findById(id).lean()
    if (!url) {
      return NextResponse.json({ error: 'URL bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(url)
  } catch (error) {
    console.error('URL alınırken hata:', error)
    return NextResponse.json(
      { error: 'URL alınırken bir hata oluştu' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    await connectDB()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 })
    }

    const url = await Url.findByIdAndDelete(id)
    if (!url) {
      return NextResponse.json({ error: 'URL bulunamadı' }, { status: 404 })
    }

    return NextResponse.json({ message: 'URL başarıyla silindi' })
  } catch (error) {
    console.error('URL silinirken hata:', error)
    return NextResponse.json(
      { error: 'URL silinirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
