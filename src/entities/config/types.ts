// v3.0 스키마 기준: public.app_config

export interface AppConfig {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}
