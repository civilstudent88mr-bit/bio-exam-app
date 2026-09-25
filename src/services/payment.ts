import { supabase } from '@/lib/supabase';

export async function uploadPaymentReceipt(file: File, studentId: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${studentId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('payment-receipts').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  return path;
}
