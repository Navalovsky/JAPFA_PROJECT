import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data, uploaded_by } = body; // type bisa 'wtp' atau 'wwtp'

    if (type === 'wtp') {
      const newWtp = await prisma.wtp_logs.create({
        data: {
          debit_inlet: parseFloat(data.debit_inlet),
          debit_outlet: parseFloat(data.debit_outlet),
          uploaded_by: uploaded_by || null,
        }
      });
      return NextResponse.json({ success: true, data: newWtp });
    } else if (type === 'wwtp') {
      const newWwtp = await prisma.wwtp_logs.create({
        data: {
          cod: parseFloat(data.cod),
          bod: parseFloat(data.bod),
          debit_inlet: parseFloat(data.debit_inlet),
          debit_outlet: parseFloat(data.debit_outlet),
          nh3_n: parseFloat(data.nh3_n),
          ph: parseFloat(data.ph),
          uploaded_by: uploaded_by || null,
        }
      });
      return NextResponse.json({ success: true, data: newWwtp });
    }

    return NextResponse.json({ error: 'Tipe log tidak valid' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menyimpan data ke database' }, { status: 500 });
  }
}
