import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://zngzhzfxacxsbyttlewf.supabase.co'
const supabaseKey = 'sb_publishable_stJ1vp9SKGzQKQ6zo0_i_w_Kns6awop'

export const supabase = createClient(supabaseUrl, supabaseKey)
