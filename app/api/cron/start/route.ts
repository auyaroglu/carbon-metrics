import { NextResponse } from "next/server";
import { cronManager } from "@/lib/cron";

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

    cronManager.start();
    
    return NextResponse.json({ 
      message: "Cron jobs başlatıldı"
    });

  } catch (error) {
    console.error("Cron başlatma hatası:", error);
    return NextResponse.json(
      { error: "Cron jobs başlatılırken hata oluştu" },
      { status: 500 }
    );
  }
} 