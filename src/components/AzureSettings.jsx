import React, { useEffect, useState } from "react";
import { Check, KeyRound, Trash2 } from "lucide-react";

export default function AzureSettings({ options, save }) {
  const [status, setStatus] = useState({ configured: false });
  const [region, setRegion] = useState("brazilsouth");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    window.jarvisDesktop
      ?.voice({ op: "azure-status" })
      .then((value) => {
        if (mounted) {
          setStatus(value);
          if (value.region) setRegion(value.region);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const request = async (op) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await window.jarvisDesktop.voice({ op, region, key });
      setStatus(result);
      setKey("");
      if (op === "azure-remove" && options.voiceEngine === "azure")
        await save({ voiceEngine: "neural" });
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="azure-settings" aria-label="Integracao Azure Speech">
      <h4>
        <KeyRound size={16} /> Azure Speech{" "}
        <small>
          {status.configured ? "Chave configurada" : "Nao conectado"}
        </small>
      </h4>
      <label className="setting-row">
        <span>Voz em portugues</span>
        <select
          aria-label="Voz Azure"
          value={options.azureVoice}
          onChange={(event) => save({ azureVoice: event.target.value })}
        >
          <option value="pt-BR-AntonioNeural">Antonio / PT-BR</option>
          <option value="pt-BR-CaioNeural">Caio / PT-BR</option>
        </select>
      </label>
      {window.jarvisDesktop?.voice ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            request("azure-save");
          }}
        >
          <label className="setting-row">
            <span>Regiao do recurso</span>
            <input
              aria-label="Regiao Azure"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              maxLength={40}
              required
            />
          </label>
          <label className="setting-row">
            <span>Chave do recurso</span>
            <input
              type="password"
              autoComplete="off"
              aria-label="Chave Azure Speech"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              maxLength={200}
              required
            />
          </label>
          <button className="secondary-button" disabled={busy || !key}>
            <Check size={16} /> Salvar chave protegida
          </button>
          {status.configured && (
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => request("azure-remove")}
            >
              <Trash2 size={16} /> Remover chave
            </button>
          )}
        </form>
      ) : (
        <p className="config-note">
          Configure a chave protegida no aplicativo. A previa aceita
          JARVIS_AZURE_REGION e JARVIS_AZURE_KEY no servidor local, nunca no
          navegador.
        </p>
      )}
      <p className="config-note">
        Sintese online opcional. Envia o texto da resposta a Microsoft e pode
        consumir cota paga. Nao e a voz oficial da dublagem; nao foi contratada
        nenhuma conta.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
