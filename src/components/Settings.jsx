import React, { useEffect, useState, useRef } from "react";
import {
  User,
  Aperture,
  Mic,
  ShieldCheck,
  Database,
  Cpu,
  Play,
  Search,
  LockKeyhole,
  Download,
  Check,
  Plug,
} from "lucide-react";
import { VOICE_DEFAULTS, ACCESS_DEFAULTS } from "../core/model.mjs";
import "../settings.css";

const SECTIONS = [
  ["profile", User, "Perfil"],
  ["display", Aperture, "Holograma"],
  ["voice", Mic, "Voz e audio"],
  ["access", ShieldCheck, "Acesso ao PC"],
  ["data", Database, "Dados"],
  ["system", Cpu, "Sistema"],
];
function RangeSetting({ value, label, min, max, step, save }) {
  const [draft, setDraft] = useState(value);
  const lastSent = useRef(value);
  useEffect(() => {
    setDraft(value);
    lastSent.current = value;
  }, [value]);
  const commit = () => {
    if (draft !== value && draft !== lastSent.current) {
      lastSent.current = draft;
      Promise.resolve(save(draft)).then((result) => {
        if (!result) lastSent.current = null;
      });
    }
  };
  return (
    <label className="setting-row range-row">
      <span>
        {label}
        <output>{Number(draft).toFixed(2)}</output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
    </label>
  );
}
export default function Settings({
  state,
  act,
  platform,
  confirm,
  exportData,
  previewVoice,
  onSearch,
}) {
  const [section, setSection] = useState("display");
  const [name, setName] = useState(state.settings.name);
  const [query, setQuery] = useState("");
  const [voices, setVoices] = useState([]);
  const [searching, setSearching] = useState(false);
  const options = { ...VOICE_DEFAULTS, ...state.settings };
  const access = { ...ACCESS_DEFAULTS, ...options.access };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => setName(state.settings.name), [state.settings.name]);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  const save = (changes) => act({ type: "settings.update", changes });
  const permit = (changes) => {
    const next = { ...access, ...changes };
    const expands =
      (next.mode === "full" && access.mode !== "full") ||
      ["web", "files", "desktop", "admin"].some(
        (key) => next[key] && !access[key],
      );
    const run = () =>
      act({ type: "permissions.update", access: next, confirmed: expands });
    if (expands)
      confirm(
        "Autorizar este acesso? Pesquisa envia o texto ao navegador externo. Arquivos e controle do PC podem afetar dados pessoais; administrador depende do UAC. Executores ainda indisponiveis NAO sao ativados por esta autorizacao. Voce pode revogar a qualquer momento.",
        run,
      );
    else run();
  };
  const toggle = (key, label) => (
    <label className="setting-row" key={key}>
      <span>{label}</span>
      <input
        className="toggle"
        type="checkbox"
        checked={options[key]}
        onChange={(event) => save({ [key]: event.target.checked })}
      />
    </label>
  );
  const slider = (key, label, min, max, step) => (
    <RangeSetting
      key={key}
      value={options[key]}
      label={label}
      min={min}
      max={max}
      step={step}
      save={(value) => save({ [key]: value })}
    />
  );
  const localVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(options.voiceLang.toLowerCase()),
  );
  return (
    <div className="settings-console">
      <nav className="settings-tabs" aria-label="Secoes dos ajustes">
        {SECTIONS.map(([key, Icon, label]) => (
          <button
            key={key}
            aria-pressed={key === section}
            onClick={() => setSection(key)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div className="settings-section" key={section}>
        <div className="settings-heading">
          <span className="eyebrow">CONFIGURACAO / LOCAL</span>
          <h3>{SECTIONS.find(([key]) => key === section)[2]}</h3>
        </div>
        {section === "profile" && (
          <>
            <form
              className="setting-row"
              onSubmit={(event) => {
                event.preventDefault();
                save({ name });
              }}
            >
              <label htmlFor="owner-name">Seu nome</label>
              <div className="inline-input">
                <input
                  id="owner-name"
                  maxLength={60}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <button
                  className="icon-button"
                  aria-label="Salvar nome"
                  title="Salvar nome"
                >
                  <Check size={18} />
                </button>
              </div>
            </form>
            <div className="config-note">
              <User size={18} />
              <p>Perfil deste dispositivo. Painel Dief ainda nao pareado.</p>
            </div>
          </>
        )}
        {section === "display" && (
          <>
            <div className="setting-row">
              <span>Paleta do nucleo</span>
              <div className="swatches">
                {[
                  ["amber", "Ambar"],
                  ["cyan", "Ciano"],
                ].map(([theme, label]) => (
                  <button
                    key={theme}
                    className={`swatch ${theme}`}
                    aria-label={label}
                    title={label}
                    aria-pressed={options.theme === theme}
                    onClick={() => save({ theme })}
                  />
                ))}
              </div>
            </div>
            {toggle("motion", "Movimento do nucleo")}
            <label className="setting-row">
              <span>Preferencia de movimento</span>
              <select
                aria-label="Preferencia de movimento"
                value={options.motionMode}
                onChange={(event) => save({ motionMode: event.target.value })}
              >
                <option value="system">Respeitar o sistema</option>
                <option value="always">Animar neste aplicativo</option>
              </select>
            </label>
            <div className="config-note">
              <Aperture size={18} />
              <p>
                {!options.motion
                  ? "Nucleo pausado por voce."
                  : reduced && options.motionMode === "system"
                    ? "Seu sistema pediu movimento reduzido; o globo esta pausado."
                    : "Animacao ativa enquanto a janela estiver visivel."}
              </p>
            </div>
            {slider("intensity", "Intensidade visual", 0.5, 1.5, 0.05)}
            <label className="setting-row">
              <span>Renderizacao</span>
              <select
                aria-label="Renderizacao"
                value={options.quality}
                onChange={(event) => save({ quality: event.target.value })}
              >
                <option value="balanced">Equilibrada · 30 fps</option>
                <option value="economy">Economica · 20 fps</option>
              </select>
            </label>
          </>
        )}
        {section === "voice" && (
          <>
            {toggle("voice", "Resposta falada")}
            {toggle("sound", "Efeitos sonoros")}
            <label className="setting-row">
              <span>Idioma da voz</span>
              <select
                aria-label="Idioma da voz"
                value={options.voiceLang}
                onChange={(event) =>
                  save({ voiceLang: event.target.value, voiceURI: "" })
                }
              >
                <option value="pt-BR">Portugues · Brasil</option>
                <option value="en-GB">English · British</option>
              </select>
            </label>
            <label className="setting-row">
              <span>Voz instalada</span>
              <select
                aria-label="Voz instalada"
                value={
                  localVoices.some(
                    (voice) => voice.voiceURI === options.voiceURI,
                  )
                    ? options.voiceURI
                    : ""
                }
                onChange={(event) => save({ voiceURI: event.target.value })}
              >
                <option value="">
                  Automatica
                  {localVoices.length ? "" : " · nenhuma voz encontrada"}
                </option>
                {localVoices.map((voice, index) => (
                  <option
                    key={`${voice.voiceURI}-${index}`}
                    value={voice.voiceURI}
                  >
                    {voice.name}
                    {voice.localService
                      ? " · local"
                      : " · servico do navegador"}
                  </option>
                ))}
              </select>
            </label>
            {slider("voiceRate", "Velocidade da fala", 0.6, 1.4, 0.01)}
            {slider("voicePitch", "Tom da voz", 0.5, 1.5, 0.05)}
            {slider("voiceVolume", "Volume", 0, 1, 0.05)}
            <button
              className="secondary-button"
              onClick={() =>
                previewVoice(
                  options.voiceLang === "en-GB"
                    ? "Good evening. Dief Jarvis is ready. All systems are under your control."
                    : "Boa noite. Dief Jarvis esta pronto. Aguardando suas instrucoes.",
                  options,
                )
              }
            >
              <Play size={16} />
              Testar voz
            </button>
            <div className="config-note">
              <Mic size={18} />
              <p>
                Voz atual: sintese do sistema, nao a voz original do filme.
                Microfone somente por toque e consentimento; no EXE a entrada
                dedicada ainda nao esta conectada.
              </p>
            </div>
            <div className="voice-direction">
              <span className="eyebrow">DIRECAO DE VOZ / PROXIMA ETAPA</span>
              <strong>Masculina, britanica, serena, articulada.</strong>
              <p>
                Azure Ryan (en-GB) e uma biblioteca licenciada da ElevenLabs sao
                candidatos para testes. Nenhum provedor conectado, nenhuma
                clonagem ou custo ativado.
              </p>
              {!window.jarvisDesktop && (
                <a
                  href="https://learn.microsoft.com/azure/ai-services/speech-service/language-support?tabs=tts"
                  target="_blank"
                  rel="noreferrer"
                >
                  Catalogo oficial de vozes
                </a>
              )}
            </div>
          </>
        )}
        {section === "access" && (
          <>
            <div className="config-note">
              <ShieldCheck size={18} />
              <p>
                Autorizacoes do assistente. Acesso total nao equivale a
                administrador nem ativa ferramentas inexistentes. Segredos, UAC
                e confirmacoes de alto risco continuam protegidos.
              </p>
            </div>
            <label className="setting-row">
              <span>Politica de acesso</span>
              <select
                aria-label="Politica de acesso"
                value={access.mode}
                onChange={(event) =>
                  permit({
                    mode: event.target.value,
                    ...(event.target.value === "full"
                      ? { web: true, files: true, desktop: true, admin: true }
                      : event.target.value === "restricted"
                        ? {
                            web: false,
                            files: false,
                            desktop: false,
                            admin: false,
                          }
                        : {}),
                  })
                }
              >
                <option value="restricted">Restrito</option>
                <option value="supervised">Supervisionado</option>
                <option value="full">Acesso total autorizado</option>
              </select>
            </label>
            {[
              [
                "web",
                "Pesquisar na web",
                platform.capabilities?.web
                  ? "Executor disponivel no EXE"
                  : "Somente no EXE",
              ],
              [
                "files",
                "Criar, editar e excluir arquivos",
                "Executor ainda nao conectado",
              ],
              [
                "desktop",
                "Controlar janelas, teclado e mouse",
                "Executor ainda nao conectado",
              ],
              [
                "admin",
                "Solicitar administrador",
                "Helper elevado ainda nao conectado",
              ],
            ].map(([key, label, status]) => (
              <label className="setting-row permission-row" key={key}>
                <span>
                  {label}
                  <small>{status}</small>
                </span>
                <input
                  className="toggle"
                  type="checkbox"
                  checked={access[key]}
                  onChange={(event) => permit({ [key]: event.target.checked })}
                />
              </label>
            ))}
            <button
              className="secondary-button"
              onClick={() => permit({ ...ACCESS_DEFAULTS })}
            >
              <LockKeyhole size={16} />
              Revogar todos os acessos
            </button>
            <form
              className="web-search"
              onSubmit={async (event) => {
                event.preventDefault();
                if (searching) return;
                setSearching(true);
                try {
                  await onSearch(query);
                } finally {
                  setSearching(false);
                }
              }}
            >
              <label htmlFor="web-query">Pesquisa externa</label>
              <div className="inline-input">
                <input
                  id="web-query"
                  maxLength={300}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="O que pesquisar?"
                />
                <button
                  className="icon-button"
                  title="Pesquisar"
                  aria-label="Pesquisar"
                  disabled={
                    !platform.capabilities?.web ||
                    !access.web ||
                    !query.trim() ||
                    searching
                  }
                >
                  <Search size={18} />
                </button>
              </div>
            </form>
          </>
        )}
        {section === "data" && (
          <>
            <div className="setting-row">
              <span>Armazenamento</span>
              <span className="setting-value">{platform.storage}</span>
            </div>
            <div className="setting-row">
              <span>Registros locais</span>
              <span className="setting-value">
                {state.tasks.length} tarefas · {state.memories.length} memorias
                · {state.audit.length} acoes
              </span>
            </div>
            <div className="config-note">
              <Database size={18} />
              <p>
                Dados do navegador e do EXE sao separados. No EXE, SQLite
                protegido pelo Windows; no navegador, IndexedDB sem
                criptografia. Exportacoes JSON sao legiveis.
              </p>
            </div>
            <button
              className="secondary-button"
              onClick={() =>
                confirm(
                  "Exportar conversas, tarefas, memorias e auditoria em JSON legivel? Guarde o arquivo em um local privado.",
                  exportData,
                )
              }
            >
              <Download size={16} />
              Exportar dados locais
            </button>
            <button
              className="secondary-button"
              onClick={() => act({ type: "audit.check" })}
            >
              <ShieldCheck size={16} />
              Verificar registro
            </button>
          </>
        )}
        {section === "system" && (
          <>
            <div className="setting-row">
              <span>Ambiente</span>
              <span className="setting-value">{platform.name}</span>
            </div>
            <div className="setting-row">
              <span>Motor de comandos</span>
              <span className="setting-value">Local · deterministico</span>
            </div>
            <div className="setting-row">
              <span>IA generativa</span>
              <span className="setting-value">Nao conectada</span>
            </div>
            <div className="setting-row">
              <span>Painel / Mongo</span>
              <span className="setting-value">Nao pareados</span>
            </div>
            <div className="config-note">
              <Plug size={18} />
              <p>
                Automacoes persistentes, observacao da tela e agente Windows
                entram por executores separados, com cancelamento, limites e
                trilha de auditoria. Esta alpha nao executa shell livre.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
