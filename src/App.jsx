import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Aperture,
  MessageSquare,
  ListTodo,
  Brain,
  ShieldCheck,
  Plug,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowUp,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Plus,
  Check,
  Trash2,
  Clock3,
  Search,
  RotateCw,
  Pause,
  Play,
  LockKeyhole,
  MoreHorizontal,
} from "lucide-react";
import { JarvisEngine } from "./core/engine.mjs";
import { browserStorage } from "./core/storage.mjs";
import { PANELS, initialState, verifyAudit } from "./core/model.mjs";
import { VoiceChannel } from "./voice.mjs";
import Settings from "./components/Settings.jsx";
import AgentConsole from "./components/AgentConsole.jsx";
import HoloConsole from "./components/HoloConsole.jsx";
import Startup from "./components/Startup.jsx";
import { WakeListener } from "./wake-listener.mjs";
import { AssistantSession } from "./core/assistant.mjs";
import { AgentController } from "./core/agent.mjs";
import "./core-effects.css";

const NAV = [
  ["central", Aperture, "Holograma"],
  ["conversation", MessageSquare, "Entrada por texto"],
  ["tasks", ListTodo, "Tarefas"],
  ["memory", Brain, "Nucleo e registros"],
  ["connections", Plug, "Conexoes"],
  ["settings", SlidersHorizontal, "Ajustes"],
];
const ACTION_NAMES = {
  "screen.open": "Painel aberto",
  "screen.close": "Painel fechado",
  "screen.view": "Vista alterada",
  "screen.move": "Painel reorganizado",
  "screen.focus": "Modo foco",
  "screen.restore": "Central restaurada",
  "task.create": "Tarefa criada",
  "task.toggle": "Tarefa atualizada",
  "task.remove": "Tarefa excluida",
  "memory.create": "Memoria guardada",
  "memory.remove": "Memoria esquecida",
  "memory.read": "Memoria consultada",
  "audit.check": "Registro verificado",
  "settings.update": "Ajustes salvos",
  "appearance.theme": "Paleta alterada",
  "conversation.local": "Conversa local",
  "conversation.unsupported": "Comando fora do escopo",
};
const date = (at) =>
  new Date(at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const time = (at) =>
  new Date(at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
const Hologram = React.lazy(() => import("./components/Hologram.jsx"));

function IconButton({ icon: Icon, label, active, ...props }) {
  return (
    <button
      type="button"
      className={`icon-button ${active ? "active" : ""}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon size={17} strokeWidth={1.65} />
    </button>
  );
}
function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <IconButton icon={X} label="Fechar janela" onClick={onClose} />
      </header>
      {children}
    </dialog>
  );
}
function TaskList({ state, act, openForm, confirm, compact = false }) {
  const [filter, setFilter] = useState("open");
  const tasks = state.tasks.filter(
    (item) => filter === "all" || (filter === "done" ? item.done : !item.done),
  );
  return (
    <>
      <div className="section-toolbar">
        <div className="segments" aria-label="Filtrar tarefas">
          {[
            ["open", "Abertas"],
            ["done", "Concluidas"],
            ["all", "Todas"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <IconButton
          icon={Plus}
          label="Criar tarefa"
          onClick={() => openForm("task")}
        />
      </div>
      {!tasks.length ? (
        <div className="empty-state">
          <ListTodo size={26} />
          <strong>
            {filter === "done"
              ? "Nenhuma tarefa concluida"
              : "Nenhuma tarefa nesta lista"}
          </strong>
          <button className="text-action" onClick={() => openForm("task")}>
            Criar tarefa <Plus size={14} />
          </button>
        </div>
      ) : (
        <div className="task-list">
          {tasks.slice(0, compact ? 5 : 1000).map((item) => (
            <article
              className={`task-row ${item.done ? "done" : ""}`}
              key={item.id}
            >
              <button
                className="task-checkbox"
                aria-label={`${item.done ? "Reabrir" : "Concluir"} ${item.text}`}
                aria-pressed={item.done}
                onClick={() => act({ type: "task.toggle", id: item.id })}
              >
                {item.done && <Check size={13} />}
              </button>
              <div>
                <p>{item.text}</p>
                <time dateTime={item.createdAt}>{date(item.createdAt)}</time>
              </div>
              <IconButton
                icon={Trash2}
                label={`Excluir ${item.text}`}
                onClick={() =>
                  confirm("Excluir esta tarefa?", () =>
                    act({ type: "task.remove", id: item.id, confirmed: true }),
                  )
                }
              />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function MemoryList({ state, act, openForm, confirm, compact = false }) {
  return (
    <>
      <div className="section-toolbar">
        <span className="small-label">
          {state.memories.length} registro(s) do dono
        </span>
        <IconButton
          icon={Plus}
          label="Guardar memoria"
          onClick={() => openForm("memory")}
        />
      </div>
      {!state.memories.length ? (
        <div className="empty-state">
          <Brain size={26} />
          <strong>Memoria em branco</strong>
          <button className="text-action" onClick={() => openForm("memory")}>
            Guardar uma memoria <Plus size={14} />
          </button>
        </div>
      ) : (
        <div className="memory-list">
          {state.memories.slice(0, compact ? 4 : 1000).map((item) => (
            <article key={item.id}>
              <div>
                <span className="eyebrow">{item.source}</span>
                <p>{item.text}</p>
                <time dateTime={item.createdAt}>{date(item.createdAt)}</time>
              </div>
              <IconButton
                icon={Trash2}
                label={`Esquecer ${item.text}`}
                onClick={() =>
                  confirm("Esquecer esta memoria?", () =>
                    act({
                      type: "memory.remove",
                      id: item.id,
                      confirmed: true,
                    }),
                  )
                }
              />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
function AuditList({ state, compact = false, act }) {
  const [search, setSearch] = useState("");
  const items = [...state.audit]
    .reverse()
    .filter((item) =>
      `${ACTION_NAMES[item.type] || item.type} ${item.detail}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  return (
    <>
      {!compact && (
        <div className="section-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Buscar auditoria"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar registros"
            />
          </label>
          <IconButton
            icon={ShieldCheck}
            label="Verificar integridade local"
            onClick={() => act({ type: "audit.check" })}
          />
        </div>
      )}
      {!items.length ? (
        <div className="empty-state">
          <ShieldCheck size={26} />
          <strong>Nenhuma acao registrada</strong>
        </div>
      ) : (
        <ol className="audit-list">
          {items.slice(0, compact ? 5 : 200).map((item) => (
            <li key={item.id}>
              <span
                className={`audit-dot ${item.status !== "completed" ? "warning" : ""}`}
              />
              <div>
                <strong>{ACTION_NAMES[item.type] || item.type}</strong>
                <p>{item.detail || item.type}</p>
                {!compact && (
                  <code title={item.hash}>{item.hash.slice(0, 20)}…</code>
                )}
              </div>
              <time dateTime={item.at}>{time(item.at)}</time>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
function Connections({ state }) {
  return (
    <div className="connections-list">
      {[
        [
          "Planejador",
          state.agent.provider === "ollama"
            ? `Ollama configurado: ${state.agent.model} · disponibilidade verificada por pedido`
            : "Comandos locais · sem IA generativa",
          state.agent.provider === "local",
        ],
        [
          "Arquivos",
          state.agent.workspace
            ? "Pasta autorizada selecionada · EXE"
            : "Nenhuma pasta autorizada",
          false,
        ],
        ["Agenda e e-mail", "Nao conectados"],
        ["Painel Dief", "Pareamento ainda nao implementado"],
        ["Comandos de tela", "Disponivel neste dispositivo", true],
      ].map(([name, status, available]) => (
        <article key={name}>
          <div className={`connection-icon ${available ? "ready" : ""}`}>
            <Plug size={18} />
          </div>
          <div>
            <strong>{name}</strong>
            <span>{status}</span>
          </div>
          <span className={`status-dot ${available ? "ready" : ""}`} />
        </article>
      ))}
    </div>
  );
}
function Briefing({ state }) {
  const open = state.tasks.filter((task) => !task.done);
  return (
    <div className="briefing-body">
      <div className="briefing-date">
        {new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </div>
      <h3>Seu ponto de partida.</h3>
      <p>
        {open.length
          ? `${open.length} tarefa(s) aguardando voce.`
          : "Nenhuma tarefa pendente neste dispositivo."}
      </p>
      <div className="briefing-stat">
        <ListTodo size={18} />
        <span>Tarefas abertas</span>
        <strong>{open.length}</strong>
      </div>
      <div className="briefing-stat">
        <Brain size={18} />
        <span>Memorias locais</span>
        <strong>{state.memories.length}</strong>
      </div>
      <div className="briefing-note">
        <Plug size={16} />
        <span>Agenda, clima e e-mail nao conectados.</span>
      </div>
    </div>
  );
}

export default function App() {
  const engine = useMemo(() => new JarvisEngine(browserStorage()), []);
  const [state, setState] = useState(initialState);
  const voiceOnly = true;
  const [recordTab, setRecordTab] = useState("memory");
  const [listenState, setListenState] = useState("off");
  const [audioLevel, setAudioLevel] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [runtimeProgress, setRuntimeProgress] = useState(null);
  const [runtimeError, setRuntimeError] = useState("");
  const commandHandler = useRef(null);
  const listenerRef = useRef(null);
  const activation = useRef(0);
  const activating = useRef(false);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState("idle");
  const [impulse, setImpulse] = useState(0);
  const settleTimer = useRef(null);
  const responseTimer = useRef(null);
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [renderError, setRenderError] = useState("");
  const [menu, setMenu] = useState(false);
  const backgroundListening = useRef(state.settings.listenInBackground);
  backgroundListening.current = state.settings.listenInBackground;
  const [platform, setPlatform] = useState({
    name: "Navegador",
    storage: "IndexedDB · neste navegador",
  });
  const navRef = useRef(null);
  const mainRef = useRef(null);
  const mounted = useRef(true);
  const sendGuard = useRef(false);
  const chatEnd = useRef(null);
  const chatContainer = useRef(null);
  const autoScroll = useRef(true);
  const input = useRef(null);
  const voiceConsent = useRef(false);
  const voice = useMemo(
    () =>
      new VoiceChannel({
        onTranscript: (text) => setDraft(text),
        onPhase: setPhase,
        onError: setNotice,
        onLevel: setAudioLevel,
        onSpokenEnd: () => listenerRef.current?.afterSpeech(),
      }),
    [],
  );
  const updateState = useCallback((next) => {
    if (mounted.current)
      setState((current) =>
        next.revision >= current.revision ? next : current,
      );
  }, []);
  const browserAgent = useMemo(
    () => new AgentController(engine, { onChange: updateState }),
    [engine, updateState],
  );
  const browserAssistant = useMemo(
    () => new AssistantSession(engine, browserAgent),
    [engine, browserAgent],
  );
  const listener = useMemo(
    () =>
      new WakeListener({
        modelUrl: window.jarvisDesktop
          ? "jarvis://app/components/stt-pt.tar.gz"
          : "/__jarvis_voice/stt-pt.tar.gz",
        keywordUrl: window.jarvisDesktop
          ? "jarvis://app/components/stt-wake-en.tar.gz"
          : "/__jarvis_voice/stt-wake-en.tar.gz",
        onCommand: (content) => commandHandler.current?.(content),
        onState: setListenState,
        onLevel: setAudioLevel,
        onError: setNotice,
      }),
    [],
  );
  listenerRef.current = listener;
  useEffect(() => {
    listener.setMuted(["working", "speaking", "received"].includes(phase));
  }, [listener, phase]);
  const hologramError = useCallback((text) => setRenderError(text), []);
  useEffect(() => {
    const media = matchMedia("(max-width: 900px)");
    const sidebar = navRef.current,
      main = mainRef.current;
    const update = () => {
      sidebar.inert = (media.matches || voiceOnly) && !menu;
      main.inert = (media.matches || voiceOnly) && menu;
      if ((media.matches || voiceOnly) && menu)
        sidebar.querySelector(".nav-close")?.focus();
    };
    const trap = (event) => {
      if ((!media.matches && !voiceOnly) || !menu || event.key !== "Tab")
        return;
      const buttons = [...sidebar.querySelectorAll("button")].filter(
        (button) => button.getClientRects().length && !button.disabled,
      );
      const first = buttons[0],
        last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    update();
    media.addEventListener("change", update);
    document.addEventListener("keydown", trap);
    return () => {
      sidebar.inert = false;
      main.inert = false;
      media.removeEventListener("change", update);
      document.removeEventListener("keydown", trap);
    };
  }, [menu, voiceOnly]);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = window.jarvisDesktop?.onState(updateState);
    (async () => {
      try {
        if (!window.jarvisDesktop) await browserAgent.recover();
        const data = window.jarvisDesktop
          ? await window.jarvisDesktop.read()
          : await engine.read();
        if (!mounted.current) return;
        updateState(data);
        if (window.jarvisDesktop)
          setPlatform(await window.jarvisDesktop.platform());
        setReady(true);
        if (window.jarvisDesktop?.setup) {
          try {
            setRuntimeStatus(
              await window.jarvisDesktop.setup({ op: "status" }),
            );
          } catch (error) {
            setRuntimeError(error.message);
          }
        } else if (import.meta.env.DEV) {
          window.jarvisPreviewVoice = {
            speak: async (text, profile, speed, engine) => {
              const result = await fetch("/__jarvis_voice/speak", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, profile, speed, engine }),
              });
              if (!result.ok)
                throw Error(
                  (await result.json()).error || "Nao foi possivel gerar voz.",
                );
              return result.arrayBuffer();
            },
          };
        }
      } catch (error) {
        if (mounted.current) setFatal(error.message);
      }
    })();
    const stop = () => {
      activation.current++;
      activating.current = false;
      voice.stop();
      listener.stop();
      window.jarvisDesktop?.voice({ op: "stop" }).catch(() => {});
    };
    const visibility = () => {
      if (document.hidden && !backgroundListening.current) stop();
    };
    document.addEventListener("visibilitychange", visibility);
    const key = (event) => {
      if (event.key === "Escape") {
        stop();
        setMenu(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    window.addEventListener("pagehide", stop);
    return () => {
      mounted.current = false;
      unsubscribe?.();
      voice.dispose();
      listener.stop();
      clearTimeout(settleTimer.current);
      clearTimeout(responseTimer.current);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("keydown", key);
      window.removeEventListener("pagehide", stop);
    };
  }, [engine, voice, browserAgent, updateState, listener]);
  useEffect(
    () => window.jarvisDesktop?.onSetupProgress(setRuntimeProgress),
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (autoScroll.current)
      chatEnd.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, [state.messages.length]);
  const sound = useCallback(() => {
    if (!state.settings.sound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      osc.onended = () => ctx.close();
    } catch {}
  }, [state.settings.sound]);
  const act = useCallback(
    async (action) => {
      if (!ready || fatal) return;
      try {
        const result = window.jarvisDesktop
          ? await window.jarvisDesktop.execute(action)
          : await engine.execute(action);
        if (!mounted.current) return result;
        updateState(result.state);
        sound();
        if (result.reply && action.type !== "chat.send")
          setNotice(result.reply);
        if (result.reply && result.state.settings.voice)
          voice.speak(result.reply, result.state.settings);
        return result;
      } catch (error) {
        if (mounted.current) setNotice(error.message);
        return null;
      }
    },
    [ready, fatal, engine, updateState, sound, voice],
  );
  const submit = async (event) => {
    event?.preventDefault();
    if (sendGuard.current || !draft.trim() || !ready) return;
    const content = draft.trim();
    sendGuard.current = true;
    setBusy(true);
    setDraft("");
    clearTimeout(settleTimer.current);
    clearTimeout(responseTimer.current);
    setImpulse((value) => value + 1);
    autoScroll.current = true;
    voice.stop();
    setPhase("received");
    settleTimer.current = setTimeout(() => {
      if (mounted.current && sendGuard.current) setPhase("working");
    }, 160);
    if (/^\/agente\s+/i.test(content))
      await act({ type: "screen.view", view: "agent" });
    const result = /^\/agente\s+/i.test(content)
      ? await agentRequest(
          { op: "plan", goal: content.replace(/^\/agente\s+/i, "") },
          true,
        ).catch((error) => {
          setNotice(error.message);
          return null;
        })
      : await (async () => {
          try {
            const reply = window.jarvisDesktop?.assistant
              ? await window.jarvisDesktop.assistant({ content })
              : await browserAssistant.respond(content);
            updateState(reply.state);
            if (reply.reply && reply.state.settings.voice)
              voice.speak(reply.reply, reply.state.settings);
            return reply;
          } catch (error) {
            setNotice(error.message);
            return null;
          }
        })();
    if (mounted.current) {
      if (!result) setDraft((current) => current || content);
      setBusy(false);
      clearTimeout(settleTimer.current);
      if (!result?.state.settings.voice) {
        setPhase(result ? "responding" : "idle");
        responseTimer.current = setTimeout(() => {
          if (mounted.current)
            setPhase((current) =>
              current === "responding" ? "idle" : current,
            );
        }, 1400);
      }
      input.current?.focus();
    }
    sendGuard.current = false;
  };
  const nav = (view) => {
    if (["agent", "audit", "memory"].includes(view)) setRecordTab(view);
    setMenu(false);
    act({ type: "screen.view", view });
  };
  const confirm = (title, action) =>
    setModal({ type: "confirm", title, action });
  const openForm = (type) =>
    setModal({
      type,
      title: type === "task" ? "Nova tarefa" : "Guardar memoria",
    });
  const exportData = async () => {
    try {
      const fresh = window.jarvisDesktop
        ? await window.jarvisDesktop.read()
        : await engine.read();
      const blob = new Blob(
        [
          JSON.stringify(
            {
              product: "Dief Jarvis",
              exportedAt: new Date().toISOString(),
              state: fresh,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dief-jarvis-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Exportacao local gerada.");
    } catch (error) {
      setNotice(error.message);
    }
  };
  const startVoice = () => {
    if (phase === "listening" || phase === "speaking") {
      voice.stop();
      return;
    }
    if (!voice.available()) {
      setNotice(
        "Reconhecimento curto do navegador indisponivel. Use a escuta local no modo holograma.",
      );
      return;
    }
    if (!voiceConsent.current) {
      setModal({ type: "voice", title: "Autorizar voz nesta sessao" });
      return;
    }
    voice.start();
  };
  const common = { state, act, openForm, confirm };
  const speechRequest = async (content) => {
    if (sendGuard.current || !ready) return;
    listener.setMuted(true);
    sendGuard.current = true;
    voice.stop();
    setPhase("received");
    setImpulse((value) => value + 1);
    try {
      setPhase("working");
      const result = window.jarvisDesktop?.assistant
        ? await window.jarvisDesktop.assistant({ content })
        : await browserAssistant.respond(content);
      updateState(result.state);
      if (result.reply && result.state.settings.voice)
        voice.speak(result.reply, result.state.settings);
      else {
        setPhase("responding");
        clearTimeout(responseTimer.current);
        responseTimer.current = setTimeout(() => {
          if (mounted.current)
            setPhase((current) =>
              current === "responding" ? "idle" : current,
            );
        }, 1400);
      }
    } catch (error) {
      setNotice(error.message);
      setPhase("idle");
    } finally {
      sendGuard.current = false;
    }
  };
  commandHandler.current = speechRequest;
  const stopListening = () => {
    activation.current++;
    activating.current = false;
    listener.stop();
    voice.stop();
    window.jarvisDesktop?.voice({ op: "stop" }).catch(() => {});
  };
  const startListening = async (direct = false) => {
    if (listener.enabled || activating.current) return;
    const generation = ++activation.current;
    activating.current = true;
    setListenState("loading");
    try {
      if (window.jarvisDesktop?.voice)
        await window.jarvisDesktop.voice({ op: "listen" });
      else {
        const result = await fetch("/__jarvis_voice/status");
        if (!result.ok || !(await result.json()).ready)
          throw Error("Os componentes de voz ainda precisam ser preparados.");
      }
      if (generation !== activation.current) {
        window.jarvisDesktop?.voice({ op: "stop" }).catch(() => {});
        return;
      }
      const saved = await act({
        type: "settings.update",
        changes: { voice: true },
      });
      if (!saved)
        throw Error("Nao consegui salvar a preferencia de resposta por voz.");
      if (generation !== activation.current) return;
      await listener.start(state.settings.voiceLang);
      if (direct) listener.arm();
    } catch (error) {
      if (generation === activation.current) {
        setListenState("off");
        setNotice(error.message);
      }
    } finally {
      if (generation === activation.current) activating.current = false;
    }
  };
  const toggleHologram = () => {
    setImpulse((value) => value + 1);
    if (
      listener.enabled ||
      activating.current ||
      ["working", "speaking", "received"].includes(phase)
    ) {
      stopListening();
      if (window.jarvisDesktop?.assistant)
        window.jarvisDesktop
          .assistant({ op: "stop" })
          .catch((error) => setNotice(error.message));
      else browserAssistant.stop();
      setPhase("idle");
    } else startListening(true);
  };
  const autoListenAttempted = useRef(false);
  useEffect(() => {
    if (!ready || autoListenAttempted.current || !state.settings.listenOnLaunch)
      return;
    autoListenAttempted.current = true;
    let disposed = false;
    navigator.permissions
      ?.query({ name: "microphone" })
      .then((permission) => {
        if (
          !disposed &&
          permission.state === "granted" &&
          !document.hidden &&
          !listener.enabled
        )
          startListening(false);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [ready, state.settings.listenOnLaunch]);
  const setupRequest = async (request) => {
    if (request.op === "connect") {
      const result = await window.jarvisDesktop.agent({
        op: "configure",
        provider: "ollama",
        model: request.model,
      });
      updateState(result.state);
      request = { op: "status" };
    }
    const result = await window.jarvisDesktop.setup(request);
    if (result?.components) {
      setRuntimeStatus(result);
      setRuntimeError("");
    }
    if (request.op === "model") updateState(await window.jarvisDesktop.read());
    return result;
  };
  const agentRequest = async (request, long = false) => {
    if (!ready || fatal) throw Error("O nucleo ainda nao esta pronto.");
    if (long) {
      voice.stop();
      setPhase("working");
      setImpulse((value) => value + 1);
    }
    try {
      let result;
      if (window.jarvisDesktop?.agent)
        result = await window.jarvisDesktop.agent(request);
      else if (request.op === "plan")
        result = await browserAgent.plan(request.goal);
      else if (request.op === "run")
        result = await browserAgent.run(request.id);
      else if (request.op === "cancel")
        result = await browserAgent.cancel(request.id);
      else if (request.op === "configure" && request.provider === "local")
        result = await engine.execute({
          type: "agent.configure",
          provider: "local",
        });
      else throw Error("Esta operacao requer o EXE.");
      if (result?.state) updateState(result.state);
      if (long && mounted.current) {
        setPhase("responding");
        clearTimeout(responseTimer.current);
        responseTimer.current = setTimeout(
          () =>
            setPhase((current) =>
              current === "responding" ? "idle" : current,
            ),
          1400,
        );
      }
      if (result?.reply && result.state?.settings.voice)
        voice.speak(result.reply, result.state.settings);
      return result;
    } catch (error) {
      if (long && mounted.current) setPhase("idle");
      throw error;
    }
  };
  const content = (key, compact = false) =>
    key === "agent" ? (
      <AgentConsole
        state={state}
        request={agentRequest}
        native={!!window.jarvisDesktop}
        confirm={confirm}
      />
    ) : key === "tasks" ? (
      <TaskList {...common} compact={compact} />
    ) : key === "memory" ? (
      <MemoryList {...common} compact={compact} />
    ) : key === "audit" ? (
      <AuditList state={state} act={act} compact={compact} />
    ) : key === "connections" ? (
      <Connections state={state} />
    ) : key === "settings" ? (
      <Settings
        {...common}
        platform={platform}
        exportData={exportData}
        previewVoice={(text, options) => {
          clearTimeout(responseTimer.current);
          voice.stop();
          voice.speak(text, options);
        }}
        onSearch={async (query) => {
          try {
            if (!window.jarvisDesktop?.search)
              throw Error("Pesquisa externa disponivel apenas no EXE.");
            const result = await window.jarvisDesktop.search(query);
            updateState(result.state);
            setNotice("Pesquisa aberta no navegador.");
          } catch (error) {
            setNotice(error.message);
          }
        }}
        onAutonomy={async (value) => {
          try {
            const result = await window.jarvisDesktop.agent({
              op: "autonomy",
              value,
            });
            updateState(result.state);
          } catch (error) {
            setNotice(error.message);
          }
        }}
        onElevate={async () => {
          try {
            await window.jarvisDesktop.agent({ op: "elevate" });
          } catch (error) {
            setNotice(error.message);
          }
        }}
      />
    ) : (
      <Briefing state={state} />
    );
  return (
    <div
      className={`app-shell theme-${state.settings.theme} phase-${phase} ${state.focus ? "focus-mode" : ""} voice-only ${state.settings.motionMode === "always" ? "motion-always" : ""}`}
      aria-busy={busy}
    >
      <aside
        ref={navRef}
        className={`navigation ${menu ? "mobile-open" : ""}`}
        aria-label="Navegacao principal"
      >
        <div className="brand">
          <div className="brand-emblem">
            <Aperture size={28} strokeWidth={1.2} />
          </div>
          <div>
            <strong>DIEF JARVIS</strong>
            <span>PERSONAL INTELLIGENCE</span>
          </div>
        </div>
        <div className="nav-section-label">
          <span>WORKSPACE</span>
          <IconButton
            icon={X}
            label="Fechar navegacao"
            className="icon-button nav-close"
            onClick={() => setMenu(false)}
          />
        </div>
        <nav>
          {NAV.map(([key, Icon, label]) => (
            <button
              key={key}
              aria-label={label}
              className={state.view === key ? "selected" : ""}
              onClick={() => nav(key)}
              aria-current={state.view === key ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{label}</span>
              {key === "tasks" &&
                state.tasks.filter((item) => !item.done).length > 0 && (
                  <small>
                    {state.tasks.filter((item) => !item.done).length}
                  </small>
                )}
            </button>
          ))}
        </nav>
        <div className="navigation-bottom">
          <div className="privacy-stamp">
            <LockKeyhole size={15} />
            <span>AMBIENTE LOCAL</span>
          </div>
          <div className="profile">
            <div className="profile-letter">
              {state.settings.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>{state.settings.name}</strong>
              <span>{platform.name}</span>
            </div>
            <IconButton
              icon={SlidersHorizontal}
              label="Ajustes do perfil"
              onClick={() => nav("settings")}
            />
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="nav-backdrop"
          aria-label="Fechar navegacao"
          onClick={() => setMenu(false)}
        />
      )}
      <div ref={mainRef} className="main-shell">
        <header className="jarvis-header">
          <h1>Dief Jarvis</h1>
          <div>
            <IconButton
              icon={Maximize2}
              label="Tela cheia"
              onClick={async () => {
                try {
                  if (window.jarvisDesktop?.display)
                    await window.jarvisDesktop.display();
                  else if (document.fullscreenElement)
                    await document.exitFullscreen();
                  else await document.documentElement.requestFullscreen();
                } catch (error) {
                  setNotice(error.message);
                }
              }}
            />
            <IconButton
              icon={MoreHorizontal}
              label="Menu do Jarvis"
              onClick={() => setMenu(!menu)}
            />
          </div>
        </header>
        <main className="workspace">
          <div className="workspace-grid" aria-hidden="true" />
          <div className="hologram-stage" hidden={state.view !== "central"}>
            <React.Suspense fallback={null}>
              <Hologram
                theme={state.settings.theme}
                motion={state.settings.motion}
                quality={state.settings.quality}
                phase={
                  ["working", "speaking", "received", "responding"].includes(
                    phase,
                  )
                    ? phase
                    : listenState === "addressed"
                      ? "listening"
                      : "idle"
                }
                awake={
                  listenState !== "off" ||
                  ["working", "speaking", "received"].includes(phase)
                }
                onActivate={toggleHologram}
                audioLevel={audioLevel}
                impulse={impulse}
                intensity={state.settings.intensity ?? 1}
                motionMode={state.settings.motionMode || "always"}
                onError={hologramError}
              />
            </React.Suspense>
          </div>
          {state.view === "central" && (
            <HoloConsole
              state={state}
              act={act}
              openRuns={() => nav("agent")}
              removeCard={(id) => act({ type: "screen.card.remove", id })}
              panelContent={(key) =>
                ["settings", "connections"].includes(key) ? (
                  <button className="text-action" onClick={() => nav(key)}>
                    Abrir {key === "settings" ? "ajustes" : "conexoes"}
                  </button>
                ) : (
                  content(key, true)
                )
              }
            />
          )}
          {state.view !== "central" && state.view !== "conversation" && (
            <section className="full-view">
              <div className="view-header">
                <div>
                  <span className="eyebrow">JARVIS / WORKSPACE</span>
                  <h1>
                    {["memory", "agent", "audit"].includes(state.view)
                      ? "Nucleo e registros"
                      : NAV.find((item) => item[0] === state.view)?.[2]}
                  </h1>
                </div>
                <IconButton
                  icon={X}
                  label="Voltar a central"
                  onClick={() => nav("central")}
                />
              </div>
              {["memory", "audit", "agent"].includes(state.view) ? (
                <>
                  <div
                    className="record-tabs"
                    role="tablist"
                    aria-label="Nucleo e registros"
                  >
                    {[
                      ["memory", "Memorias"],
                      ["agent", "Execucoes"],
                      ["audit", "Auditoria"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        role="tab"
                        aria-selected={recordTab === key}
                        onClick={() => setRecordTab(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div role="tabpanel" aria-label={recordTab}>
                    {content(recordTab)}
                  </div>
                </>
              ) : (
                content(state.view)
              )}
            </section>
          )}
          {state.view === "conversation" && (
            <section className="conversation-view">
              <div className="view-header">
                <div>
                  <span className="eyebrow">CANAL LOCAL / TEXTO</span>
                  <h1>Conversa</h1>
                </div>
                <IconButton
                  icon={X}
                  label="Voltar a central"
                  onClick={() => nav("central")}
                />
              </div>
              <div
                className="conversation-history"
                ref={chatContainer}
                onScroll={() => {
                  const el = chatContainer.current;
                  autoScroll.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                }}
              >
                {state.messages.length ? (
                  state.messages.map((message) => (
                    <article
                      className={`message ${message.role}`}
                      key={message.id}
                    >
                      <span>
                        {message.role === "jarvis"
                          ? "JARVIS"
                          : state.settings.name.toUpperCase()}
                      </span>
                      <p>{message.content}</p>
                      <time dateTime={message.at}>{date(message.at)}</time>
                    </article>
                  ))
                ) : (
                  <div className="conversation-empty">
                    <Aperture size={44} strokeWidth={1} />
                    <h2>Estou aqui, {state.settings.name}.</h2>
                    <span>Canal local em espera.</span>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
            </section>
          )}
          {renderError && (
            <div className="render-warning" role="status">
              {renderError}
            </div>
          )}
          <div className="workspace-footer">
            <span>
              <LockKeyhole size={12} /> LOCAL FIRST
            </span>
            <span>
              {ready ? "REGISTRO CONSISTENTE" : "INICIALIZANDO"}{" "}
              <span className="status-dot ready" />
            </span>
          </div>
        </main>
        {state.view === "conversation" && (
          <section className="command-dock" aria-label="Conversa com Jarvis">
            <div className="last-response">
              <span>JARVIS</span>
              <p aria-live="polite">
                {state.messages.at(-1)?.role === "jarvis"
                  ? state.messages.at(-1).content
                  : `Estou aqui, ${state.settings.name}.`}
              </p>
              {state.messages.length > 0 && (
                <button
                  className="text-action"
                  onClick={() => nav("conversation")}
                  aria-label="Abrir conversa completa"
                >
                  <MessageSquare size={15} />
                </button>
              )}
            </div>
            <form className="command-form" onSubmit={submit}>
              <Aperture
                className="command-symbol"
                size={24}
                strokeWidth={1.2}
              />
              <textarea
                ref={input}
                aria-label="Fale com Jarvis"
                placeholder="Fale com Jarvis..."
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    submit();
                  }
                }}
                disabled={!ready || !!fatal}
              />
              <div className="command-actions">
                <IconButton
                  icon={state.settings.voice ? Volume2 : VolumeX}
                  label={
                    state.settings.voice
                      ? "Desativar resposta falada"
                      : "Ativar resposta falada"
                  }
                  active={state.settings.voice}
                  onClick={() => {
                    if (state.settings.voice) voice.stop();
                    act({
                      type: "settings.update",
                      changes: { voice: !state.settings.voice },
                    });
                  }}
                />
                <IconButton
                  icon={phase === "listening" ? MicOff : Mic}
                  label={
                    phase === "listening" ? "Parar microfone" : "Falar por voz"
                  }
                  active={phase === "listening"}
                  onClick={startVoice}
                />
                <button
                  type="submit"
                  className="send-button"
                  aria-label="Enviar comando"
                  title="Enviar comando"
                  disabled={busy || !draft.trim() || !ready}
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
      {window.jarvisDesktop?.setup && !runtimeStatus?.ready && (
        <Startup
          status={runtimeStatus}
          progress={runtimeProgress}
          request={setupRequest}
          error={runtimeError}
        />
      )}
      {fatal && (
        <div className="fatal-screen" role="alert">
          <ShieldCheck size={32} />
          <h1>Dados preservados.</h1>
          <p>{fatal}</p>
          <button
            className="secondary-button"
            onClick={() => location.reload()}
          >
            <RotateCw size={16} /> Tentar novamente
          </button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <IconButton
            icon={X}
            label="Dispensar aviso"
            onClick={() => setNotice("")}
          />
        </div>
      )}
      {modal && (
        <Dialog title={modal.title} onClose={() => setModal(null)}>
          {modal.type === "confirm" ? (
            <>
              <p className="modal-copy">{modal.title}</p>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  Cancelar
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    const action = modal.action;
                    setModal(null);
                    action();
                  }}
                >
                  Confirmar
                </button>
              </div>
            </>
          ) : modal.type === "voice" ? (
            <>
              <p className="modal-copy">
                O reconhecimento usa o recurso de voz deste navegador e pode
                enviar audio ao servico do navegador. Nenhum audio bruto sera
                salvo pelo Jarvis. A captura inicia somente quando voce
                solicitar e pode ser interrompida.
              </p>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() => setModal(null)}
                >
                  Agora nao
                </button>
                <button
                  className="primary-button"
                  onClick={() => {
                    voiceConsent.current = true;
                    setModal(null);
                    voice.start();
                  }}
                >
                  Autorizar nesta sessao
                </button>
              </div>
            </>
          ) : (
            <EntryForm
              type={modal.type}
              onCancel={() => setModal(null)}
              onSave={async (text) => {
                const result = await act({
                  type: modal.type === "task" ? "task.create" : "memory.create",
                  text,
                });
                if (result) setModal(null);
                return Boolean(result);
              }}
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
function EntryForm({ type, onCancel, onSave }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const guard = useRef(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (guard.current || !text.trim()) return;
        guard.current = true;
        setSaving(true);
        await onSave(text.trim());
        guard.current = false;
        setSaving(false);
      }}
    >
      <label className="entry-label" htmlFor="entry-text">
        {type === "task" ? "Tarefa" : "Memoria"}
      </label>
      <textarea
        id="entry-text"
        className="entry-text"
        autoFocus
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={type === "task" ? 500 : 4000}
        required
        disabled={saving}
      />
      <div className="modal-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={saving}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button className="primary-button" disabled={!text.trim() || saving}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
