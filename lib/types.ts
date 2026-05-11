export interface NFeIde {
  finNFe: string;
  nNF: string;
  dhEmi: string;
  NFref?: { refNFe: string };
}

export interface NFeEmit {
  CNPJ: string;
  xNome: string;
  enderEmit: { xMun: string; UF: string };
}

export interface NFeTotal {
  ICMSTot: { vNF: string };
}

export interface NFeInfAdic {
  infCpl?: string;
  obsCont?: { xTexto: string } | Array<{ xTexto: string }>;
}

export interface NFeDoc {
  nfeProc: {
    NFe: {
      infNFe: {
        ide: NFeIde;
        emit: NFeEmit;
        dest: { CNPJ: string };
        total: NFeTotal;
        infAdic?: NFeInfAdic;
      };
    };
    protNFe: { infProt: { chNFe: string } };
  };
}

export interface VerificationResult {
  dev: NFeDoc[];
  notDev: NFeDoc[];
  cnpjAcor: NFeDoc[];
  cnpjDesc: NFeDoc[];
  log: string[];
}

export interface Company {
  label: string;
  cnpj: string;
}

export type XmlType = 1 | 2 | 3 | 4 | 5;

export interface VerificationHistoryEntry {
  id?: string;
  timestamp: number;
  userEmail: string;
  company: { label: string; cnpj: string };
  dateRange: { from: string; to: string };
  counts: {
    total: number;
    dev: number;
    notDev: number;
    cnpjAcor: number;
    cnpjDesc: number;
  };
}

export interface ReportHistoryEntry {
  id?: string;
  timestamp: number;
  userEmail: string;
  company: { label: string; cnpj: string };
  dateRange: { from: string; to: string };
  devCount: number;
}
