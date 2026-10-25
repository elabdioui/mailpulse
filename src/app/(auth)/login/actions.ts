"use server";

import { redirect } from "next/navigation";

import { clearSessionCookie, setSessionCookie, verifyPassword } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

const GENERIC_ERROR = "Mot de passe incorrect.";
const FAILURE_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    await delay(FAILURE_DELAY_MS);
    return { error: GENERIC_ERROR };
  }

  if (!verifyPassword(password)) {
    await delay(FAILURE_DELAY_MS);
    return { error: GENERIC_ERROR };
  }

  await setSessionCookie();
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
