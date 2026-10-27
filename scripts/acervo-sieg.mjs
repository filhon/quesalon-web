// Salva em disco o XML (procNFe) de todas as NF-e recebidas pelas empresas, enquanto o SIEG responde:
// a emiteaí só devolve o infNFe em JSON, sem assinatura nem protocolo, e não tem XML nem DANFE.
// O DANFE sai do XML depois, então não é baixado.
// Uso: node scripts/acervo-sieg.mjs [inicio=2021-10-01] [fim=2026-10-07]
//   → acervo-sieg/<cnpj>/<chave>.xml. Pode rodar de novo: retoma, pulando as janelas já
//   concluídas (listadas em acervo-sieg/<cnpj>/.feito)
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  appendFileSync,
} from "node:fs";

for (const l of readFileSync(".env.local", "utf-8").split("\n")) {
  const i = l.indexOf("=");
  if (i > 0 && !l.trim().startsWith("#"))
    process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim();
}
const { fetchSiegXmls } = await import("../lib/sieg.ts");
const { COMPANIES } = await import("../lib/constants.ts");

const [INI = "2021-10-01", FIM = "2026-10-07"] = process.argv.slice(2);
// janela curta: um 429 no meio da paginação refaz a janela inteira, e a Quesalon PB passa de
// 300 notas/mês
const SLICE_DAYS = 15;
const DAY_MS = 864e5;
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let total = 0;
const falhas = [];
for (const { label, cnpj } of COMPANIES) {
  const dir = `acervo-sieg/${cnpj}`;
  mkdirSync(dir, { recursive: true });
  const feitoFile = `${dir}/.feito`;
  const feito = new Set(
    existsSync(feitoFile) ? readFileSync(feitoFile, "utf-8").split("\n") : [],
  );
  let n = 0;
  for (
    let t = Date.parse(INI);
    t <= Date.parse(FIM);
    t += SLICE_DAYS * DAY_MS
  ) {
    const ini = isoDay(t);
    const fim = isoDay(
      Math.min(t + (SLICE_DAYS - 1) * DAY_MS, Date.parse(FIM)),
    );
    if (feito.has(`${ini}..${fim}`)) continue;
    let xmls;
    for (let tentativa = 1; ; tentativa++) {
      try {
        xmls = await fetchSiegXmls(cnpj, ini, fim);
        break;
      } catch (err) {
        // o fetchSiegXmls já espera 14 s em 429; aqui espera a janela de 1 min inteira.
        // Outros erros HTTP (400, 401…) não melhoram esperando
        if (tentativa === 8 || /SIEG API error (?!429)/.test(err.message)) {
          falhas.push(`${label} ${ini}..${fim}: ${err.message.slice(0, 80)}`);
          break;
        }
        console.log(
          `  ${ini}..${fim}: ${err.message.slice(0, 80)} — nova tentativa em 60 s`,
        );
        await sleep(60_000);
      }
    }
    if (!xmls) continue;
    for (const b64 of xmls) {
      const xml = Buffer.from(b64, "base64").toString("utf-8");
      const key = (xml.match(/<chNFe>(\d{44})<\/chNFe>/) ??
        xml.match(/Id="NFe(\d{44})"/))?.[1];
      if (!key) {
        console.log(`  XML sem chave em ${ini}..${fim}, ignorado`);
        continue;
      }
      writeFileSync(`${dir}/${key}.xml`, xml);
      n++;
    }
    appendFileSync(feitoFile, `${ini}..${fim}\n`);
    if (xmls.length) console.log(`  ${label} ${ini}..${fim}: ${xmls.length}`);
  }
  console.log(`${label} (${cnpj}): ${n} XML novos nesta execução`);
  total += n;
}
console.log(`\nTotal: ${total} XML em acervo-sieg/`);
if (falhas.length) {
  console.log(
    `\n${falhas.length} janela(s) falharam — rode de novo para retomar:`,
  );
  for (const f of falhas) console.log("  " + f);
  process.exitCode = 1;
}
