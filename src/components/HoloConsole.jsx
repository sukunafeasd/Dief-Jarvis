import React from "react";
import {
  X,
  Activity,
  CloudSun,
  Cpu,
  ListTodo,
  Check,
  Brain,
} from "lucide-react";
import "./holo-console.css";
export default function HoloConsole({
  state,
  removeCard,
  openRuns,
  act,
  panelContent,
}) {
  const pending = state.runs.find((run) => run.status === "planned");
  return (
    <section className="holo-console" aria-label="Jarvis por voz">
      <aside className="holo-cards" aria-label="Dados na tela">
        {state.panels
          .filter((key) => !["tasks", "memory"].includes(key))
          .map((key) => (
            <article className="holo-data holo-task-data" key={key}>
              <header>
                <span>
                  {
                    {
                      audit: "Auditoria",
                      briefing: "Meu dia",
                      connections: "Conexoes",
                      settings: "Ajustes",
                    }[key]
                  }
                </span>
                <button
                  className="icon-button"
                  aria-label={`Fechar ${key}`}
                  title="Fechar"
                  onClick={() => act({ type: "screen.close", panel: key })}
                >
                  <X size={14} />
                </button>
              </header>
              <div className="holo-panel-content">{panelContent(key)}</div>
            </article>
          ))}
        {state.panels.includes("tasks") && (
          <article className="holo-data holo-task-data">
            <header>
              <ListTodo size={18} />
              <span>Minhas tarefas</span>
              <button
                className="icon-button"
                title="Fechar tarefas"
                aria-label="Fechar tarefas"
                onClick={() => act({ type: "screen.close", panel: "tasks" })}
              >
                <X size={13} />
              </button>
            </header>
            {!state.tasks.some((task) => !task.done) && (
              <p>Nenhuma tarefa pendente.</p>
            )}
            <ul>
              {state.tasks
                .filter((task) => !task.done)
                .slice(0, 5)
                .map((task) => (
                  <li key={task.id}>
                    <button
                      className="icon-button"
                      aria-label={`Concluir ${task.text}`}
                      title="Concluir tarefa"
                      onClick={() => act({ type: "task.toggle", id: task.id })}
                    >
                      <Check size={14} />
                    </button>
                    <span>{task.text}</span>
                  </li>
                ))}
            </ul>
            <footer>
              {state.tasks.filter((task) => !task.done).length} pendente(s) /
              dados locais
            </footer>
          </article>
        )}
        {state.panels.includes("memory") && (
          <article className="holo-data holo-task-data">
            <header>
              <Brain size={18} />
              <span>Memorias locais</span>
              <button
                className="icon-button"
                title="Fechar memoria"
                aria-label="Fechar memoria"
                onClick={() => act({ type: "screen.close", panel: "memory" })}
              >
                <X size={13} />
              </button>
            </header>
            {state.memories.length ? (
              <ul>
                {state.memories.slice(0, 3).map((memory) => (
                  <li key={memory.id}>
                    <span>{memory.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma memoria guardada.</p>
            )}
            <footer>Nucleo local / {state.memories.length} memoria(s)</footer>
          </article>
        )}
        {state.cards.map((card) => {
          const weather = card.source.startsWith("Open-Meteo"),
            Icon = weather ? CloudSun : card.unit ? Activity : Cpu;
          return (
            <article className="holo-data" key={card.id}>
              <header>
                <Icon size={18} />
                <span>{card.title}</span>
                <button
                  className="icon-button"
                  aria-label={`Fechar ${card.title}`}
                  title="Fechar dado"
                  onClick={() => removeCard(card.id)}
                >
                  <X size={13} />
                </button>
              </header>
              <div
                className={`holo-data-value ${card.value.length > 20 ? "long" : ""}`}
              >
                {card.value}
                <small>{card.unit === "C" ? "°C" : card.unit}</small>
              </div>
              <footer>
                <time dateTime={card.at}>
                  {new Date(card.at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <span title={card.source}>
                  {weather ? "Open-Meteo" : card.source}
                </span>
              </footer>
            </article>
          );
        })}
      </aside>
      {pending && (
        <div className="holo-authorization">
          <button className="holo-pending" onClick={openRuns}>
            Autorizacao necessaria <span>{pending.steps.length} etapa(s)</span>
          </button>
        </div>
      )}
    </section>
  );
}
