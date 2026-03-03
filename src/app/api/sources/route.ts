import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { DATA_SOURCE_TYPES, MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES } from '@/lib/constants';
import { supabaseAdmin } from '@/lib/supabase/admin';

const createSourceSchema = z.object({
  themeId: z.string().uuid(),
  type: z.enum(DATA_SOURCE_TYPES),
  name: z.string().min(1).max(200),
  content: z.string().optional(), // for type=text
  url: z.string().url().optional(), // for type=url | youtube
});

export const GET = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get('themeId');

  let query = supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (themeId) query = query.eq('theme_id', themeId);

  const { data: sources, error } = await query;
  if (error) throw error;

  return NextResponse.json({ sources });
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const contentType = req.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    return handleFileUpload(req, user.id);
  }

  const body = createSourceSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { themeId, type, name, content, url } = body.data;

  if ((type === 'url' || type === 'youtube') && !url) {
    throw new ValidationError({ message: `url is required for type=${type}` });
  }
  if (type === 'text' && !content) {
    throw new ValidationError({ message: 'content is required for type=text' });
  }

  const { data: source, error } = await supabaseAdmin
    .from('data_sources')
    .insert({
      user_id: user.id,
      theme_id: themeId,
      type,
      name,
      raw_url: url ?? null,
      extracted_text: type === 'text' ? (content ?? null) : null,
      status: type === 'text' ? 'ready' : 'pending',
    })
    .select()
    .single();

  if (error ?? !source) throw error ?? new Error('Failed to create source');

  return NextResponse.json({ source }, { status: 201 });
});

async function handleFileUpload(req: Request, userId: string): Promise<NextResponse> {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const themeId = formData.get('themeId') as string | null;
  const name = formData.get('name') as string | null;
  const typeRaw = formData.get('type') as string | null;

  if (!file || !themeId || !name || !typeRaw) {
    throw new ValidationError({ message: 'file, themeId, name, and type are required' });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError({
      message: `File too large — max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB`,
    });
  }

  const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES;
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError({ message: `Unsupported file type: ${file.type}` });
  }

  const type = typeRaw as 'pdf' | 'docx';
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${userId}/${themeId}/${Date.now()}-${file.name}`;

  // Upload to Supabase Storage
  const { error: storageError } = await supabaseAdmin.storage
    .from('sources')
    .upload(storagePath, buffer, { contentType: file.type });

  if (storageError) throw storageError;

  const { data: source, error } = await supabaseAdmin
    .from('data_sources')
    .insert({
      user_id: userId,
      theme_id: themeId,
      type,
      name,
      storage_path: storagePath,
      status: 'pending',
    })
    .select()
    .single();

  if (error ?? !source) throw error ?? new Error('Failed to create source');

  return NextResponse.json({ source }, { status: 201 });
}
