import React, { useEffect } from "react";
import {
  X,
  Pin,
  PinOff,
  Check,
  ListTodo,
  CloudSun,
  Newspaper,
  Activity,
  Cpu,
  Brain,
} from "lucide-react";
import {
  presentationFor,
  spokenItem,
  availableTopics,
} from "../core/presentation.mjs";
const TopicGlyph = React.lazy(() => import("./TopicGlyph.jsx"));
import "./holo-console.css";
const icons = {
  tasks: ListTodo,
  weather: CloudSun,
  news: Newspaper,
  activity: Activity,
  status: Cpu,
  memory: Brain,
};
const names = {
  tasks: "Tarefas",
  weather: "Clima",
  news: "Noticias",
  activity: "Atividade",
  status: "Sistema",
  memory: "Memoria",
};
export default function HoloConsole({
  state,
  selected,
  setSelected,
  act,
  openRuns,
  removeCard,
  panelContent,
  segment,
  phase,
  level,
}) {
  const lastRequest = state.messages
    .filter((message) => message.role === "user")
    .at(-1)?.id;
  useEffect(() => {
    setSelected(null);
  }, [lastRequest, setSelected]);
  const deck = presentationFor(state, selected);
  const cursor = phase === "speaking" ? spokenItem(deck, segment) : -1;
  const pending = state.runs.find((run) => run.status === "planned");
  const pinned = deck && (state.pins || []).includes(deck.topic);
  const topics = availableTopics(state);
  const close = async () => {
    setSelected(null);
    if (pinned)
      await act({ type: "screen.pin", topic: deck.topic, value: false });
    if (["tasks", "memory"].includes(deck.topic))
      act({ type: "screen.close", panel: deck.topic });
    else deck.items.forEach((item) => removeCard(item.id));
  };
  return (
    <section
      className={`holo-console ${deck ? "presenting" : ""}`}
      aria-label="Jarvis por voz"
    >
      {(topics.length > 1 || !!state.pins?.length) && (
        <nav className="pinned-topics" aria-label="Topicos da central">
          {topics.map((topic) => {
            const Icon = icons[topic];
            return (
              <button
                key={topic}
                title={names[topic]}
                aria-label={`Mostrar ${names[topic]}${state.pins.includes(topic) ? " fixado" : ""}`}
                aria-pressed={deck?.topic === topic}
                onClick={() => setSelected(topic)}
              >
                <Icon size={16} />
                <span>{names[topic]}</span>
              </button>
            );
          })}
        </nav>
      )}
      <aside
        className={`holo-cards ${deck ? "presentation-panel" : ""}`}
        aria-label="Dados na tela"
      >
        {deck && (
          <section
            className={`topic-stage topic-${deck.topic}`}
            key={deck.key}
            data-topic={deck.topic}
          >
            <header className="topic-heading">
              <div>
                <span className="eyebrow">
                  DIEF / {names[deck.topic].toUpperCase()}
                </span>
                <h2>{deck.title}</h2>
              </div>
              <div>
                <button
                  className="icon-button"
                  title={pinned ? "Desfixar topico" : "Fixar topico"}
                  aria-label={pinned ? "Desfixar topico" : "Fixar topico"}
                  onClick={() =>
                    act({
                      type: "screen.pin",
                      topic: deck.topic,
                      value: !pinned,
                    })
                  }
                >
                  {pinned ? <PinOff size={17} /> : <Pin size={17} />}
                </button>
                <button
                  className="icon-button"
                  title="Fechar informacoes"
                  aria-label={
                    deck.topic === "tasks"
                      ? "Fechar tarefas"
                      : `Fechar ${names[deck.topic]}`
                  }
                  onClick={close}
                >
                  <X size={17} />
                </button>
              </div>
            </header>
            <React.Suspense fallback={null}>
              <TopicGlyph
                topic={deck.scene}
                theme={state.settings.theme}
                motion={state.settings.motion}
                motionMode={state.settings.motionMode}
                level={level}
              />
            </React.Suspense>
            {!deck.items.length && (
              <p className="topic-empty">
                {deck.topic === "tasks"
                  ? "Nenhuma tarefa registrada."
                  : deck.topic === "memory"
                    ? "Nenhuma memoria registrada."
                    : "Nenhum dado consultado para este topico."}
              </p>
            )}
            <div className="topic-list">
              {deck.items.map((item, index) => (
                <article
                  key={item.id}
                  className={`holo-data ${deck.topic === "tasks" ? "holo-task-data" : ""} ${cursor === index ? "narrated" : ""} ${item.done ? "done" : ""}`}
                  style={{ "--item-order": Math.min(index, 8) }}
                  aria-current={cursor === index ? "true" : undefined}
                >
                  <header>
                    {deck.topic === "tasks" && (
                      <button
                        className="task-check"
                        aria-label={`${item.done ? "Reabrir" : "Concluir"} ${item.title}`}
                        onClick={() =>
                          act({ type: "task.toggle", id: item.id })
                        }
                      >
                        {item.done && <Check size={15} />}
                      </button>
                    )}
                    <span>{item.title}</span>
                    {!["tasks", "memory"].includes(deck.topic) && (
                      <button
                        className="icon-button"
                        title="Retirar dado"
                        aria-label={`Fechar ${item.title}`}
                        onClick={() => removeCard(item.id)}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </header>
                  {item.value && (
                    <div
                      className={`holo-data-value ${item.value.length > 20 ? "long" : ""}`}
                    >
                      {item.value}
                      <small>{item.unit}</small>
                    </div>
                  )}
                  <footer>
                    <time dateTime={item.at}>
                      {item.at && !Number.isNaN(Date.parse(item.at))
                        ? new Date(item.at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Horario nao informado"}
                    </time>
                    <span title={item.source}>
                      {item.source?.startsWith("Open-Meteo")
                        ? "Open-Meteo"
                        : item.source}
                    </span>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        )}
        {state.panels
          .filter((key) => !["tasks", "memory"].includes(key))
          .map((key) => (
            <article className="holo-data" key={key}>
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
