// Checagem do adapter emiteaí contra a API real (Node ≥ 23 lê .ts direto).
// Uso: node scripts/test-emiteai.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf-8").split("\n")) {
  const i = l.indexOf("=");
  if (i > 0 && !l.trim().startsWith("#"))
    process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim();
}

const { sliceRange, fetchNFeRecebidas } = await import("../lib/emiteai.ts");
const { verifyNFe } = await import("../lib/verify.ts");

// --- sliceRange: fatias ≤ 28 dias, contíguas, cobrindo o período ---
const s = sliceRange("2026-02-17", "2026-03-19"); // 31 dias: a janela que a API recusou
assert.equal(s.length, 2);
assert.equal(s[0][0], "2026-02-17T00:00:00");
assert.equal(s[0][1], "2026-03-17T00:00:00");
assert.equal(s[1][0], "2026-03-17T00:00:00");
assert.equal(s[1][1], "2026-03-20T00:00:00");
assert.deepEqual(sliceRange("2026-09-01", "2026-09-01"), [
  ["2026-09-01T00:00:00", "2026-09-02T00:00:00"],
]);
assert.deepEqual(sliceRange("2026-09-02", "2026-09-01"), []);
console.log("sliceRange ok");

// --- fetch real: Quedes, desde o início da retenção ---
const QUEDES = "13002532000100";
const t0 = Date.now();
const docs = await fetchNFeRecebidas(QUEDES, "2026-07-01", "2026-09-14");
console.log(
  `fetchNFeRecebidas: ${docs.length} NF-e em ${((Date.now() - t0) / 1000).toFixed(1)}s`,
);
assert.ok(docs.length >= 40, "esperava ≥ 40 NF-e (sonda encontrou 42)");
for (const d of docs) {
  const inf = d.nfeProc.NFe.infNFe;
  assert.equal(inf.dest.CNPJ, QUEDES);
  assert.match(d.nfeProc.protNFe.infProt.chNFe, /^\d{44}$/);
  assert.ok(inf.ide.dhEmi >= "2026-07-01" && inf.ide.dhEmi < "2026-09-15");
  assert.ok(
    inf.emit.enderEmit.UF && inf.total.ICMSTot.vNF,
    "campos do relatório",
  );
}

// --- regra de negócio intacta ---
const r = verifyNFe(docs, QUEDES);
console.log(
  `verifyNFe: ${r.dev.length} devoluções, ${r.cnpjAcor.length} em acordo, ${r.cnpjDesc.length} em desacordo`,
);
assert.ok(r.dev.length >= 30, "esperava ≥ 30 devoluções (sonda encontrou 33)");
assert.equal(r.dev.length, r.cnpjAcor.length + r.cnpjDesc.length);

// --- corte por emissão respeita o período pedido ---
const um = await fetchNFeRecebidas(QUEDES, "2026-09-01", "2026-09-05");
for (const d of um) {
  const e = d.nfeProc.NFe.infNFe.ide.dhEmi.slice(0, 10);
  assert.ok(e >= "2026-09-01" && e <= "2026-09-05", `fora do período: ${e}`);
}
console.log(`período 01–05/09: ${um.length} NF-e, todas dentro do intervalo`);
console.log("\nTUDO OK");
