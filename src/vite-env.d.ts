/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_AI_ENDPOINT?: string;
  readonly VITE_WEB3FORMS_KEY?: string;
  readonly VITE_LEAD_EMAIL?: string;
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
