import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dgnktvvkgmgdcvswpqsw.supabase.co'

const supabaseKey = 'sb_publishable_JZRYoAFCE3c4g2c9qTfLBw_mrbo8Pas'

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)