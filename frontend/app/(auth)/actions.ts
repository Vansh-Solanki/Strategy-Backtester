"use server";

import { AuthError } from "next-auth";

import { apiClient, APIError } from "@/lib/api-client";
import { signIn } from "@/auth";

export interface SignUpState {
  error?: string;
}

export async function signUp(
  _prevState: SignUpState | undefined,
  formData: FormData
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await apiClient.register({ email, name, password });
  } catch (err) {
    if (err instanceof APIError) {
      return { error: err.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  await signIn("credentials", { email, password, redirectTo: "/" });

  return {};
}

export interface SignInState {
  error?: string;
}

export async function signInAction(
  _prevState: SignInState | undefined,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw err;
  }

  return {};
}
