import { supabase } from '@/lib/supabase';

export async function uploadHandoutFile(file: File, teacherId: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${teacherId}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('handouts').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || 'application/pdf',
  });
  if (error) throw error;
  return path;
}
