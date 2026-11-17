import net from "net";
import tls from "tls";

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  error?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send";
const DEFAULT_FROM = "ExaResume <onboarding@resend.dev>";

function isSendGrid(): boolean {
  return process.env.EMAIL_PROVIDER === "sendgrid";
}

function isSmtp(): boolean {
  return process.env.EMAIL_PROVIDER === "smtp";
}

function resolvedFrom(): string {
  if (isSendGrid()) {
    return process.env.SENDGRID_FROM ?? process.env.RESEND_FROM ?? DEFAULT_FROM;
  }
  if (isSmtp()) {
    return process.env.SMTP_FROM ?? process.env.RESEND_FROM ?? DEFAULT_FROM;
  }
  return process.env.RESEND_FROM ?? DEFAULT_FROM;
}

function resolvedApiKey(): string | undefined {
  if (isSendGrid()) {
    return process.env.SENDGRID_API_KEY;
  }
  if (isSmtp()) {
    return process.env.SMTP_PASS;
  }
  return process.env.RESEND_API_KEY;
}

function logDevEmail(to: string, subject: string, body?: string): void {
  console.log("┌─ dev email (no email provider configured) ─────────────────────────");
  console.log(`│ Provider: ${isSendGrid() ? "sendgrid" : isSmtp() ? "smtp" : "resend"}`);
  console.log(`│ To: ${to}`);
  console.log(`│ Subject: ${subject}`);
  console.log("│");
  console.log(body ?? "(no body)");
  console.log("└────────────────────────────────────────────────────────────────────");
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendEmailResult> {
  const apiKey = resolvedApiKey();
  if (!apiKey) {
    logDevEmail(to, subject, text ?? html);
    return { sent: false };
  }

  if (isSendGrid()) {
    return sendViaSendGrid(apiKey, to, subject, html, text);
  }
  if (isSmtp()) {
    return sendViaSmtp(to, subject, html, text);
  }
  return sendViaResend(apiKey, to, subject, html, text);
}

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  html?: string,
  text?: string,
): Promise<SendEmailResult> {
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolvedFrom(),
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`Email delivery failed (HTTP ${response.status}): ${detail}`);
      return {
        sent: false,
        error: `Email provider rejected the message (HTTP ${response.status}).`,
      };
    }

    const body = (await response.json()) as { id?: string };
    return { sent: true, id: body.id };
  } catch (error) {
    console.error("Email delivery failed:", error);
    return { sent: false, error: "Could not reach the email provider." };
  }
}

async function sendViaSendGrid(
  apiKey: string,
  to: string,
  subject: string,
  html?: string,
  text?: string,
): Promise<SendEmailResult> {
  const content: Array<{ type: string; value: string }> = [];
  if (text) content.push({ type: "text/plain", value: text });
  if (html) content.push({ type: "text/html", value: html });
  if (content.length === 0) content.push({ type: "text/plain", value: "" });

  try {
    const response = await fetch(SENDGRID_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: resolvedFrom() },
        subject,
        content,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`Email delivery failed (HTTP ${response.status}): ${detail}`);
      return {
        sent: false,
        error: `Email provider rejected the message (HTTP ${response.status}).`,
      };
    }

    const id = response.headers.get("X-Message-Id") ?? undefined;
    return { sent: true, id };
  } catch (error) {
    console.error("Email delivery failed:", error);
    return { sent: false, error: "Could not reach the email provider." };
  }
}

/**
 * Minimal SMTP client over Node's built-in net/tls modules (no extra deps).
 * Supports plain SMTP (port 25), STARTTLS (port 587), and SMTPS (port 465).
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
 */
async function sendViaSmtp(
  to: string,
  subject: string,
  html?: string,
  text?: string,
): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = resolvedFrom();
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    return {
      sent: false,
      error: "SMTP_HOST, SMTP_USER, and SMTP_PASS are required.",
    };
  }

  const socketRef: { current: net.Socket | tls.TLSSocket | null } = {
    current: null,
  };
  const ioRef: {
    current: {
      sendLine: (line: string) => Promise<void>;
      expectCode: (expected: string) => Promise<string>;
    } | null;
  } = { current: null };

  const connect = (): Promise<net.Socket | tls.TLSSocket> =>
    new Promise((resolve, reject) => {
      let s: net.Socket | tls.TLSSocket;
      if (secure) {
        s = tls.connect({ host, port, rejectUnauthorized: false });
      } else {
        s = net.createConnection({ host, port });
      }
      s.setEncoding("utf8");
      s.once("secureConnect", () => resolve(s));
      s.once("connect", () => resolve(s));
      s.once("error", reject);
    });

  const buildIo = () => {
    const s = socketRef.current;
    if (!s) throw new Error("Socket not connected");
    let buffer = "";
    const readLine = (): Promise<string> =>
      new Promise((resolve, reject) => {
        const onData = (chunk: string) => {
          buffer += chunk;
          const idx = buffer.indexOf("\n");
          if (idx !== -1) {
            const line = buffer.slice(0, idx).replace(/\r$/, "");
            buffer = buffer.slice(idx + 1);
            s.removeListener("data", onData);
            s.removeListener("error", onError);
            resolve(line);
          }
        };
        const onError = (err: Error) => {
          s.removeListener("data", onData);
          reject(err);
        };
        s.on("data", onData);
        s.on("error", onError);
      });

    const sendLine = (line: string): Promise<void> =>
      new Promise((resolve, reject) => {
        s.write(`${line}\r\n`, (err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

    const expectCode = (expected: string): Promise<string> =>
      readLine().then((line) => {
        if (!line.startsWith(expected)) {
          throw new Error(`SMTP unexpected response: ${line}`);
        }
        return line;
      });

    return { sendLine, expectCode };
  };

  try {
    const connected = await connect();
    socketRef.current = connected;
    ioRef.current = buildIo();

    const sendLine = (line: string) =>
      ioRef.current!.sendLine(line);
    const expectCode = (expected: string) =>
      ioRef.current!.expectCode(expected);

    await expectCode("220"); // greeting

    await sendLine(`EHLO ${host}`);
    await expectCode("250");

    if (!secure) {
      await sendLine("STARTTLS");
      await expectCode("220");
      const upgraded = tls.connect(
        { socket: connected, host, rejectUnauthorized: false, servername: host },
        () => {},
      );
      socketRef.current = upgraded;
      upgraded.setEncoding("utf8");
      ioRef.current = buildIo();
    }

    if (user && pass) {
      await sendLine("AUTH LOGIN");
      await expectCode("334");
      await sendLine(Buffer.from(user).toString("base64"));
      await expectCode("334");
      await sendLine(Buffer.from(pass).toString("base64"));
      await expectCode("235");
    }

    await sendLine(`MAIL FROM:<${from}>`);
    await expectCode("250");

    await sendLine(`RCPT TO:<${to}>`);
    await expectCode("250");

    await sendLine("DATA");
    await expectCode("354");

    const date = new Date().toUTCString();
    const messageId = `<${Date.now()}@${host}>`;
    const boundary = `----ExaResumeBoundary${Date.now()}`;

    const bodyText = text ?? "";
    const bodyHtml = html ?? "";

    const parts: string[] = [];
    parts.push(`From: ${from}`);
    parts.push(`To: ${to}`);
    parts.push(`Subject: ${subject}`);
    parts.push(`Date: ${date}`);
    parts.push(`Message-ID: ${messageId}`);
    parts.push(`MIME-Version: 1.0`);

    if (bodyHtml && bodyText) {
      parts.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      parts.push("");
      parts.push(`--${boundary}`);
      parts.push("Content-Type: text/plain; charset=UTF-8");
      parts.push("Content-Transfer-Encoding: 7bit");
      parts.push("");
      parts.push(bodyText);
      parts.push("");
      parts.push(`--${boundary}`);
      parts.push("Content-Type: text/html; charset=UTF-8");
      parts.push("Content-Transfer-Encoding: 7bit");
      parts.push("");
      parts.push(bodyHtml);
      parts.push("");
      parts.push(`--${boundary}--`);
    } else if (bodyHtml) {
      parts.push("Content-Type: text/html; charset=UTF-8");
      parts.push("Content-Transfer-Encoding: 7bit");
      parts.push("");
      parts.push(bodyHtml);
    } else {
      parts.push("Content-Type: text/plain; charset=UTF-8");
      parts.push("Content-Transfer-Encoding: 7bit");
      parts.push("");
      parts.push(bodyText);
    }

    parts.push("");
    parts.push(".");

    await sendLine(parts.join("\r\n"));
    await expectCode("250");

    await sendLine("QUIT");
    await expectCode("221");

    socketRef.current?.end();
    return { sent: true };
  } catch (error) {
    try {
      socketRef.current?.end();
    } catch {
      // ignore
    }
    console.error("SMTP delivery failed:", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "SMTP delivery failed.",
    };
  }
}
