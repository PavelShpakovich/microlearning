'use server';

import { revalidatePath } from 'next/cache';

/** Revalidate the main astrology workspace surfaces after user-visible mutations. */
export async function revalidateDashboard() {
  revalidatePath('/dashboard');
  revalidatePath('/tg');
  revalidatePath('/tg/dashboard');
}
