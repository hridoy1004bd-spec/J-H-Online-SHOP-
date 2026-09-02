/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_DEFAULT_CURRENCY: string;
  readonly VITE_WHATSAPP_NUMBER: string;
  readonly VITE_PHONE_NUMBER: string;
  readonly VITE_DEV_OTP_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
