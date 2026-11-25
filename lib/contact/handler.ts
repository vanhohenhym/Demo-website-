import { sendContactEmail } from "./mailer.ts";
import {
  contactRateLimiter,
  extractClientIp,
  type RateLimiter,
} from "./rate-limit.ts";
import { contactSchema, extractFieldErrors } from "./schema.ts";

export interface ContactHandlerResult {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Processes a contact form POST request: JSON parsing, rate limiting,
 * Zod validation, honeypot rejection, and email transport dispatch.
 */
export async function handleContactRequest(
  request: Request,
  deps?: {
    rateLimiter?: RateLimiter;
    sendEmail?: typeof sendContactEmail;
    now?: () => number;
  }
): Promise<ContactHandlerResult> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return {
      status: 400,
      body: { error: "Invalid request payload." },
    };
  }

  if (
    typeof rawBody !== "object" ||
    rawBody === null ||
    Array.isArray(rawBody)
  ) {
    return {
      status: 400,
      body: { error: "Invalid request payload." },
    };
  }

  const rateLimiter = deps?.rateLimiter ?? contactRateLimiter;
  const sendEmail = deps?.sendEmail ?? sendContactEmail;
  const now = deps?.now ? deps.now() : Date.now();

  const clientIp = extractClientIp(request.headers);
  const rateResult = rateLimiter.check(clientIp, now);
  if (!rateResult.allowed) {
    return {
      status: 429,
      headers: {
        "Retry-After": String(rateResult.retryAfterSeconds),
      },
      body: {
        error: "Too many requests. Please wait before submitting again.",
        retryAfterSeconds: rateResult.retryAfterSeconds,
      },
    };
  }

  const parsed = contactSchema.safeParse(rawBody);
  if (!parsed.success) {
    const hasHoneypotError = parsed.error.issues.some(
      (issue) => issue.path[0] === "honeypot" || issue.path.includes("honeypot")
    );

    if (hasHoneypotError) {
      return {
        status: 400,
        body: { error: "Invalid submission." },
      };
    }

    return {
      status: 400,
      body: {
        error: "Please correct the highlighted fields and try again.",
        fieldErrors: extractFieldErrors(parsed.error),
      },
    };
  }

  try {
    const result = await sendEmail(parsed.data);

    if (result.provider === "demo") {
      return {
        status: 200,
        body: {
          success: true,
          deliveryMode: "demo",
          message:
            "Thank you for contacting Star Tech! Your inquiry has been received (demo mode — configure RESEND_API_KEY or SMTP_HOST to send live emails).",
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        deliveryMode: result.provider,
        message:
          "Thank you for contacting Star Tech! Your message has been sent and our team will respond within 24 hours.",
      },
    };
  } catch {
    return {
      status: 502,
      body: {
        error:
          "We could not deliver your message right now. Please try again shortly or call 16793.",
      },
    };
  }
}
