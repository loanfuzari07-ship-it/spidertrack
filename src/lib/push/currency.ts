import "server-only";

/**
 * Conversão de moeda pra reais, usada nas notificações push de venda
 * aprovada — não importa se a oferta roda em dólar, euro, libra etc., o
 * valor mostrado é sempre em BRL.
 *
 * Cotação vem da AwesomeAPI (economia.awesomeapi.com.br), gratuita e sem
 * chave. Cache em memória de 10 min evita bater na API a cada venda — numa
 * rajada de vendas na mesma moeda, só a primeira busca a cotação.
 */

interface RateCache {
  rate: number;
  at: number;
}

const cache = new Map<string, RateCache>();
const TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

// Só entra em jogo se a AwesomeAPI estiver fora do ar (rede caiu, etc.) —
// números redondos e conservadores, só pra notificação não travar. A
// cotação de verdade vem da API acima em praticamente todos os casos.
const FALLBACK_RATES: Record<string, number> = {
  USD: 5.3,
  EUR: 5.7,
  GBP: 6.6,
  CAD: 3.9,
  AUD: 3.5,
};

async function fetchRate(from: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(
      `https://economia.awesomeapi.com.br/json/last/${from}-BRL`,
      { signal: controller.signal, cache: "no-store" },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { bid?: string }>;
    const bid = data[`${from}BRL`]?.bid;
    const rate = bid ? Number(bid) : NaN;
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/**
 * Converte um valor pra reais, a partir da moeda que a plataforma de venda
 * mandou no webhook. Já em BRL (o caso mais comum) → devolve como está, sem
 * nenhuma chamada de rede. Qualquer outra moeda → busca a cotação do dia
 * (com cache curto) e converte; se a API falhar, usa uma cotação de
 * emergência aproximada — só pra não travar a notificação.
 */
export async function convertToBRL(
  amount: number,
  currency: string | null | undefined,
): Promise<number> {
  if (!amount || !Number.isFinite(amount)) return 0;

  const code = (currency ?? "BRL").trim().toUpperCase();
  if (code === "" || code === "BRL") return amount;

  const cached = cache.get(code);
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) {
    return amount * cached.rate;
  }

  const rate = (await fetchRate(code)) ?? FALLBACK_RATES[code] ?? null;
  if (rate == null) {
    // Moeda desconhecida e a API está fora do ar: não dá pra inventar uma
    // cotação, então devolve o valor original sem converter (melhor um
    // número "estranho" e óbvio do que um número errado que parece certo).
    return amount;
  }

  cache.set(code, { rate, at: now });
  return amount * rate;
}
