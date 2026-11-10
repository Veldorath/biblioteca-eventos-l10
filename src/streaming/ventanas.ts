const MINUTO_MS = 60_000;
const VENTANA_MS = 5 * MINUTO_MS;

export const minutoDe = (emitidoEn: string): string =>
  new Date(Math.floor(Date.parse(emitidoEn) / MINUTO_MS) * MINUTO_MS).toISOString();

export const ventanaDe5MinutosDe = (emitidoEn: string): string =>
  new Date(Math.floor(Date.parse(emitidoEn) / VENTANA_MS) * VENTANA_MS).toISOString();