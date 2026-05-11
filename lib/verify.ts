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
    const chNFe = String(doc.nfeProc?.protNFe?.infProt?.chNFe ?? "");
    const cnpjDev = chNFe.length >= 20 ? chNFe.substring(6, 20) : chNFe;
    try {
      const nfRef = doc.nfeProc.NFe.infNFe.ide.NFref;
      // NFref pode ser objeto único ou array quando há múltiplas referências
      const refNFe = String(
        Array.isArray(nfRef) ? nfRef[0]?.refNFe : nfRef?.refNFe,
      );
      if (refNFe && refNFe !== "undefined") {
        const cnpjRef = refNFe.substring(6, 20);
        if (cnpjRef === cnpj) {
          cnpjAcor.push(doc);
          log.push(`✓ acordo: ${cnpjDev}`);
        } else {
          cnpjDesc.push(doc);
          log.push(`✗ desacordo: ${cnpjDev} (ref: ${cnpjRef} ≠ ${cnpj})`);
        }
      } else {
        cnpjDesc.push(doc);
        log.push(`✗ desacordo: ${cnpjDev} (sem nota referenciada)`);
      }
    } catch {
      cnpjDesc.push(doc);
      log.push(`⚠ atenção: ${cnpjDev}`);
    }
  }

  return { dev, notDev, cnpjAcor, cnpjDesc, log };
}
