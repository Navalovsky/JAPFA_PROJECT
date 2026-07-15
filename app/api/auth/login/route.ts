import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Cari user berdasarkan username
    const user = await prisma.users.findUnique({
      where: { username },
    });

    // Cek password (sederhana tanpa hash untuk keperluan belajar lokal)
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // Jika benar, kirim data user & role ke frontend
    return NextResponse.json({
      success: true,
      user: { username: user.username, role: user.role }
    });
  } catch (error) {
       return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
   }
}
