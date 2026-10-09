import React, { useRef, useState } from "react";
import {
  Workflow,
  Play,
  Square,
  RefreshCw,
  FolderOpen,
  X,
  Check,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { TOOLS } from "../core/tools.mjs";
import "./agent.css";

const statuses = {
  planning: "Planejando",
  planned: "Aguardando autorizacao",
  running: "Executando",
  completed: "Concluido",
  failed: "Falhou",
  cancelled: "Cancelado",
  interrupted: "Interrompido",
  pending: "Pendente",
};
const when = (at) => new Date(at).toLocaleString("pt-BR");
export default function AgentConsole({ state, request, native, confirm }) {
  const [goal, setGoal] = useState("");
  const [working, setWorking] = useState(false);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState(state.agent.model);
  const [error, setError] = useState("");
  const guard = useRef(false);
  const call = async (value, long = false) => {
    if (guard.current) return;
    guard.current = true;
    setWorking(true);
    setError("");
    try {
      return await request(value, long);
    } catch (problem) {
      setError(problem.message);
      return null;
    } finally {
      guard.current = false;
      setWorking(false);
    }
  };
  const active = state.runs.find((run) =>
    ["planning", "running"].includes(run.status),
  );
  return (
    <div className="agent-console">
      <div className="agent-setup">
        <section>
          <span className="eyebrow">PLANEJADOR</span>
          <strong>
            {state.agent.provider === "local"
              ? "Comandos locais"
              : `Ollama / ${state.agent.model}`}
          </strong>
          <div className="agent-config-row">
            <button
              className="secondary-button"
              disabled={working || !!active || !native}
              onClick={async () => {
                const result = await call({ op: "models" });
                if (result) {
                  setModels(result);
                  setModel(
                    result.includes(state.agent.model)
                      ? state.agent.model
                      : result[0] || "",
                  );
                }
              }}
            >
              <RefreshCw size={15} /> Detectar Ollama
            </button>
            {state.agent.provider !== "local" && (
              <button
                className="text-action"
                disabled={working || !!active}
                onClick={() => call({ op: "configure", provider: "local" })}
              >
                Usar local
              </button>
            )}
          </div>
          {!!models.length && (
            <div className="agent-config-row">
              <select
                aria-label="Modelo Ollama"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                {models.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
              <button
                className="primary-button"
                disabled={working || !!active || !model}
                onClick={() =>
                  confirm(
                    "Enviar pedidos, ultimas 8 mensagens e ate 20 memorias ao servico Ollama local?",
                    () => call({ op: "configure", provider: "ollama", model }),
                  )
                }
              >
                Conectar
              </button>
            </div>
          )}
          {!native && (
            <span className="small-label">
              Ollama e arquivos: disponiveis no EXE
            </span>
          )}
        </section>
        <section>
          <span className="eyebrow">PASTA AUTORIZADA</span>
          <strong className="workspace-path">
            {state.agent.workspace || "Nenhuma pasta selecionada"}
          </strong>
          <div className="agent-config-row">
            <button
              className="secondary-button"
              disabled={working || !!active || !native}
              onClick={() => call({ op: "workspace" })}
            >
              <FolderOpen size={15} /> Escolher pasta
            </button>
            {!!state.agent.workspace && (
              <button
                className="icon-button"
                title="Revogar pasta"
                aria-label="Revogar pasta"
                disabled={working || !!active}
                onClick={() => call({ op: "workspace", revoke: true })}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <span className="small-label">
            {state.settings.access.files
              ? "Arquivos autorizados"
              : "Arquivos desativados nos ajustes"}
          </span>
        </section>
      </div>
      <form
        className="agent-request"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await call({ op: "plan", goal: goal.trim() }, true);
          if (result) setGoal("");
        }}
      >
        <label htmlFor="agent-goal">Nova execucao</label>
        <textarea
          id="agent-goal"
          rows={3}
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          maxLength={4000}
          placeholder="O que voce quer fazer?"
          disabled={!!active}
        />
        <div className="agent-form-footer">
          <span className="small-label">
            {active
              ? statuses[active.status]
              : "Nenhuma acao executada antes da autorizacao"}
          </span>
          <button
            className="primary-button"
            disabled={working || !!active || !goal.trim()}
          >
            <Workflow size={16} /> Preparar plano
          </button>
        </div>
      </form>
      <details className="tool-catalog">
        <summary>
          Ferramentas <ChevronDown size={15} />
        </summary>
        {Object.entries(TOOLS).map(([key, tool]) => (
          <div key={key}>
            <span>{tool.title}</span>
            <code>{key}</code>
            <span className="small-label">
              {tool.native ? (native ? "EXE" : "Requer EXE") : "Local"}
            </span>
          </div>
        ))}
        <div className="agent-examples">
          {[
            "crie uma tarefa: revisar o projeto; mostre tarefas",
            "lembre que prefiro respostas curtas",
            "liste pasta",
            "pesquise documentacao Three.js",
            "crie arquivo notas.txt: Minhas anotacoes",
          ].map((example) => (
            <button
              key={example}
              className="text-action"
              disabled={!!active}
              onClick={() => setGoal(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </details>
      {error && (
        <div className="agent-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      <div className="agent-history" aria-live="polite">
        {!state.runs.length && (
          <div className="empty-state">
            <Workflow size={30} />
            <strong>Nenhuma execucao registrada</strong>
          </div>
        )}
        {state.runs.map((run) => (
          <article className={`agent-run ${run.status}`} key={run.id}>
            <header>
              <div>
                <span className={`run-status ${run.status}`}>
                  {statuses[run.status]}
                </span>
                <time dateTime={run.createdAt}>{when(run.createdAt)}</time>
              </div>
              <span className="small-label">
                {run.provider === "local" ? "Local" : "Ollama"}
              </span>
            </header>
            <h2>{run.goal}</h2>
            {run.summary && <p className="run-summary">{run.summary}</p>}
            <ol>
              {run.steps.map((step, index) => (
                <li key={index} className={step.status}>
                  <span className="step-number">
                    {step.status === "completed" ? (
                      <Check size={14} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <div className="step-title">
                      <strong>{TOOLS[step.tool].title}</strong>
                      <span>{statuses[step.status]}</span>
                    </div>
                    <pre className="step-args">
                      {JSON.stringify(step.args, null, 2)}
                    </pre>
                    {step.output && (
                      <details
                        className="step-output"
                        open={step.status !== "completed"}
                      >
                        <summary>
                          Resultado <ChevronDown size={13} />
                        </summary>
                        <pre>{step.output}</pre>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {run.error && (
              <p className="agent-error">
                <AlertTriangle size={15} />
                <span>{run.error}</span>
              </p>
            )}
            {["planned", "planning", "running"].includes(run.status) && (
              <footer>
                {run.status === "planned" && (
                  <button
                    className="primary-button"
                    disabled={working || !!active}
                    onClick={() =>
                      confirm(
                        "Autorizar todas as etapas deste plano? Confira os caminhos e argumentos. Acoes ja concluidas nao sao desfeitas ao cancelar.",
                        () => call({ op: "run", id: run.id }, true),
                      )
                    }
                  >
                    <Play size={15} /> Autorizar e executar
                  </button>
                )}
                <button
                  className="secondary-button"
                  onClick={async () => {
                    try {
                      await request({ op: "cancel", id: run.id });
                    } catch (problem) {
                      setError(problem.message);
                    }
                  }}
                >
                  <Square size={14} />{" "}
                  {run.status === "planned" ? "Cancelar plano" : "Interromper"}
                </button>
              </footer>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
