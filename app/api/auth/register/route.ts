import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { username, password, role } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    // Cek apakah username sudah dipakai
    const existingUser = await prisma.users.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: 'Username sudah dipakai, silakan pilih username lain' }, { status: 409 });
    }

    // Batasi role yang boleh didaftarkan sendiri (admin harus dibuat manual lewat database)
    const safeRole = role === 'engineer' ? 'engineer' : 'engineer';

    const newUser = await prisma.users.create({
      data: {
        username,
        password, // Catatan: disimpan polos tanpa hash, sesuai kode login yang sudah ada
        role: safeRole,
      }
    });

    return NextResponse.json({
      success: true,
      user: { username: newUser.username, role: newUser.role }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
