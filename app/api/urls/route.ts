import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Url from '@/models/Url';
import Metric from '@/models/Metric';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const search = searchParams.get("search") || "";
    const limit = 10;

    await connectDB();

    // Arama filtresi oluştur
    const searchFilter = search
      ? { url: { $regex: search, $options: "i" } }
      : {};

    const totalDocs = await Url.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalDocs / limit);
    const skip = (page - 1) * limit;

    const sortOptions: { [key: string]: 1 | -1 } = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // URL'leri getir (lastScanned dahil)
    const urls = await Url.find(searchFilter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select('_id url lastScanned createdAt')
      .lean();

    return NextResponse.json({
      urls,
      totalPages,
      currentPage: page,
      totalDocs,
    });
  } catch (err) {
    console.error("URL'ler alınırken hata:", err);
    return NextResponse.json(
      { error: "URL'ler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL gereklidir' },
        { status: 400 }
      );
    }

    const existingUrl = await Url.findOne({ url });
    if (existingUrl) {
      return NextResponse.json(
        { error: 'Bu URL zaten mevcut' },
        { status: 400 }
      );
    }

    const newUrl = await Url.create({
      url,
      lastScanned: null,
    });

    return NextResponse.json(newUrl);
  } catch (error) {
    console.error('URL eklenirken hata oluştu:', error);
    return NextResponse.json(
      { error: 'URL eklenirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (ids) {
      const urlIds = ids.split(',');
      await Promise.all([
        Url.deleteMany({ _id: { $in: urlIds } }),
        Metric.deleteMany({ urlId: { $in: urlIds } })
      ]);
      return NextResponse.json({ message: 'Seçili URL\'ler başarıyla silindi' });
    }

    return NextResponse.json(
      { error: 'Silinecek URL\'ler belirtilmedi' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Veriler silinirken hata oluştu:', error);
    return NextResponse.json(
      { error: 'Veriler silinirken bir hata oluştu' },
      { status: 500 }
    );
  }
} 