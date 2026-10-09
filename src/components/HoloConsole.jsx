import React from "react";
import {
  Mic,
  MicOff,
  MoreHorizontal,
  Square,
  Maximize2,
  MessageSquare,
  X,
  Activity,
  CloudSun,
  Cpu,
  ListTodo,
  Check,
  Brain,
} from "lucide-react";
import "./holo-console.css";
const STATES = {
  off: "Microfone desligado",
  loading: "Preparando escuta",
  listening: "Escuta local ativa",
  addressed: "Ouvindo seu pedido",
};
export default function HoloConsole({
  state,
  listenState,
  phase,
  level,
  start,
  stop,
  stopTask,
  menu,
  fullscreen,
  openChat,
  removeCard,
  openRuns,
  act,
}) {
  const pending = state.runs.find((run) => run.status === "planned");
  return (
    <section
      className="holo-console"
      aria-label="Jarvis por voz"
      style={{ "--voice-level": level }}
    >
      <div className="holo-top">
        <span className="holo-signature">DIEF / JARVIS</span>
        <div>
          <button
            className="icon-button"
            aria-label="Tela cheia"
            title="Tela cheia"
            onClick={fullscreen}
          >
            <Maximize2 size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Menu do Jarvis"
            title="Menu do Jarvis"
            onClick={menu}
          >
            <MoreHorizontal size={22} />
          </button>
        </div>
      </div>
      <aside className="holo-cards" aria-label="Dados na tela">
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
            <footer>
              Registrado pelo operador / {state.memories.length} memoria(s)
            </footer>
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
      <div className="holo-bottom">
        {pending && (
          <button className="holo-pending" onClick={openRuns}>
            Autorizacao necessaria <span>{pending.steps.length} etapa(s)</span>
          </button>
        )}
        <div className="holo-caption" aria-live="polite">
          {state.messages.at(-1)?.role === "jarvis"
            ? state.messages.at(-1).content
            : `Estou aqui, ${state.settings.name}.`}
        </div>
        <div className="holo-voice-controls">
          <button
            className="icon-button"
            aria-label="Interromper tarefa e fala"
            title="Interromper tarefa e fala"
            onClick={stopTask}
          >
            <Square size={17} />
          </button>
          <button
            className={`holo-mic ${listenState !== "off" ? "active" : ""}`}
            aria-label={
              listenState === "off"
                ? "Ativar escuta local"
                : "Desativar escuta local"
            }
            title={
              listenState === "off"
                ? "Ativar escuta local"
                : "Desativar escuta local"
            }
            aria-pressed={listenState !== "off"}
            onClick={listenState === "off" ? start : stop}
          >
            {listenState === "off" ? <Mic size={25} /> : <MicOff size={25} />}
          </button>
          <button
            className="icon-button"
            aria-label="Abrir conversa por texto"
            title="Abrir conversa por texto"
            onClick={openChat}
          >
            <MessageSquare size={18} />
          </button>
        </div>
        <span className="holo-listening-state">
          {["working", "speaking", "received"].includes(phase)
            ? phase === "speaking"
              ? "Jarvis falando"
              : "Atendendo seu pedido"
            : STATES[listenState]}
        </span>
      </div>
    </section>
  );
}
