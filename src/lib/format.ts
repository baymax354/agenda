const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(value: number | string): string {
  return money.format(Number(value)).replace(/\u00a0/g, " ");
}

export const TZ = "America/Sao_Paulo";

export function formatLongDate(iso: string, timeZone = TZ): string {
  const s = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTime(iso: string, timeZone = TZ): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function formatDayMonth(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(".", "")
    .replace(" de ", " ");
}

export function formatWeekdayShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const s = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatFullDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const AUTH_MESSAGES: [RegExp, string][] = [
  [/password is known to be weak/i, "Essa senha é muito comum e fácil de adivinhar. Escolha outra."],
  [/password should be at least/i, "A senha precisa ter pelo menos 6 caracteres."],
  [/email rate limit exceeded|over_email_send_rate_limit/i, "Muitos e-mails enviados agora. Aguarde alguns minutos e tente de novo."],
  [/for security purposes, you can only request this after/i, "Aguarde alguns segundos antes de pedir outro e-mail."],
  [/unable to validate email address|invalid format/i, "E-mail inválido."],
];

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message: string }).message);
    return AUTH_MESSAGES.find(([re]) => re.test(msg))?.[1] ?? msg;
  }
  return "Algo deu errado. Tente novamente.";
}
