"use server";

import { revalidatePath } from "next/cache";

import {
  createEmail,
  createEmailSchema,
  deleteEmail,
  updateEmail,
  type CreateEmailResult,
} from "@/lib/services/emails";
import { markEmailOpensAsRead } from "@/lib/services/notifications";

export interface CreateEmailState {
  error?: string;
  result?: CreateEmailResult;
}

export async function createEmailAction(
  _prevState: CreateEmailState,
  formData: FormData,
): Promise<CreateEmailState> {
  const parsed = createEmailSchema.safeParse({
    label: formData.get("label"),
    recipient: formData.get("recipient") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Requête invalide" };
  }

  const result = await createEmail(parsed.data);
  revalidatePath("/");
  return { result };
}

export async function setArchivedAction(
  id: string,
  archived: boolean,
): Promise<void> {
  await updateEmail(id, { archived });
  revalidatePath("/");
  revalidatePath(`/emails/${id}`);
}

export async function deleteEmailAction(id: string): Promise<void> {
  await deleteEmail(id);
  revalidatePath("/");
}

export async function updateEmailFieldsAction(
  id: string,
  patch: { label?: string; recipient?: string | null; notes?: string | null },
): Promise<void> {
  await updateEmail(id, patch);
  revalidatePath("/");
  revalidatePath(`/emails/${id}`);
}

export async function markEmailOpensReadAction(emailId: string): Promise<number> {
  return markEmailOpensAsRead(emailId);
}
