import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it } from "node:test";
import { handleContactRequest } from "../../lib/contact/handler.ts";
import {
  buildContactEmailContent,
  resolveEmailTransportConfig,
  sanitizeHeaderValue,
  sendContactEmail,
  sendViaResend,
  sendViaSmtp,
  type SmtpSocket,
} from "../../lib/contact/mailer.ts";
import {
  createRateLimiter,
  extractClientIp,
} from "../../lib/contact/rate-limit.ts";
import {
  contactSchema,
  extractFieldErrors,
  type ContactSubmission,
} from "../../lib/contact/schema.ts";

function makeValidPayload(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    name: "Amina Rahman",
    email: "amina@example.com",
    phone: "+880 1711-000000",
    subject: "Warranty inquiry",
    message: "Hello Star Tech, I would like to check warranty terms for my GPU.",
    honeypot: "",
    ...overrides,
  };
}

class MockSmtpSocket extends EventEmitter implements SmtpSocket {
  readonly writtenChunks: string[] = [];
  ended = false;
  destroyed = false;
  timeoutMs = 0;
  private lineBuffer = "";
  private inDataMode = false;
  private readonly onLine: (line: string, socket: MockSmtpSocket) => void;
  private readonly onDataEnd?: (payload: string, socket: MockSmtpSocket) => void;
  private dataLines: string[] = [];

  constructor(options: {
    onLine: (line: string, socket: MockSmtpSocket) => void;
    onDataEnd?: (payload: string, socket: MockSmtpSocket) => void;
  }) {
    super();
    this.onLine = options.onLine;
    this.onDataEnd = options.onDataEnd;
  }

  emitServer(text: string): void {
    setImmediate(() => {
      this.emit("data", Buffer.from(text, "utf8"));
    });
  }

  enterDataMode(): void {
    this.inDataMode = true;
    this.dataLines = [];
  }

  write(chunk: string): boolean {
    this.writtenChunks.push(chunk);
    this.lineBuffer += chunk;

    while (true) {
      const idx = this.lineBuffer.indexOf("\r\n");
      if (idx === -1) {
        break;
      }
      const line = this.lineBuffer.slice(0, idx);
      this.lineBuffer = this.lineBuffer.slice(idx + 2);

      if (this.inDataMode) {
        if (line === ".") {
          this.inDataMode = false;
          const payload = this.dataLines.join("\r\n");
          this.onDataEnd?.(payload, this);
        } else {
          this.dataLines.push(line);
        }
      } else {
        this.onLine(line, this);
      }
    }

    return true;
  }

  end(): this {
    this.ended = true;
    return this;
  }

  destroy(): this {
    this.destroyed = true;
    return this;
  }

  setTimeout(timeout: number): this {
    this.timeoutMs = timeout;
    return this;
  }
}

describe("contactSchema and extractFieldErrors", () => {
  it("validates and trims valid submissions including optional blank phone", () => {
    const parsedWithPhone = contactSchema.safeParse(
      makeValidPayload({
        name: "  Tariq Hasan  ",
        email: "  tariq@example.com  ",
        phone: "  01711-223344  ",
        subject: "  Build Help  ",
        message: "  Need compatibility confirmation for AM5 build.  ",
      })
    );

    assert.equal(parsedWithPhone.success, true);
    if (parsedWithPhone.success) {
      assert.equal(parsedWithPhone.data.name, "Tariq Hasan");
      assert.equal(parsedWithPhone.data.email, "tariq@example.com");
      assert.equal(parsedWithPhone.data.phone, "01711-223344");
      assert.equal(parsedWithPhone.data.subject, "Build Help");
      assert.equal(parsedWithPhone.data.honeypot, "");
    }

    const parsedBlankPhone = contactSchema.safeParse(
      makeValidPayload({ phone: "   " })
    );
    assert.equal(parsedBlankPhone.success, true);
    if (parsedBlankPhone.success) {
      assert.equal(parsedBlankPhone.data.phone, "");
    }

    const parsedOmittedPhone = contactSchema.safeParse({
      name: "Nadia Karim",
      email: "nadia@example.com",
      subject: "Order Status",
      message: "Checking order dispatch timeline for Dhaka.",
    });
    assert.equal(parsedOmittedPhone.success, true);
    if (parsedOmittedPhone.success) {
      assert.equal(parsedOmittedPhone.data.phone, "");
      assert.equal(parsedOmittedPhone.data.honeypot, "");
    }
  });

  it("rejects invalid phone numbers while allowing valid phone formats", () => {
    const invalidShort = contactSchema.safeParse(
      makeValidPayload({ phone: "12345" })
    );
    assert.equal(invalidShort.success, false);
    if (!invalidShort.success) {
      assert.deepEqual(extractFieldErrors(invalidShort.error), {
        phone: "Enter a valid phone number (8–20 characters) or leave blank.",
      });
    }

    const invalidChars = contactSchema.safeParse(
      makeValidPayload({ phone: "01711abc999" })
    );
    assert.equal(invalidChars.success, false);

    const validParens = contactSchema.safeParse(
      makeValidPayload({ phone: "(+880) 1711-223344" })
    );
    assert.equal(validParens.success, true);
  });

  it("extracts the first error per public field and excludes honeypot", () => {
    const result = contactSchema.safeParse({
      name: "A",
      email: "not-an-email",
      phone: "bad",
      subject: "Hi",
      message: "short",
      honeypot: "spam-bot",
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const errors = extractFieldErrors(result.error);
      assert.equal(
        errors.name,
        "Enter your full name (at least 2 characters)."
      );
      assert.equal(
        errors.email,
        "Enter an email address in the format you@example.com."
      );
      assert.equal(
        errors.phone,
        "Enter a valid phone number (8–20 characters) or leave blank."
      );
      assert.equal(
        errors.subject,
        "Enter a subject (at least 3 characters)."
      );
      assert.equal(
        errors.message,
        "Enter a message of at least 10 characters."
      );
      assert.equal("honeypot" in errors, false);
    }
  });
});

describe("rate-limit", () => {
  it("enforces maxRequests within the window and resets after expiration", () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    const t0 = 1_000_000;

    const r1 = limiter.check("203.0.113.10", t0);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);
    assert.equal(r1.retryAfterSeconds, 0);

    const r2 = limiter.check("203.0.113.10", t0 + 1_000);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    const r3 = limiter.check("203.0.113.10", t0 + 2_000);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);

    const r4 = limiter.check("203.0.113.10", t0 + 15_000);
    assert.equal(r4.allowed, false);
    assert.equal(r4.remaining, 0);
    assert.equal(r4.retryAfterSeconds, 45);
    assert.equal(r4.resetAt, t0 + 60_000);

    // Different key remains independent
    const other = limiter.check("203.0.113.99", t0 + 15_000);
    assert.equal(other.allowed, true);
    assert.equal(other.remaining, 2);

    // Window expiry resets counter
    const afterWindow = limiter.check("203.0.113.10", t0 + 60_000);
    assert.equal(afterWindow.allowed, true);
    assert.equal(afterWindow.remaining, 2);
    assert.equal(afterWindow.retryAfterSeconds, 0);

    // Manual reset clears state
    limiter.reset();
    const afterManualReset = limiter.check("203.0.113.10", t0 + 61_000);
    assert.equal(afterManualReset.allowed, true);
    assert.equal(afterManualReset.remaining, 2);
  });

  it("prunes expired entries when map size exceeds 500", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1_000 });
    const start = 10_000;

    for (let i = 0; i < 510; i++) {
      const res = limiter.check(`ip-${i}`, start);
      assert.equal(res.allowed, true);
    }

    // After window expires, pruning runs and expired keys start fresh
    const postPrune = limiter.check("ip-0", start + 2_000);
    assert.equal(postPrune.allowed, true);
    assert.equal(postPrune.remaining, 1);
  });

  it("extracts client IP from x-forwarded-for, x-real-ip, or local fallback", () => {
    assert.equal(
      extractClientIp(
        new Headers({
          "x-forwarded-for": " 198.51.100.4 , 70.41.3.18 ",
          "x-real-ip": "192.0.2.1",
        })
      ),
      "198.51.100.4"
    );

    assert.equal(
      extractClientIp(
        new Headers({
          "x-forwarded-for": "   ",
          "x-real-ip": " 192.0.2.55 ",
        })
      ),
      "192.0.2.55"
    );

    assert.equal(extractClientIp(new Headers()), "local");
  });
});

describe("mailer config, sanitization, and transports", () => {
  it("resolves transport config with precedence Resend > SMTP > demo", () => {
    const resend = resolveEmailTransportConfig({
      RESEND_API_KEY: "re_test_123",
      SMTP_HOST: "smtp.example.com",
      CONTACT_FROM_EMAIL: "care@startech-demo.test",
      CONTACT_RECEIVER_EMAIL: "inbox@startech-demo.test",
    });
    assert.deepEqual(resend, {
      provider: "resend",
      apiKey: "re_test_123",
      from: "care@startech-demo.test",
      to: "inbox@startech-demo.test",
    });

    const smtpDefaultPort = resolveEmailTransportConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "  mailer@example.com ",
      SMTP_PASS: " secret ",
    });
    assert.deepEqual(smtpDefaultPort, {
      provider: "smtp",
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: "mailer@example.com",
      pass: "secret",
      from: "mailer@example.com",
      to: "support@example.com",
    });

    const smtp465 = resolveEmailTransportConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "465",
    });
    assert.equal(smtp465.provider, "smtp");
    if (smtp465.provider === "smtp") {
      assert.equal(smtp465.port, 465);
      assert.equal(smtp465.secure, true);
    }

    const demo = resolveEmailTransportConfig({});
    assert.deepEqual(demo, {
      provider: "demo",
      from: "no-reply@example.com",
      to: "support@example.com",
    });
  });

  it("strips CRLF/NUL injection sequences and escapes HTML in email content", () => {
    const sanitized = sanitizeHeaderValue(
      "Hello\r\nBcc: attacker@evil.com\0\t\x07World"
    );
    assert.equal(sanitized.includes("\r"), false);
    assert.equal(sanitized.includes("\n"), false);
    assert.equal(sanitized.includes("\0"), false);
    assert.equal(sanitized, "HelloBcc: attacker@evil.com World");

    const submission: ContactSubmission = {
      name: 'Alice <script>alert("x")</script>',
      email: "alice@example.com\r\nBcc: evil@example.com",
      phone: "01711000000",
      subject: "Question & 'Quote'\r\nX-Test: 1",
      message: 'Price check for <RTX 4070> & "Motherboard" \'Pro\'',
      honeypot: "",
    };

    const content = buildContactEmailContent(submission);
    assert.equal(content.subject.startsWith("[Contact] "), true);
    assert.equal(content.subject.includes("\r"), false);
    assert.equal(content.subject.includes("\n"), false);
    assert.equal(content.html.includes("<script>"), false);
    assert.equal(content.html.includes("&lt;script&gt;"), true);
    assert.equal(content.html.includes("&amp;"), true);
    assert.equal(content.html.includes("&quot;Motherboard&quot;"), true);
    assert.equal(content.html.includes("&#39;Pro&#39;"), true);
  });

  it("sends email via Resend API and throws explicit error on HTTP failure", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(JSON.stringify({ id: "msg_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const submission = contactSchema.parse(makeValidPayload());
    const result = await sendViaResend(
      {
        provider: "resend",
        apiKey: "re_live_abc",
        from: "no-reply@example.com",
        to: "support@example.com",
      },
      submission,
      mockFetch
    );

    assert.deepEqual(result, {
      delivered: true,
      provider: "resend",
      messageId: "msg_123",
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    assert.equal(calls[0].init?.method, "POST");

    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer re_live_abc");
    assert.equal(headers["Content-Type"], "application/json");

    const sentBody = JSON.parse(String(calls[0].init?.body)) as {
      from: string;
      to: string[];
      reply_to: string;
      subject: string;
      text: string;
      html: string;
    };
    assert.equal(sentBody.from, "no-reply@example.com");
    assert.deepEqual(sentBody.to, ["support@example.com"]);
    assert.equal(sentBody.reply_to, "amina@example.com");
    assert.equal(sentBody.subject, "[Contact] Warranty inquiry");

    const failFetch: typeof fetch = async () =>
      new Response("Internal Server Error", { status: 500 });

    await assert.rejects(
      () =>
        sendViaResend(
          {
            provider: "resend",
            apiKey: "re_live_abc",
            from: "no-reply@example.com",
            to: "support@example.com",
          },
          submission,
          failFetch
        ),
      /Resend API request failed with status 500/
    );
  });

  it("executes SMTP EHLO, STARTTLS, AUTH LOGIN, MAIL FROM, RCPT TO, DATA dot-stuffing, and QUIT", async () => {
    const commandsSeen: string[] = [];
    let capturedDataPayload = "";
    let upgradedToTls = false;

    const createMockSocket = (isTls: boolean): MockSmtpSocket => {
      const sock = new MockSmtpSocket({
        onLine(line, s) {
          commandsSeen.push(line);
          if (line.startsWith("EHLO ")) {
            if (!isTls) {
              s.emitServer(
                "250-smtp.example.com Hello\r\n250-STARTTLS\r\n250 AUTH LOGIN\r\n"
              );
            } else {
              s.emitServer("250-smtp.example.com Ready\r\n250 AUTH LOGIN\r\n");
            }
          } else if (line === "STARTTLS") {
            s.emitServer("220 Ready to start TLS\r\n");
          } else if (line === "AUTH LOGIN") {
            s.emitServer("334 VXNlcm5hbWU6\r\n");
          } else if (
            line === Buffer.from("mailer@example.com", "utf8").toString("base64")
          ) {
            s.emitServer("334 UGFzc3dvcmQ6\r\n");
          } else if (
            line === Buffer.from("s3cr3t!", "utf8").toString("base64")
          ) {
            s.emitServer("235 2.7.0 Authentication successful\r\n");
          } else if (line.startsWith("MAIL FROM:")) {
            s.emitServer("250 2.1.0 OK\r\n");
          } else if (line.startsWith("RCPT TO:")) {
            s.emitServer("250 2.1.5 OK\r\n");
          } else if (line === "DATA") {
            s.enterDataMode();
            s.emitServer("354 End data with <CR><LF>.<CR><LF>\r\n");
          } else if (line === "QUIT") {
            s.emitServer("221 2.0.0 Bye\r\n");
          } else {
            s.emitServer("500 Unrecognized command\r\n");
          }
        },
        onDataEnd(payload, s) {
          capturedDataPayload = payload;
          s.emitServer("250 2.0.0 Queued\r\n");
        },
      });
      return sock;
    };

    const plainSocket = createMockSocket(false);
    const tlsSocket = createMockSocket(true);

    const submission = contactSchema.parse(
      makeValidPayload({
        message: "First line\n.leading dot line\n.\nLast line of message.",
      })
    );

    const smtpResult = await sendViaSmtp(
      {
        provider: "smtp",
        host: "smtp.example.com",
        port: 587,
        secure: false,
        user: "mailer@example.com",
        pass: "s3cr3t!",
        from: "no-reply@example.com",
        to: "support@example.com",
      },
      submission,
      {
        connect: async () => {
          plainSocket.emitServer("220 smtp.example.com ESMTP\r\n");
          return plainSocket;
        },
        upgradeToTls: async () => {
          upgradedToTls = true;
          return tlsSocket;
        },
      }
    );

    assert.equal(smtpResult.delivered, true);
    assert.equal(smtpResult.provider, "smtp");
    assert.equal(upgradedToTls, true);
    assert.equal(plainSocket.timeoutMs, 10_000);
    assert.equal(tlsSocket.timeoutMs, 10_000);
    assert.equal(tlsSocket.ended, true);

    assert.deepEqual(commandsSeen, [
      "EHLO localhost",
      "STARTTLS",
      "EHLO localhost",
      "AUTH LOGIN",
      Buffer.from("mailer@example.com", "utf8").toString("base64"),
      Buffer.from("s3cr3t!", "utf8").toString("base64"),
      "MAIL FROM:<no-reply@example.com>",
      "RCPT TO:<support@example.com>",
      "DATA",
      "QUIT",
    ]);

    assert.equal(
      capturedDataPayload.includes("Reply-To: amina@example.com"),
      true
    );
    assert.equal(capturedDataPayload.includes("MIME-Version: 1.0"), true);
    assert.equal(capturedDataPayload.includes("\r\n..leading dot line"), true);
    assert.equal(capturedDataPayload.includes("\r\n..\r\nLast line"), true);
  });

  it("supports direct TLS SMTP without STARTTLS/AUTH and cleans up socket on SMTP error", async () => {
    const commandsSeen: string[] = [];
    const directTlsSocket = new MockSmtpSocket({
      onLine(line, s) {
        commandsSeen.push(line);
        if (line.startsWith("EHLO ")) {
          s.emitServer("250-smtp.example.com\r\n250 SIZE 10485760\r\n");
        } else if (line.startsWith("MAIL FROM:")) {
          s.emitServer("250 OK\r\n");
        } else if (line.startsWith("RCPT TO:")) {
          s.emitServer("250 OK\r\n");
        } else if (line === "DATA") {
          s.enterDataMode();
          s.emitServer("354 Go ahead\r\n");
        } else if (line === "QUIT") {
          s.emitServer("221 Bye\r\n");
        }
      },
      onDataEnd(_payload, s) {
        s.emitServer("250 OK\r\n");
      },
    });

    const submission = contactSchema.parse(makeValidPayload());
    const directResult = await sendViaSmtp(
      {
        provider: "smtp",
        host: "smtp.example.com",
        port: 465,
        secure: true,
        from: "Star Tech <no-reply@example.com>",
        to: "support@example.com",
      },
      submission,
      {
        connect: async () => {
          directTlsSocket.emitServer("220 smtp.example.com ESMTP\r\n");
          return directTlsSocket;
        },
      }
    );

    assert.equal(directResult.delivered, true);
    assert.equal(directResult.provider, "smtp");
    assert.deepEqual(commandsSeen, [
      "EHLO localhost",
      "MAIL FROM:<no-reply@example.com>",
      "RCPT TO:<support@example.com>",
      "DATA",
      "QUIT",
    ]);

    const failingSocket = new MockSmtpSocket({
      onLine(line, s) {
        if (line.startsWith("EHLO ")) {
          s.emitServer("250 OK\r\n");
        } else if (line.startsWith("MAIL FROM:")) {
          s.emitServer("550 Sender rejected\r\n");
        }
      },
    });

    await assert.rejects(
      () =>
        sendViaSmtp(
          {
            provider: "smtp",
            host: "smtp.example.com",
            port: 465,
            secure: true,
            from: "no-reply@example.com",
            to: "support@example.com",
          },
          submission,
          {
            connect: async () => {
              failingSocket.emitServer("220 smtp.example.com ESMTP\r\n");
              return failingSocket;
            },
          }
        ),
      /Unexpected SMTP response 550/
    );
    assert.equal(failingSocket.destroyed, true);
  });

  it("returns demo result when no transport environment variables are configured and dispatches resend via env", async () => {
    const submission = contactSchema.parse(makeValidPayload());
    const demoResult = await sendContactEmail(submission, { env: {} });
    assert.deepEqual(demoResult, { delivered: false, provider: "demo" });

    const resendResult = await sendContactEmail(submission, {
      env: { RESEND_API_KEY: "re_env_key" },
      fetchImpl: async () =>
        new Response(JSON.stringify({ id: "re_env_1" }), { status: 200 }),
    });
    assert.deepEqual(resendResult, {
      delivered: true,
      provider: "resend",
      messageId: "re_env_1",
    });
  });
});

describe("handleContactRequest", () => {
  it("returns 400 on invalid JSON without calling mailer", async () => {
    let mailerCalled = false;
    const req = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad json",
    });

    const res = await handleContactRequest(req, {
      rateLimiter: createRateLimiter(),
      sendEmail: async () => {
        mailerCalled = true;
        return { delivered: false, provider: "demo" };
      },
    });

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: "Invalid request payload." });
    assert.equal(mailerCalled, false);
  });

  it("rejects honeypot submissions with 400 without calling mailer", async () => {
    let mailerCalled = false;
    const req = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeValidPayload({ honeypot: "http://spam.test" })),
    });

    const res = await handleContactRequest(req, {
      rateLimiter: createRateLimiter(),
      sendEmail: async () => {
        mailerCalled = true;
        return { delivered: true, provider: "resend" };
      },
    });

    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: "Invalid submission." });
    assert.equal(mailerCalled, false);
  });

  it("returns 400 with fieldErrors when validation fails", async () => {
    const req = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeValidPayload({ email: "invalid", phone: "12" })),
    });

    const res = await handleContactRequest(req, {
      rateLimiter: createRateLimiter(),
      sendEmail: async () => ({ delivered: false, provider: "demo" }),
    });

    assert.equal(res.status, 400);
    assert.equal(
      res.body.error,
      "Please correct the highlighted fields and try again."
    );
    assert.deepEqual(res.body.fieldErrors, {
      email: "Enter an email address in the format you@example.com.",
      phone: "Enter a valid phone number (8–20 characters) or leave blank.",
    });
  });

  it("returns 429 with Retry-After header when rate limit is exceeded", async () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const now = () => 50_000;

    const buildRequest = () =>
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.7",
        },
        body: JSON.stringify(makeValidPayload()),
      });

    const first = await handleContactRequest(buildRequest(), {
      rateLimiter: limiter,
      now,
      sendEmail: async () => ({ delivered: false, provider: "demo" }),
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.deliveryMode, "demo");

    const second = await handleContactRequest(buildRequest(), {
      rateLimiter: limiter,
      now: () => 55_000,
      sendEmail: async () => ({ delivered: false, provider: "demo" }),
    });
    assert.equal(second.status, 429);
    assert.equal(second.headers?.["Retry-After"], "55");
    assert.equal(second.body.retryAfterSeconds, 55);
    assert.equal(
      second.body.error,
      "Too many requests. Please wait before submitting again."
    );
  });

  it("returns 200 for live providers and 502 when mailer delivery throws", async () => {
    const liveReq = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeValidPayload()),
    });

    const liveRes = await handleContactRequest(liveReq, {
      rateLimiter: createRateLimiter(),
      sendEmail: async () => ({
        delivered: true,
        provider: "resend",
        messageId: "re_1",
      }),
    });
    assert.equal(liveRes.status, 200);
    assert.equal(liveRes.body.success, true);
    assert.equal(liveRes.body.deliveryMode, "resend");

    const failReq = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeValidPayload()),
    });

    const failRes = await handleContactRequest(failReq, {
      rateLimiter: createRateLimiter(),
      sendEmail: async (submission) =>
        sendContactEmail(submission, {
          env: { RESEND_API_KEY: "re_test" },
          fetchImpl: async () =>
            new Response("Upstream error", { status: 500 }),
        }),
    });
    assert.equal(failRes.status, 502);
    assert.equal(
      failRes.body.error,
      "We could not deliver your message right now. Please try again shortly or call 16793."
    );
  });
});
