import { z } from "zod";

const SHARED_FREE_HOST_SUFFIXES = [
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  ".herokuapp.com",
  ".github.io",
  ".onrender.com",
  ".fly.dev",
  ".repl.co",
];

function isSharedFreeHost(hostname: string): boolean {
  return SHARED_FREE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD est requis"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET doit contenir au moins 32 caractères"),
  API_TOKEN: z.string().min(1, "API_TOKEN est requis"),
  PUBLIC_BASE_URL: z
    .string()
    .min(1, "PUBLIC_BASE_URL est requis")
    .refine((v) => v.startsWith("https://"), {
      message: "PUBLIC_BASE_URL doit commencer par https://",
    })
    .refine((v) => !v.endsWith("/"), {
      message: "PUBLIC_BASE_URL ne doit pas finir par /",
    })
    .refine(
      (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: "PUBLIC_BASE_URL doit être une URL valide" },
    ),
  APP_TIMEZONE: z.string().default("Africa/Casablanca"),
  GRACE_PERIOD_SECONDS: z.coerce.number().int().positive().default(180),
  DEDUP_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof envSchema> & {
  PUBLIC_BASE_URL_IS_SHARED_HOST: boolean;
};

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuration invalide. Vérifie tes variables d'environnement :\n${message}`,
    );
  }

  const hostname = new URL(parsed.data.PUBLIC_BASE_URL).hostname;

  return {
    ...parsed.data,
    PUBLIC_BASE_URL_IS_SHARED_HOST: isSharedFreeHost(hostname),
  };
}

export const env = loadEnv();

export { isSharedFreeHost };
