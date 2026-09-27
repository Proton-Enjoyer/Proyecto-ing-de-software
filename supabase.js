import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'sb_publishable_stJ1vp9SKGzQKQ6zo0_i_w_Kns6awop'
const supabaseKey = 'https://zngzhzfxacxsbyttlewf.supabase.co'

export const supabase = createClient(supabaseUrl, supabaseKey)
