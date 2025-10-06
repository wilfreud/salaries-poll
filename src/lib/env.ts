const warnMissing = (key: string) => {
  if (import.meta.env.DEV) {
    console.warn(`⚠️ Missing environment variable: ${key}`);
  }
};

const readEnv = (key: string) => {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  if (!value || value.length === 0) {
    warnMissing(key);
    return undefined;
  }
  return value;
};

export const env = {
  supabaseUrl: readEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: readEnv("VITE_SUPABASE_ANON_KEY"),
};
