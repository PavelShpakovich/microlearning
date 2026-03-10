import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { FLAGS } from '@/lib/feature-flags';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  if (!FLAGS.WEB_AUTH_ENABLED) {
    return NextResponse.json(
      { message: 'Web registration is currently disabled.' },
      { status: 410 },
    );
  }

  try {
    // Rate limit: 5 registration attempts per IP per 10 minutes
    const ip = getClientIp(request);
    const rl = checkRateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    // Enforce minimum password strength
    const passwordError = validatePassword(password as string);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    // Sign up user with Supabase Auth
    // email_confirm: false triggers a verification email — users must confirm ownership.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (error) {
      logger.error({ email, error }, 'Auth user creation failed');
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
    }

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      display_name: deriveDisplayNameFromEmail(data.user.email),
    });

    if (profileError) {
      logger.error({ userId: data.user.id, profileError }, 'Profile creation failed');
      return NextResponse.json({ message: 'Failed to create profile' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Registration route failed');
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Returns an error string if the password does not meet complexity requirements,
 * or null if it passes.
 */
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}
