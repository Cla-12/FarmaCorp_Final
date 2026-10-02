import { neon } from 'https://esm.sh/@neondatabase/serverless';

export const sql = neon('postgresql://neondb_owner:npg_oJT2OgL8xihr@ep-lucky-mountain-b5vhk1br-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require', {
    disableWarningInBrowsers: true // uso académico: conexión directa desde el navegador
});