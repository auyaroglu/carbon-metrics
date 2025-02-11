import { NextResponse } from "next/server"
import connectDB from "@/lib/db"
import Url from "@/models/Url"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const url = await Url.findById(params.id).lean()
    if (!url) {
      return NextResponse.json(
        { error: "URL bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json(url)
  } catch (error) {
    console.error("URL alınırken hata oluştu:", error)
    return NextResponse.json(
      { error: "URL alınırken bir hata oluştu" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const url = await Url.findByIdAndDelete(params.id)
    if (!url) {
      return NextResponse.json(
        { error: "URL bulunamadı" },
        { status: 404 }
      )
    }

    // Burada ilgili metrikleri de silebilirsiniz

    return NextResponse.json({ message: "URL başarıyla silindi" })
  } catch (error) {
    console.error("URL silinirken hata oluştu:", error)
    return NextResponse.json(
      { error: "URL silinirken bir hata oluştu" },
      { status: 500 }
    )
  }
} 