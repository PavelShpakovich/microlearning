'use server';

import { revalidatePath } from 'next/cache';

/**
 * Server action to revalidate profile-related paths after updates
 */
export async function revalidateProfileData() {
  // Revalidate the entire layout so the header name updates everywhere
  revalidatePath('/', 'layout');
}
