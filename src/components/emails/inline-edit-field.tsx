"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateEmailFieldsAction } from "@/app/(app)/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Field = "label" | "recipient" | "notes";

export function InlineEditField({
  emailId,
  field,
  initialValue,
  placeholder,
  multiline = false,
  required = false,
  className,
}: {
  emailId: string;
  field: Field;
  initialValue: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [, startTransition] = useTransition();

  function commit() {
    const trimmed = value.trim();
    if (trimmed === initialValue.trim()) return;

    if (required && trimmed.length === 0) {
      setValue(initialValue);
      return;
    }

    startTransition(async () => {
      if (field === "label") {
        await updateEmailFieldsAction(emailId, { label: trimmed });
      } else if (field === "recipient") {
        await updateEmailFieldsAction(emailId, {
          recipient: trimmed.length > 0 ? trimmed : null,
        });
      } else {
        await updateEmailFieldsAction(emailId, {
          notes: trimmed.length > 0 ? trimmed : null,
        });
      }
      toast.success("Modification enregistrée");
    });
  }

  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        className={cn(className)}
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      placeholder={placeholder}
      className={cn(className)}
    />
  );
}
