export async function GET() {
  const secretKey = process.env.SIEG_API_KEY;

  const result: Record<string, unknown> = {
    envVars: {
      SIEG_API_KEY: secretKey ? `${secretKey.slice(0, 4)}...` : "MISSING",
    },
  };

  if (!secretKey) {
    return Response.json(
      { ...result, error: "Missing env vars" },
      { status: 500 },
    );
  }

  const clientId = process.env.SIEG_CLIENT_ID;
  result.envVars = {
    ...(result.envVars as object),
    SIEG_CLIENT_ID: clientId || "MISSING",
  };

  // Testa JWT com Client ID atual
  try {
    const jwtRes = await fetch("https://api.sieg.com/api/v1/create-jwt", {
      method: "POST",
      headers: { "X-Client-Id": clientId ?? "", "X-Secret-Key": secretKey },
    });
    const jwtBody = await jwtRes.text();
    result.jwt = {
      status: jwtRes.status,
      ok: jwtRes.ok,
      body: jwtBody.slice(0, 300),
    };
  } catch (err) {
    result.jwt = { error: err instanceof Error ? err.message : String(err) };
  }

  const testCnpj = "04792134000143"; // Quesalon PB
  const testPayloadBase = {
    XmlType: 1,
    Take: 3,
    Skip: 0,
    DataEmissaoInicio: "2025-01-01",
    DataEmissaoFim: "2025-12-31",
    Downloadevent: false,
  };

  // Testa sem CNPJ (retornou dados antes)
  try {
    const r = await fetch(
      `https://api.sieg.com/BaixarXmls?api_key=${secretKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayloadBase),
      },
    );
    const b = await r.text();
    const parsed = JSON.parse(b);
    result.semCnpj = {
      status: r.status,
      count: Array.isArray(parsed) ? parsed.length : parsed,
    };
  } catch (err) {
    result.semCnpj = { error: String(err) };
  }

  // Testa com CnpjDest
  try {
    const r = await fetch(
      `https://api.sieg.com/BaixarXmls?api_key=${secretKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...testPayloadBase, CnpjDest: testCnpj }),
      },
    );
    const b = await r.text();
    const parsed = JSON.parse(b);
    result.comCnpjDest = {
      status: r.status,
      count: Array.isArray(parsed) ? parsed.length : parsed,
    };
  } catch (err) {
    result.comCnpjDest = { error: String(err) };
  }

  // Testa com CnpjEmit
  try {
    const r = await fetch(
      `https://api.sieg.com/BaixarXmls?api_key=${secretKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...testPayloadBase, CnpjEmit: testCnpj }),
      },
    );
    const b = await r.text();
    const parsed = JSON.parse(b);
    result.comCnpjEmit = {
      status: r.status,
      count: Array.isArray(parsed) ? parsed.length : parsed,
    };
  } catch (err) {
    result.comCnpjEmit = { error: String(err) };
  }

  // Testa endpoint LEGADO com a chave antiga (SIEG_API_KEY_OLD)
  const oldKey = process.env.SIEG_API_KEY_OLD;
  if (oldKey) {
    try {
      const oldRes = await fetch(
        `https://api.sieg.com/BaixarXmls?api_key=${oldKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            XmlType: 1,
            Take: 1,
            Skip: 0,
            DataEmissaoInicio: "2025-01-01",
            DataEmissaoFim: "2025-01-31",
            Downloadevent: false,
          }),
        },
      );
      const oldBody = await oldRes.text();
      result.endpointLegadoChaveAntiga = {
        status: oldRes.status,
        ok: oldRes.ok,
        body: oldBody.slice(0, 300),
      };
    } catch (err) {
      result.endpointLegadoChaveAntiga = {
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Testa JWT com chave antiga como X-Secret-Key
    try {
      const jwtOldRes = await fetch("https://api.sieg.com/api/v1/create-jwt", {
        method: "POST",
        headers: { "X-Client-Id": clientId ?? "", "X-Secret-Key": oldKey },
      });
      const jwtOldBody = await jwtOldRes.text();
      result.jwtChaveAntiga = {
        status: jwtOldRes.status,
        ok: jwtOldRes.ok,
        body: jwtOldBody.slice(0, 300),
      };
    } catch (err) {
      result.jwtChaveAntiga = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Testa endpoint LEGADO com a chave atual
  try {
    const legacyRes = await fetch(
      `https://api.sieg.com/BaixarXmls?api_key=${secretKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          XmlType: 1,
          Take: 1,
          Skip: 0,
          DataEmissaoInicio: "2025-01-01",
          DataEmissaoFim: "2025-01-31",
          BaixarEventos: false,
        }),
      },
    );
    const legacyBody = await legacyRes.text();
    result.endpointLegado = {
      status: legacyRes.status,
      ok: legacyRes.ok,
      body: legacyBody.slice(0, 300),
    };
  } catch (err) {
    result.endpointLegado = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Testa endpoint NOVO v1 com chave como X-API-Key (sem JWT)
  try {
    const v1Res = await fetch("https://api.sieg.com/api/v1/baixar-xmls", {
      method: "POST",
      headers: {
        "X-API-Key": secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        TipoXml: 1,
        Take: 1,
        Skip: 0,
        DataEmissaoInicio: "2025-01-01",
        DataEmissaoFim: "2025-01-31",
        BaixarEventos: false,
      }),
    });
    const v1Body = await v1Res.text();
    result.endpointV1SemJwt = {
      status: v1Res.status,
      ok: v1Res.ok,
      body: v1Body.slice(0, 300),
    };
  } catch (err) {
    result.endpointV1SemJwt = {
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return Response.json(result);
}
