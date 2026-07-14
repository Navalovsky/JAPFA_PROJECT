import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Ambil tanggal hari ini dan batas 7 hari yang lalu
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const wtpWeekly = await prisma.wtp_logs.findMany({
      where: {
        created_at: { gte: sevenDaysAgo }
      },
      orderBy: { created_at: 'desc' }
    });

    const wwtpWeekly = await prisma.wwtp_logs.findMany({
      where: {
        created_at: { gte: sevenDaysAgo }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ wtp: wtpWeekly, wwtp: wwtpWeekly });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat data mingguan' }, { status: 500 });
  }
}