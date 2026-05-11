import type { NFeDoc, VerificationResult } from "./types";

export function verifyNFe(docs: NFeDoc[], cnpj: string): VerificationResult {
  const dev: NFeDoc[] = [];
  const notDev: NFeDoc[] = [];
  const cnpjAcor: NFeDoc[] = [];
  const cnpjDesc: NFeDoc[] = [];
  const log: string[] = [];

  for (const doc of docs) {
    const finNFe = doc.nfeProc?.NFe?.infNFe?.ide?.finNFe;
    if (String(finNFe) === "4") {
      dev.push(doc);
    } else {
      notDev.push(doc);
    }
  }

  for (const doc of dev) {
    const chNFe = doc.nfeProc?.protNFe?.infProt?.chNFe ?? "(sem chave)";
    try {
      const refNFe = doc.nfeProc.NFe.infNFe.ide.NFref?.refNFe;
      if (refNFe) {
        const cnpjRef = refNFe.substring(6, 20);
        if (cnpjRef === cnpj) {
          cnpjAcor.push(doc);
          log.push(`✓ acordo: ${chNFe}`);
        } else {
          cnpjDesc.push(doc);
          log.push(`✗ desacordo: ${chNFe}`);
        }
      } else {
        cnpjDesc.push(doc);
        log.push(`✗ desacordo: ${chNFe}`);
      }
    } catch {
      cnpjDesc.push(doc);
      log.push(`⚠ atenção: ${chNFe}`);
    }
  }

  return { dev, notDev, cnpjAcor, cnpjDesc, log };
}
