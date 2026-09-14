// Paridade SIEG × emiteaí para o mesmo CNPJ/período — rodar durante a convivência até o corte.
// Uso: node scripts/paridade-sieg-emiteai.mjs [cnpj] [inicio] [fim]
import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf-8").split("\n")) {
  const i = l.indexOf("=");
  if (i > 0) process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim();
}
const { fetchNFeRecebidas } = await import("../lib/emiteai.ts");
const { decodeLote } = await import("../lib/decode.ts");

const [
  CNPJ = "13002532000100",
  INI = "2026-07-01",
  FIM = new Date().toISOString().slice(0, 10),
] = process.argv.slice(2);

// SIEG (lógica antiga)
const sieg = [];
for (let skip = 0; ; skip += 50) {
  const res = await fetch(
    `https://api.sieg.com/BaixarXmls?api_key=${process.env.SIEG_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        XmlType: 1,
        Take: 50,
        Skip: skip,
        DataEmissaoInicio: INI,
        DataEmissaoFim: FIM,
        CnpjDest: CNPJ,
        Downloadevent: false,
      }),
    },
  );
  if (!res.ok) {
    console.log("SIEG erro", res.status, (await res.text()).slice(0, 200));
    break;
  }
  const raw = await res.json();
  const page = Array.isArray(raw) ? raw : JSON.parse(raw);
  sieg.push(...page);
  if (page.length < 50) break;
}
const siegDocs = decodeLote(sieg);
const emDocs = await fetchNFeRecebidas(CNPJ, INI, FIM);

const key = (d) => String(d.nfeProc.protNFe.infProt.chNFe);
const info = (d) =>
  `${d.nfeProc.NFe.infNFe.ide.dhEmi.slice(0, 10)} fin=${d.nfeProc.NFe.infNFe.ide.finNFe} nNF=${d.nfeProc.NFe.infNFe.ide.nNF} emit=${d.nfeProc.NFe.infNFe.emit.CNPJ}`;
const S = new Map(siegDocs.map((d) => [key(d), d])),
  E = new Map(emDocs.map((d) => [key(d), d]));
console.log(
  `SIEG: ${S.size} NF-e | emiteaí: ${E.size} NF-e | em comum: ${[...S.keys()].filter((k) => E.has(k)).length}`,
);
const soS = [...S.keys()].filter((k) => !E.has(k)),
  soE = [...E.keys()].filter((k) => !S.has(k));
console.log(`\nSó no SIEG (${soS.length}):`);
for (const k of soS) console.log("  ", k, info(S.get(k)));
console.log(`\nSó na emiteaí (${soE.length}):`);
for (const k of soE) console.log("  ", k, info(E.get(k)));
const devS = siegDocs.filter(
    (d) => d.nfeProc.NFe.infNFe.ide.finNFe == "4",
  ).length,
  devE = emDocs.filter((d) => d.nfeProc.NFe.infNFe.ide.finNFe == "4").length;
console.log(`\nDevoluções: SIEG ${devS} | emiteaí ${devE}`);
