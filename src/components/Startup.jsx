import React, { useEffect, useRef, useState } from "react";
import { Aperture, Check, Download, RotateCw, X } from "lucide-react";
export default function Startup({ status, progress, request, error }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [localError, setError] = useState("");
  const [model, setModel] = useState("");
  useEffect(() => {
    dialog.current.showModal();
    return () => dialog.current?.close();
  }, []);
  const run = async (value) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request(value);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="modal startup-dialog"
      aria-label="Preparacao inicial do Jarvis"
      onCancel={(event) => event.preventDefault()}
    >
      <header>
        <h2>
          <Aperture size={22} /> Preparacao do Jarvis
        </h2>
        <button
          className="icon-button"
          aria-label="Sair do Jarvis"
          onClick={() => request({ op: "exit" })}
        >
          <X size={17} />
        </button>
      </header>
      <div className="startup-items">
        {status?.clone?.required && (
          <div>
            <span>Voz de referencia / XTTS</span>
            <strong>
              {status.clone.ready ? (
                <Check size={16} />
              ) : (
                "Preparacao local necessaria"
              )}
            </strong>
          </div>
        )}
        <div>
          <span>Voz e reconhecimento local</span>
          <strong>
            {status?.components.ready ? <Check size={16} /> : "167 MB"}
          </strong>
          <button
            className="secondary-button"
            disabled={busy || !status || status.components.ready}
            onClick={() => run({ op: "voice" })}
          >
            <Download size={15} /> Preparar
          </button>
        </div>
        <div>
          <span>Ollama / runtime da IA</span>
          <strong>
            {status?.brain.running ? <Check size={16} /> : "1,58 GB"}
          </strong>
          <button
            className="secondary-button"
            disabled={busy || !status || status.brain.running}
            onClick={() => run({ op: "ollama" })}
          >
            <Download size={15} /> Instalar
          </button>
        </div>
        <div>
          <span>Modelo local qwen3:1.7b</span>
          <strong>
            {status?.brain.selected ? <Check size={16} /> : "~1,4 GB"}
          </strong>
          <button
            className="secondary-button"
            disabled={busy || !status?.brain.running}
            onClick={() => run({ op: "model" })}
          >
            <Download size={15} /> Preparar
          </button>
        </div>
        <div>
          <span>Executor do Windows</span>
          <strong>
            {status?.desktop.ready ? (
              <Check size={16} />
            ) : status ? (
              "Reinstale o aplicativo"
            ) : (
              "Verificando"
            )}
          </strong>
        </div>
      </div>
      {!!status?.brain.models.length && (
        <div className="agent-config-row">
          <select
            aria-label="Modelo instalado"
            value={model || status.brain.models[0]}
            onChange={(event) => setModel(event.target.value)}
          >
            {status.brain.models.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <button
            className="primary-button"
            disabled={busy}
            onClick={() =>
              run({ op: "connect", model: model || status.brain.models[0] })
            }
          >
            Conectar modelo
          </button>
        </div>
      )}
      {progress && (
        <div className="startup-progress">
          <span>{progress.name}</span>
          <progress max={progress.total || 1} value={progress.received || 0} />
          <small>
            {progress.total > 0
              ? `${Math.min(100, Math.round((progress.received / progress.total) * 100))}%`
              : "Preparando"}
          </small>
        </div>
      )}
      <p className="modal-copy">
        Os componentes ausentes precisam ser preparados antes de usar o
        assistente. Downloads sao verificados. Microfone e acessos ao PC exigem
        autorizacao separada; UAC nunca e aceito automaticamente.
      </p>
      {status && !status.brain.running && (
        <p className="modal-copy">
          Apos instalar, abra o Ollama e clique em Verificar novamente. O modelo
          precisa estar disponivel no servico local.
        </p>
      )}
      {status?.memoryGB < 8 && (
        <p className="agent-error">
          Menos de 8 GB de RAM detectados. O modelo sugerido pode ficar lento;
          escolha um modelo menor ja instalado.
        </p>
      )}
      {(error || localError) && (
        <p className="agent-error" role="alert">
          {localError || error}
        </p>
      )}
      <div className="modal-actions">
        <button
          className="secondary-button"
          disabled={!busy}
          onClick={() => request({ op: "cancel" })}
        >
          Cancelar preparo
        </button>
        <button
          className="primary-button"
          disabled={busy}
          onClick={() => run({ op: "status" })}
        >
          <RotateCw size={15} /> Verificar novamente
        </button>
      </div>
    </dialog>
  );
}
