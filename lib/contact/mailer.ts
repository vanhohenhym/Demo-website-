import crypto from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import type { ContactSubmission } from "./schema.ts";

export interface ResendTransportConfig {
  provider: "resend";
  apiKey: string;
  from: string;
  to: string;
}

export interface SmtpTransportConfig {
  provider: "smtp";
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string;
}

export interface DemoTransportConfig {
  provider: "demo";
  from: string;
  to: string;
}

export type EmailTransportConfig =
  | ResendTransportConfig
  | SmtpTransportConfig
  | DemoTransportConfig;

export interface SendEmailResult {
  delivered: boolean;
  provider: "resend" | "smtp" | "demo";
  messageId?: string;
}

export interface SmtpSocket {
  on(event: "data", listener: (chunk: Buffer | string) => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  on(event: "close", listener: () => void): unknown;
  on(event: "timeout", listener: () => void): unknown;
  removeListener(event: "data", listener: (chunk: Buffer | string) => void): unknown;
  removeListener(event: "error", listener: (error: Error) => void): unknown;
  removeListener(event: "close", listener: () => void): unknown;
  removeListener(event: "timeout", listener: () => void): unknown;
  write(chunk: string): boolean;
  end(): unknown;
  destroy(error?: Error): unknown;
  setTimeout(timeout: number): unknown;
}

export interface SmtpTransportDeps {
  connect?: (options: {
    host: string;
    port: number;
    secure: boolean;
  }) => Promise<SmtpSocket>;
  upgradeToTls?: (socket: SmtpSocket, host: string) => Promise<SmtpSocket>;
  ehloDomain?: string;
  timeoutMs?: number;
}

const DEFAULT_SMTP_PORT = 587;
const DEFAULT_SMTP_TIMEOUT_MS = 10_000;

/**
 * Strips CR, LF, and NUL bytes and collapses control characters to prevent header injection.
 */
export function sanitizeHeaderValue(value: string): string {
  return value
    .replace(/[\r\n\0]+/g, "")
    .replace(/[\u0001-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractEnvelopeAddress(address: string): string {
  const sanitized = sanitizeHeaderValue(address);
  const bracketMatch = sanitized.match(/<([^<>]+)>/);
  return bracketMatch ? bracketMatch[1].trim() : sanitized;
}

/**
 * Resolves the active email transport configuration from environment variables.
 * Precedence: RESEND_API_KEY -> SMTP_HOST -> demo fallback.
 */
export function resolveEmailTransportConfig(
  env: Record<string, string | undefined> = process.env
): EmailTransportConfig {
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const smtpHost = env.SMTP_HOST?.trim();
  const smtpUser = env.SMTP_USER?.trim();
  const smtpPass = env.SMTP_PASS?.trim();

  const from = sanitizeHeaderValue(
    env.CONTACT_FROM_EMAIL?.trim() || smtpUser || "no-reply@example.com"
  );
  const to = sanitizeHeaderValue(
    env.CONTACT_RECEIVER_EMAIL?.trim() || "support@example.com"
  );

  if (resendApiKey) {
    return {
      provider: "resend",
      apiKey: resendApiKey,
      from,
      to,
    };
  }

  if (smtpHost) {
    const rawPort = env.SMTP_PORT?.trim();
    const parsedPort = rawPort ? Number.parseInt(rawPort, 10) : DEFAULT_SMTP_PORT;
    const port =
      Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
        ? parsedPort
        : DEFAULT_SMTP_PORT;
    const secure = env.SMTP_SECURE?.trim() === "true" || port === 465;

    return {
      provider: "smtp",
      host: smtpHost,
      port,
      secure,
      ...(smtpUser ? { user: smtpUser } : {}),
      ...(smtpPass ? { pass: smtpPass } : {}),
      from,
      to,
    };
  }

  return {
    provider: "demo",
    from,
    to,
  };
}

/**
 * Builds sanitized plain-text and HTML email payloads for a contact inquiry.
 */
export function buildContactEmailContent(submission: ContactSubmission): {
  subject: string;
  text: string;
  html: string;
} {
  const cleanName = sanitizeHeaderValue(submission.name);
  const cleanEmail = sanitizeHeaderValue(submission.email);
  const cleanPhone = sanitizeHeaderValue(submission.phone || "");
  const cleanSubject = sanitizeHeaderValue(submission.subject);
  const normalizedMessage = submission.message.replace(/\r\n|\r/g, "\n").trim();

  const subject = `[Contact] ${cleanSubject}`;

  const text = [
    "New Contact Form Inquiry",
    "------------------------",
    `Name: ${cleanName}`,
    `Email: ${cleanEmail}`,
    `Phone: ${cleanPhone || "Not provided"}`,
    `Subject: ${cleanSubject}`,
    "",
    "Message:",
    normalizedMessage,
  ].join("\n");

  const escapedMessageHtml = escapeHtml(normalizedMessage).replace(
    /\n/g,
    "<br />"
  );

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.5;">',
    '<h2 style="margin:0 0 12px;font-size:18px;">New Contact Form Inquiry</h2>',
    '<table style="border-collapse:collapse;width:100%;max-width:600px;margin-bottom:16px;">',
    `<tr><td style="padding:4px 8px;font-weight:bold;width:90px;">Name:</td><td style="padding:4px 8px;">${escapeHtml(cleanName)}</td></tr>`,
    `<tr><td style="padding:4px 8px;font-weight:bold;">Email:</td><td style="padding:4px 8px;">${escapeHtml(cleanEmail)}</td></tr>`,
    `<tr><td style="padding:4px 8px;font-weight:bold;">Phone:</td><td style="padding:4px 8px;">${escapeHtml(cleanPhone || "Not provided")}</td></tr>`,
    `<tr><td style="padding:4px 8px;font-weight:bold;">Subject:</td><td style="padding:4px 8px;">${escapeHtml(cleanSubject)}</td></tr>`,
    "</table>",
    '<div style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">',
    `<p style="margin:0;">${escapedMessageHtml}</p>`,
    "</div>",
    "</div>",
  ].join("");

  return { subject, text, html };
}

/**
 * Sends a contact inquiry via the Resend HTTPS API using native fetch.
 */
export async function sendViaResend(
  config: ResendTransportConfig,
  submission: ContactSubmission,
  fetchImpl: typeof fetch = fetch
): Promise<{ delivered: boolean; provider: "resend"; messageId?: string }> {
  const { subject, text, html } = buildContactEmailContent(submission);
  const replyTo = sanitizeHeaderValue(submission.email);
  const from = sanitizeHeaderValue(config.from);
  const to = sanitizeHeaderValue(config.to);

  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Resend API request failed with status ${response.status}${
        errorBody ? `: ${errorBody.slice(0, 200)}` : ""
      }`
    );
  }

  const data = (await response.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  const messageId = typeof data?.id === "string" ? data.id : undefined;

  return {
    delivered: true,
    provider: "resend",
    ...(messageId ? { messageId } : {}),
  };
}

interface SmtpResponse {
  code: number;
  lines: string[];
}

class SmtpClientSession {
  private readonly socket: SmtpSocket;
  private buffer = "";
  private pendingLines: string[] = [];
  private queuedResponses: SmtpResponse[] = [];
  private waiters: Array<{
    resolve: (res: SmtpResponse) => void;
    reject: (err: Error) => void;
  }> = [];
  private terminalError: Error | null = null;
  private closed = false;

  constructor(socket: SmtpSocket, timeoutMs: number) {
    this.socket = socket;
    this.socket.setTimeout(timeoutMs);
    this.socket.on("data", this.onData);
    this.socket.on("error", this.onError);
    this.socket.on("timeout", this.onTimeout);
    this.socket.on("close", this.onClose);
    if ("resume" in socket && typeof socket.resume === "function") {
      socket.resume();
    }
  }

  private onData = (chunk: Buffer | string): void => {
    this.buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");

    while (true) {
      const newlineIndex = this.buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const rawLine = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (rawLine.length === 0) {
        continue;
      }

      this.pendingLines.push(rawLine);
      const finalMatch = rawLine.match(/^(\d{3})(?: (.*)|$)$/);
      if (finalMatch) {
        const response: SmtpResponse = {
          code: Number.parseInt(finalMatch[1], 10),
          lines: this.pendingLines,
        };
        this.pendingLines = [];

        const waiter = this.waiters.shift();
        if (waiter) {
          waiter.resolve(response);
        } else {
          this.queuedResponses.push(response);
        }
      }
    }
  };

  private onError = (error: Error): void => {
    this.failAll(error);
  };

  private onTimeout = (): void => {
    const timeoutErr = new Error("SMTP socket timed out");
    this.socket.destroy(timeoutErr);
    this.failAll(timeoutErr);
  };

  private onClose = (): void => {
    this.closed = true;
    this.failAll(new Error("SMTP connection closed unexpectedly"));
  };

  private failAll(error: Error): void {
    if (!this.terminalError) {
      this.terminalError = error;
    }
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.reject(this.terminalError);
    }
  }

  readResponse(): Promise<SmtpResponse> {
    const queued = this.queuedResponses.shift();
    if (queued) {
      return Promise.resolve(queued);
    }
    if (this.terminalError) {
      return Promise.reject(this.terminalError);
    }
    if (this.closed) {
      return Promise.reject(new Error("SMTP socket already closed"));
    }

    return new Promise<SmtpResponse>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  async command(
    line: string,
    expectedCodes: number[]
  ): Promise<SmtpResponse> {
    this.socket.write(`${line}\r\n`);
    const response = await this.readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(
        `Unexpected SMTP response ${response.code}: ${response.lines.join(" | ")}`
      );
    }
    return response;
  }

  async sendDataPayload(payload: string, expectedCodes: number[]): Promise<SmtpResponse> {
    const crlf = payload.replace(/\r\n|\r|\n/g, "\r\n");
    const dotStuffed = crlf.replace(/^\./, "..").replace(/\n\./g, "\n..");
    const terminated = dotStuffed.endsWith("\r\n")
      ? `${dotStuffed}.\r\n`
      : `${dotStuffed}\r\n.\r\n`;

    this.socket.write(terminated);
    const response = await this.readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(
        `Unexpected SMTP DATA response ${response.code}: ${response.lines.join(" | ")}`
      );
    }
    return response;
  }

  detach(): void {
    this.socket.removeListener("data", this.onData);
    this.socket.removeListener("error", this.onError);
    this.socket.removeListener("timeout", this.onTimeout);
    this.socket.removeListener("close", this.onClose);
  }
}

async function defaultConnectSmtp(options: {
  host: string;
  port: number;
  secure: boolean;
}): Promise<SmtpSocket> {
  return new Promise<SmtpSocket>((resolve, reject) => {
    const socket = options.secure
      ? tls.connect({
          host: options.host,
          port: options.port,
          servername: options.host,
        })
      : net.createConnection({
          host: options.host,
          port: options.port,
        });

    const connectEvent = options.secure ? "secureConnect" : "connect";

    const cleanup = () => {
      socket.removeListener(connectEvent, onConnect);
      socket.removeListener("error", onError);
      socket.removeListener("timeout", onTimeout);
    };

    const onConnect = () => {
      cleanup();
      socket.pause();
      resolve(socket);
    };

    const onError = (error: Error) => {
      cleanup();
      socket.destroy();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      const timeoutError = new Error("SMTP connection timed out");
      socket.destroy(timeoutError);
      reject(timeoutError);
    };

    socket.setTimeout(DEFAULT_SMTP_TIMEOUT_MS);
    socket.once(connectEvent, onConnect);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);
  });
}

async function defaultUpgradeSmtpToTls(
  socket: SmtpSocket,
  host: string
): Promise<SmtpSocket> {
  if (!(socket instanceof net.Socket)) {
    throw new Error(
      "STARTTLS upgrade requires a net.Socket or a custom upgradeToTls dependency"
    );
  }

  return new Promise<SmtpSocket>((resolve, reject) => {
    const tlsSocket = tls.connect({
      socket,
      servername: host,
    });

    const cleanup = () => {
      tlsSocket.removeListener("secureConnect", onSecureConnect);
      tlsSocket.removeListener("error", onError);
      tlsSocket.removeListener("timeout", onTimeout);
    };

    const onSecureConnect = () => {
      cleanup();
      tlsSocket.pause();
      resolve(tlsSocket);
    };

    const onError = (error: Error) => {
      cleanup();
      tlsSocket.destroy();
      reject(error);
    };

    const onTimeout = () => {
      cleanup();
      const timeoutError = new Error("SMTP STARTTLS upgrade timed out");
      tlsSocket.destroy(timeoutError);
      reject(timeoutError);
    };

    tlsSocket.setTimeout(DEFAULT_SMTP_TIMEOUT_MS);
    tlsSocket.once("secureConnect", onSecureConnect);
    tlsSocket.once("error", onError);
    tlsSocket.once("timeout", onTimeout);
  });
}

function buildSmtpMimeMessage(
  config: SmtpTransportConfig,
  submission: ContactSubmission,
  messageId: string
): string {
  const { subject, text, html } = buildContactEmailContent(submission);
  const from = sanitizeHeaderValue(config.from);
  const to = sanitizeHeaderValue(config.to);
  const replyTo = sanitizeHeaderValue(submission.email);
  const boundary = `----=_Contact_${crypto.randomBytes(12).toString("hex")}`;

  return [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

/**
 * Sends a contact inquiry over SMTP using native node:net and node:tls sockets.
 */
export async function sendViaSmtp(
  config: SmtpTransportConfig,
  submission: ContactSubmission,
  deps?: SmtpTransportDeps
): Promise<{ delivered: boolean; provider: "smtp"; messageId?: string }> {
  const connect = deps?.connect ?? defaultConnectSmtp;
  const upgradeToTls = deps?.upgradeToTls ?? defaultUpgradeSmtpToTls;
  const ehloDomain = sanitizeHeaderValue(deps?.ehloDomain || "localhost") || "localhost";
  const timeoutMs = deps?.timeoutMs ?? DEFAULT_SMTP_TIMEOUT_MS;

  let socket = await connect({
    host: config.host,
    port: config.port,
    secure: config.secure,
  });
  let session = new SmtpClientSession(socket, timeoutMs);
  let completed = false;

  try {
    const greeting = await session.readResponse();
    if (greeting.code !== 220) {
      throw new Error(
        `Unexpected SMTP greeting ${greeting.code}: ${greeting.lines.join(" | ")}`
      );
    }

    let ehlo = await session.command(`EHLO ${ehloDomain}`, [250]);
    const supportsStartTls = ehlo.lines.some((line) =>
      /\bSTARTTLS\b/i.test(line)
    );

    if (!config.secure && supportsStartTls) {
      await session.command("STARTTLS", [220]);
      session.detach();
      socket = await upgradeToTls(socket, config.host);
      session = new SmtpClientSession(socket, timeoutMs);
      ehlo = await session.command(`EHLO ${ehloDomain}`, [250]);
    }

    if (config.user && config.pass) {
      await session.command("AUTH LOGIN", [334]);
      await session.command(
        Buffer.from(config.user, "utf8").toString("base64"),
        [334]
      );
      await session.command(
        Buffer.from(config.pass, "utf8").toString("base64"),
        [235]
      );
    }

    const envelopeFrom = extractEnvelopeAddress(config.from);
    const envelopeTo = extractEnvelopeAddress(config.to);

    await session.command(`MAIL FROM:<${envelopeFrom}>`, [250]);
    await session.command(`RCPT TO:<${envelopeTo}>`, [250, 251]);
    await session.command("DATA", [354]);

    const domainPart = envelopeFrom.includes("@")
      ? envelopeFrom.split("@")[1]
      : ehloDomain;
    const messageId = `<${crypto.randomUUID()}@${domainPart || "localhost"}>`;
    const mimeMessage = buildSmtpMimeMessage(config, submission, messageId);

    await session.sendDataPayload(mimeMessage, [250]);

    try {
      await session.command("QUIT", [221]);
    } catch {
      // Some SMTP servers close the socket right after receiving QUIT.
    }

    completed = true;
    session.detach();
    socket.end();

    return {
      delivered: true,
      provider: "smtp",
      messageId,
    };
  } finally {
    session.detach();
    if (!completed) {
      socket.destroy();
    }
  }
}

/**
 * Dispatches a validated contact submission using Resend, SMTP, or demo fallback.
 */
export async function sendContactEmail(
  submission: ContactSubmission,
  options?: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    smtpDeps?: SmtpTransportDeps;
  }
): Promise<SendEmailResult> {
  const config = resolveEmailTransportConfig(options?.env ?? process.env);

  if (config.provider === "resend") {
    return sendViaResend(config, submission, options?.fetchImpl);
  }

  if (config.provider === "smtp") {
    return sendViaSmtp(config, submission, options?.smtpDeps);
  }

  return {
    delivered: false,
    provider: "demo",
  };
}
