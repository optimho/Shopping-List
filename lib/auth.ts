import { betterAuth } from "better-auth";
import { Database } from "bun:sqlite";

let _auth: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!_auth) {
    _auth = betterAuth({
      database: new Database("data/app.db") as unknown as Parameters<typeof betterAuth>[0]["database"],
      emailAndPassword: { enabled: true },
      trustedOrigins: [
        "http://localhost:3000",
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
      ],
      baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      advanced: {
        useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith("https") ?? false,
      },
      user: {
        additionalFields: {
          role: {
            type: "string",
            defaultValue: "user",
            input: false,
          },
        },
      },
    }) as unknown as ReturnType<typeof betterAuth>;
  }
  return _auth;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    const instance = getAuth();
    const value = instance[prop as keyof typeof instance];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
