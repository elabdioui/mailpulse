process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/mailpulse_test";
process.env.ADMIN_PASSWORD ??= "test-password";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters-long";
process.env.API_TOKEN ??= "test-api-token";
process.env.PUBLIC_BASE_URL ??= "https://t.example.dev";
process.env.APP_TIMEZONE ??= "Africa/Casablanca";
process.env.GRACE_PERIOD_SECONDS ??= "180";
process.env.DEDUP_WINDOW_SECONDS ??= "60";
