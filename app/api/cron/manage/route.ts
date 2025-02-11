import { NextResponse } from "next/server";
import { cronManager } from "@/lib/cron";

export async function POST(request: Request) {
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

    const { action } = await request.json();

    switch (action) {
      case 'start':
        cronManager.start();
        return NextResponse.json({ 
          message: "Cron jobs başlatıldı",
          status: cronManager.getStatus()
        });

      case 'stop':
        cronManager.stop();
        return NextResponse.json({ 
          message: "Cron jobs durduruldu",
          status: cronManager.getStatus()
        });

      case 'restart':
        cronManager.restart();
        return NextResponse.json({ 
          message: "Cron jobs yeniden başlatıldı",
          status: cronManager.getStatus()
        });

      default:
        return NextResponse.json(
          { error: "Geçersiz işlem" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Cron yönetimi hatası:", error);
    return NextResponse.json(
      { error: "Cron yönetimi sırasında hata oluştu" },
      { status: 500 }
    );
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

    return NextResponse.json({ 
      status: cronManager.getStatus()
    });

  } catch (error) {
    console.error("Cron durumu kontrol hatası:", error);
    return NextResponse.json(
      { error: "Cron durumu kontrol edilirken hata oluştu" },
      { status: 500 }
    );
  }
} 