import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { extractContent } from '@/lib/ingestion';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DataSourceType } from '@/lib/constants';

export const POST = withApiHandler(async (req, ctx) => {
  const { user } = await requireAuth();
  const { id } = await (ctx as { params: Promise<{ id: string }> }).params;

  // Fetch the source record
  const { data: source } = await supabaseAdmin
    .from('data_sources')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!source) throw new NotFoundError({ message: 'Source not found' });

  if (source.status === 'ready') {
    return NextResponse.json({ message: 'Already processed', sourceId: id });
  }

  // Mark as processing
  await supabaseAdmin
    .from('data_sources')
    .update({ status: 'processing' })
    .eq('id', id);

  try {
    let buffer: Buffer | undefined;

    // For file-based sources, download from storage
    if (source.storage_path) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('sources')
        .download(source.storage_path);

      if (downloadError ?? !fileData) {
        throw new ValidationError({ message: 'Failed to download source file from storage' });
      }

      buffer = Buffer.from(await fileData.arrayBuffer());
    }

    const { text, charCount } = await extractContent(source.type as DataSourceType, {
      content: source.extracted_text ?? undefined,
      url: source.raw_url ?? undefined,
      buffer,
    });

    await supabaseAdmin
      .from('data_sources')
      .update({ extracted_text: text, status: 'ready' })
      .eq('id', id);

    return NextResponse.json({ ok: true, charCount });
  } catch (err) {
    await supabaseAdmin
      .from('data_sources')
      .update({ status: 'error' })
      .eq('id', id);

    throw err;
  }
});
