/**
 * Datas comemorativas brasileiras relevantes para sugestões de campanhas.
 * Lista estática — pode evoluir para algoritmos (Páscoa, Carnaval) no futuro.
 *
 * Formato: "MM-DD" → rótulo curto.
 */

const FIXAS: Record<string, string> = {
  "01-01": "Ano Novo",
  "01-06": "Dia de Reis",
  "02-14": "Dia dos Namorados (internacional)",
  "03-08": "Dia Internacional da Mulher",
  "03-15": "Dia do Consumidor",
  "04-21": "Tiradentes",
  "04-22": "Descobrimento do Brasil",
  "05-01": "Dia do Trabalho",
  "06-12": "Dia dos Namorados",
  "06-24": "São João",
  "07-20": "Dia do Amigo",
  "09-07": "Independência do Brasil",
  "09-15": "Dia do Cliente",
  "10-12": "Dia das Crianças / N. Sra. Aparecida",
  "10-15": "Dia do Professor",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Consciência Negra",
  "12-24": "Véspera de Natal",
  "12-25": "Natal",
  "12-31": "Réveillon",
};

/** Datas móveis aproximadas — atualizar anualmente quando necessário. */
const MOVEIS: Record<string, string> = {
  // 2025
  "2025-08-10": "Dia dos Pais",
  "2025-05-11": "Dia das Mães",
  "2025-11-28": "Black Friday",
  "2025-06-19": "Corpus Christi",
  "2025-03-04": "Carnaval",
  "2025-04-20": "Páscoa",
  // 2026
  "2026-08-09": "Dia dos Pais",
  "2026-05-10": "Dia das Mães",
  "2026-11-27": "Black Friday",
  "2026-06-04": "Corpus Christi",
  "2026-02-17": "Carnaval",
  "2026-04-05": "Páscoa",
  // 2027
  "2027-08-08": "Dia dos Pais",
  "2027-05-09": "Dia das Mães",
  "2027-11-26": "Black Friday",
};

export function dataEspecialDeHoje(d: Date = new Date()): string | null {
  const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
  if (MOVEIS[iso]) return MOVEIS[iso];
  const mmdd = iso.slice(5);
  return FIXAS[mmdd] ?? null;
}

export function proximaDataEspecial(
  d: Date = new Date(),
  janelaDias = 14,
): { rotulo: string; emDias: number } | null {
  for (let i = 1; i <= janelaDias; i++) {
    const futura = new Date(d);
    futura.setDate(d.getDate() + i);
    const r = dataEspecialDeHoje(futura);
    if (r) return { rotulo: r, emDias: i };
  }
  return null;
}
