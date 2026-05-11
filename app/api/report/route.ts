import ExcelJS from "exceljs";
import type { NFeDoc } from "@/lib/types";
import {
  requireAuth,
  unauthorizedResponse,
  AuthError,
} from "@/lib/auth-server";

const MAX_DOCS = 10_000;

const COLUMNS = [
  "cd_und",
  "emissao",
  "mes",
  "ano",
  "n_nfd",
  "n_nf",
  "valor_nf",
  "municipio",
  "uf",
  "estado",
  "regiao",
  "unidade",
  "cliente",
  "motivo",
  "situacao",
  "data_entrega",
  "status",
  "lead_time",
  "transportadoras",
  "ocorrencia",
  "chave_acesso",
  "obs",
] as const;

export async function POST(request: Request) {
  try {
    await requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) return unauthorizedResponse();
    return Response.json({ error: "Auth error" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { docs } = body as { docs: unknown };

    if (!Array.isArray(docs) || docs.length > MAX_DOCS) {
      return Response.json(
        { error: `docs must be an array of at most ${MAX_DOCS} items` },
        { status: 400 },
      );
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Relatório");

    sheet.columns = COLUMNS.map((key) => ({ header: key, key }));

    const devDocs = (docs as NFeDoc[]).filter(
      (doc) => doc.nfeProc.NFe.infNFe.ide.finNFe == "4",
    );

    for (const doc of devDocs) {
      const { ide, emit, dest, total, infAdic } = doc.nfeProc.NFe.infNFe;
      const { protNFe } = doc.nfeProc;

      const refNFe =
        ide.NFref?.refNFe != null ? String(ide.NFref.refNFe) : undefined;
      const uf = emit.enderEmit.UF;

      const cdUnd = dest.CNPJ && uf === "PB" ? 1 : 26;

      const emissao = ide.dhEmi.substring(0, 10).split("-").reverse().join("/");

      const [year, month] = ide.dhEmi.split("-");

      const motivo =
        infAdic?.infCpl ||
        (Array.isArray(infAdic?.obsCont)
          ? infAdic.obsCont[0]?.xTexto
          : infAdic?.obsCont?.xTexto) ||
        "";

      sheet.addRow({
        cd_und: cdUnd,
        emissao,
        mes: parseInt(month),
        ano: parseInt(year),
        n_nfd: parseInt(ide.nNF),
        n_nf: parseInt(refNFe?.substring(25, 34) ?? "0"),
        valor_nf: parseFloat(total.ICMSTot.vNF),
        municipio: emit.enderEmit.xMun,
        uf,
        estado: "",
        regiao: "",
        unidade: "",
        cliente: emit.xNome,
        motivo,
        situacao: "",
        data_entrega: "",
        status: "",
        lead_time: "",
        transportadoras: "",
        ocorrencia: "",
        chave_acesso: String(protNFe.infProt.chNFe),
        obs: "",
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="relatorio_quesalon.xlsx"',
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ error }, { status: 500 });
  }
}
