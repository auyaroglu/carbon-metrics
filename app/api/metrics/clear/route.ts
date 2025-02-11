import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Metric from "@/models/Metric";
import Url from "@/models/Url";

export async function DELETE() {
  try {
    await dbConnect();

    // Tüm metrikleri sil
    await Metric.deleteMany({});
    
    // Tüm URL'lerin lastScanned alanını null yap
    await Url.updateMany({}, { $set: { lastScanned: null } });
    
    return NextResponse.json({ 
      message: "Tüm metrikler ve tarama geçmişi başarıyla silindi" 
    });
  } catch (error) {
    console.error("Metrikler silinirken hata:", error);
    return NextResponse.json(
      { error: "Metrikler silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 