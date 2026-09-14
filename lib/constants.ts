import type { Company } from "./types";

export const COMPANIES: Company[] = [
  { label: "Quedes AL", cnpj: "13002532000100" },
  { label: "Quesalon PB", cnpj: "04792134000143" },
  { label: "Quesalon MG", cnpj: "04792134000496" },
  { label: "INFAN", cnpj: "08939548000103" },
];

export const SIEG_EMAIL = process.env.SIEG_EMAIL ?? "";
export const SIEG_API_KEY = process.env.SIEG_API_KEY ?? "";

/** SIEG desligado de vez: só Emite Aí, e os serviços exclusivos do SIEG (XML/DANFE) somem da UI. */
export const NFE_KILL_SWITCH = process.env.NEXT_PUBLIC_NFE_SOURCE === "emiteai";
