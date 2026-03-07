'use server';

import { revalidatePath } from 'next/cache';

/** Revalidate the dashboard page after theme mutations so changes appear immediately. */
export async function revalidateDashboard() {
  revalidatePath('/dashboard');
  revalidatePath('/tg');
  revalidatePath('/tg/dashboard');
}
