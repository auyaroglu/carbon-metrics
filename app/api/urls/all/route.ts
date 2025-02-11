import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Url from "@/models/Url";

export async function GET() {
  try {
    await dbConnect();
    const urls = await Url.find({}).select('_id url').lean();
    
    return NextResponse.json({ urls });
  } catch (error) {
    console.error("URL'ler alınırken hata:", error);
    return NextResponse.json(
      { error: "URL'ler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
} 