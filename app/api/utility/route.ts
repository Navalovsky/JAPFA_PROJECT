import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Ambil 1 data terbaru untuk Card Angka Utama
    const latestWtp = await prisma.wtp_logs.findFirst({
      orderBy: { created_at: 'desc' },
    });
    const latestWwtp = await prisma.wwtp_logs.findFirst({
      orderBy: { created_at: 'desc' },
    });

    // 2. Ambil 6 data terakhir untuk Grafik Tren
    const chartWtpData = await prisma.wtp_logs.findMany({
      take: 6,
      orderBy: { created_at: 'desc' },
    });
    const chartWwtpData = await prisma.wwtp_logs.findMany({
      take: 6,
      orderBy: { created_at: 'desc' },
    });

    // Urutkan data dari waktu terlama ke terbaru (kiri ke kanan di grafik)
    const chartWtp = chartWtpData.reverse();
    const chartWwtp = chartWwtpData.reverse();

    return NextResponse.json({
      latest: { wtp: latestWtp, wwtp: latestWwtp },
      charts: { wtp: chartWtp, wwtp: chartWwtp }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data database' }, { status: 500 });
  }
}