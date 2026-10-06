// Configuración del cliente Supabase.
//
// SUPABASE_KEY es una clave PÚBLICA de cliente (`sb_publishable_...`): Supabase
// la diseñó para ir embebida en el frontend, y es el único tipo de key que
// pertenece en el navegador. No otorga accesos por sí sola: el aislamiento de
// los datos depende de las políticas RLS y de Storage.
// La `service_role` (privilegios completos, salta RLS) NUNCA debe llegar al
// cliente: si alguna vez hace falta, va en el servidor / Edge Functions.
export const SUPABASE_URL = 'https://zngzhzfxacxsbyttlewf.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_stJ1vp9SKGzQKQ6zo0_i_w_Kns6awop';
