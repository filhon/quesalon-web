// Checagem do seletor SIEG → Emite Aí contra as APIs reais (Node ≥ 23 lê .ts direto).
// Uso: node scripts/test-nfe-source.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf-8").split("\n")) {
  const i = l.indexOf("=");
  if (i > 0 && !l.trim().startsWith("#"))
    process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim();
}
const siegKey = process.env.SIEG_API_KEY;
assert.ok(siegKey, "SIEG_API_KEY ausente no .env.local");

const { fetchNFe } = await import("../lib/nfe-source.ts");
const QUEDES = "13002532000100";
const run = (label, preferred) =>
  fetchNFe(QUEDES, "2026-08-25", "2026-08-26", preferred).then((r) => {
    console.log(
      `${label}: source=${r.source} docs=${r.docs.length}${r.fallbackReason ? " fallback=" + r.fallbackReason.slice(0, 60) : ""}`,
    );
    return r;
  });

// 1. kill-switch: nem tenta o SIEG
process.env.NEXT_PUBLIC_NFE_SOURCE = "emiteai";
let r = await run("kill-switch");
assert.equal(r.source, "emiteai");
assert.equal(r.fallbackReason, undefined);
delete process.env.NEXT_PUBLIC_NFE_SOURCE;

// 1b. escolha manual do usuário: Emite Aí direto, sem passar pelo SIEG
r = await run("manual emiteai", "emiteai");
assert.equal(r.source, "emiteai");
assert.equal(r.fallbackReason, undefined);

// 2. SIEG saudável tem preferência
r = await run("sieg ok");
assert.equal(r.source, "sieg");

// 3. SIEG quebrado: cai para o Emite Aí com motivo, 3x seguidas...
process.env.SIEG_API_KEY = "chave-invalida";
for (let i = 1; i <= 3; i++) {
  r = await run(`sieg falha ${i}`);
  assert.equal(r.source, "emiteai");
  assert.ok(r.fallbackReason, "deveria informar o motivo do fallback");
  // paridade entre as fontes é assunto do paridade-sieg-emiteai.mjs, não daqui
  assert.ok(r.docs.length > 0, "Emite Aí não devolveu nada no período");
}

// 4. ...e a partir daí o breaker abre: Emite Aí direto, sem gastar tempo no SIEG
r = await run("breaker aberto");
assert.equal(r.source, "emiteai");
assert.equal(r.fallbackReason, undefined, "não deveria ter tentado o SIEG");

process.env.SIEG_API_KEY = siegKey;
console.log("\nTUDO OK");
