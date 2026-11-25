import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name (at least 2 characters).")
    .max(120, "Name must be 120 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Enter an email address in the format you@example.com.")
    .max(254, "Email address is too long."),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[+\d\s()-]{8,20}$/.test(v),
      "Enter a valid phone number (8–20 characters) or leave blank."
    )
    .optional()
    .default(""),
  subject: z
    .string()
    .trim()
    .min(3, "Enter a subject (at least 3 characters).")
    .max(150, "Subject must be 150 characters or fewer."),
  message: z
    .string()
    .trim()
    .min(10, "Enter a message of at least 10 characters.")
    .max(5000, "Message must be 5,000 characters or fewer."),
  honeypot: z.string().max(0, "Bot detected").optional().default(""),
});

export type ContactSubmission = z.infer<typeof contactSchema>;

export type ContactFieldName = "name" | "email" | "phone" | "subject" | "message";

export type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;

const CONTACT_FIELD_NAMES = new Set<ContactFieldName>([
  "name",
  "email",
  "phone",
  "subject",
  "message",
]);

function isContactFieldName(value: unknown): value is ContactFieldName {
  return (
    typeof value === "string" &&
    CONTACT_FIELD_NAMES.has(value as ContactFieldName)
  );
}

/**
 * Extracts the first Zod validation message for each public contact field.
 */
export function extractFieldErrors(error: z.ZodError): ContactFieldErrors {
  const fieldErrors: ContactFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (isContactFieldName(field) && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}
