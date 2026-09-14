// Sonda a API emiteaí (homologação) para descobrir o que o swagger não diz:
// o formato do campo `payload`, se GET aceita body, e quais filtros funcionam.
// Uso: node scripts/probe-emiteai.mjs   (lê EMITEAI_TOKEN do .env.local)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { request } from "node:https";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")).trim(),
      l.slice(l.indexOf("=") + 1).trim(),
    ]),
);

const TOKEN = env.EMITEAI_TOKEN;
const HOST = env.EMITEAI_HOST ?? "homolog.api.emiteai.com.br";
if (!TOKEN) {
  console.error("Falta EMITEAI_TOKEN no .env.local");
  process.exit(1);
}

const OUT = "scripts/.probe-out";
mkdirSync(OUT, { recursive: true });

// node:https (não fetch) porque undici recusa body em GET e precisamos testar isso
function call(method, path, body) {
  return new Promise((resolve) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = request(
      {
        host: HOST,
        path,
        method,
        headers: {
          "x-token": TOKEN,
          Accept: "*/*",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf-8"),
          }),
        );
      },
    );
    req.on("error", (e) =>
      resolve({ status: 0, body: `ERRO REDE: ${e.message}` }),
    );
    if (payload) req.write(payload);
    req.end();
  });
}

let n = 0;
async function probe(label, method, path, body) {
  const r = await call(method, path, body);
  const file = `${OUT}/${String(++n).padStart(2, "0")}-${label.replace(/\W+/g, "-")}.txt`;
  writeFileSync(
    file,
    `${method} ${path}\n${body ? JSON.stringify(body) : ""}\n--- ${r.status}\n${r.body}`,
  );
  const ok = r.status >= 200 && r.status < 300;
  console.log(
    `${ok ? "OK " : "!! "} ${String(r.status).padEnd(3)} ${method} ${path}`,
  );
  console.log(`      ${r.body.slice(0, 220).replace(/\s+/g, " ")}`);
  return r;
}

const CNPJS = [
  "13002532000100",
  "04792134000143",
  "04792134000496",
  "08939548000103",
];
const hoje = new Date();
const dias = (d) =>
  new Date(hoje.getTime() - d * 864e5).toISOString().slice(0, 10);

console.log(`\n== 1. Token e cadastro das empresas (${HOST}) ==`);
for (const cnpj of CNPJS)
  await probe(`empresa-${cnpj}`, "GET", `/empresa/${cnpj}`);

console.log("\n== 2. Certificados digitais (pré-requisito da captação) ==");
for (const cnpj of CNPJS)
  await probe(`certificado-${cnpj}`, "GET", `/certificado/${cnpj}`);

console.log("\n== 3. /documento-recebido — como passar o filtro? ==");
const filtroData = {
  dataRecebimentoInicio: dias(30),
  dataRecebimentoFim: dias(0),
};
const filtroDataHora = {
  dataRecebimentoInicio: `${dias(30)}T00:00:00`,
  dataRecebimentoFim: `${dias(0)}T23:59:59`,
};
const tentativas = [
  ["get-body-data", "GET", "/documento-recebido", filtroData],
  ["get-body-datahora", "GET", "/documento-recebido", filtroDataHora],
  [
    "get-query",
    "GET",
    `/documento-recebido?dataRecebimentoInicio=${dias(30)}&dataRecebimentoFim=${dias(0)}`,
    undefined,
  ],
  ["get-sem-filtro", "GET", "/documento-recebido", {}],
  ["post-body-data", "POST", "/documento-recebido", filtroData],
];
let docs = null;
for (const [label, m, p, b] of tentativas) {
  const r = await probe(label, m, p, b);
  if (!docs && r.status >= 200 && r.status < 300) {
    try {
      const parsed = JSON.parse(r.body);
      if (Array.isArray(parsed) && parsed.length) docs = parsed;
    } catch {}
  }
}

if (!docs) {
  console.log(
    "\n(nenhum documento retornado — sem chave de acesso não dá pra sondar os passos 4 e 5)",
  );
} else {
  console.log(
    `\n== 4. Estrutura do documento (${docs.length} retornado(s)) ==`,
  );
  const d = docs[0];
  console.log("campos do documento:", Object.keys(d).join(", "));
  console.log("documentType:", d.documentType, "| chaveAcesso:", d.chaveAcesso);
  console.log(
    "payload é:",
    Array.isArray(d.payload) ? "array" : typeof d.payload,
  );
  if (d.payload && typeof d.payload === "object") {
    console.log("campos do payload:", Object.keys(d.payload).join(", "));
    // o que interessa: o XML bruto sobrevive? finNFe/NFref existem?
    const txt = JSON.stringify(d.payload);
    for (const campo of [
      "nfeProc",
      "xmlBase64",
      "xml",
      "finNFe",
      "NFref",
      "infNFe",
      "pdfBase64",
    ])
      console.log(`  contém "${campo}":`, txt.includes(campo));
  }
  writeFileSync(`${OUT}/documento-exemplo.json`, JSON.stringify(d, null, 2));
  console.log(`(documento completo em ${OUT}/documento-exemplo.json)`);

  const chave = docs.find((x) => x.chaveAcesso)?.chaveAcesso;
  if (chave) {
    console.log(`\n== 5. Consultas por chave (${chave}) ==`);
    await probe("nfe-status", "GET", `/nfe?chaveAcessoList=${chave}`);
    await probe("nfe-portal-sefaz", "GET", `/nfe/portal-sefaz/${chave}`);
  }
}

console.log(`\nRespostas completas em ${OUT}/`);
