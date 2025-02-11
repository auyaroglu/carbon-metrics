import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Job from "@/models/Job";

export async function DELETE() {
  try {
    await dbConnect();
    
    // Tüm jobs kayıtlarını sil
    await Job.deleteMany({});
    
    return NextResponse.json({ message: "Tüm jobs kayıtları başarıyla silindi" });
  } catch (error) {
    console.error("Jobs silinirken hata:", error);
    return NextResponse.json(
      { error: "Jobs kayıtları silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 