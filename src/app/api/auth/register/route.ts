import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 400 });
    }

    // Sign up user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error('Auth error:', error);
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      nickname: data.user.email?.split('@')[0] || 'User',
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ message: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
