# Referencias publicas para Dief Jarvis

Pesquisa de codigo, documentos e licencas em 08/10/2026. Nao foi uma auditoria
integral desses projetos nem um benchmark de todos os assistentes existentes.
Selecao por compatibilidade: Windows, ferramentas tipadas, persistencia,
provedores configuraveis, voz desacoplada e desenvolvimento ativo.

Nenhum codigo desses repositorios foi copiado ou executado. A implementacao
Dief e original, inspirada em padroes arquiteturais. Nenhuma dependencia nova
foi adicionada nesta rodada; licencas de modelos/servicos sao separadas.

## UFO / Microsoft

Fonte: https://github.com/microsoft/UFO

Snapshot: `a795552d976c4c019d7c2f778a0effb5cef7de6b` / main / MIT.
Arquivos estudados: `ufo/agents/agent/host_agent.py`,
`ufo/agents/processors/app_agent_processor.py`, documentos de AppAgent,
strategy e infraestrutura server/client, `requirements.txt`, `LICENSE`.

HostAgent coordena agentes de aplicativos; processamento separa coleta,
interacao com modelo, acao e memoria. A pilha inclui Python, pywinauto,
pywin32, Pillow e provedores de modelo. Referencia principal para um futuro
broker Windows com UI Automation, nao motivo para embutir toda a pilha agora.

Aplicado: controlador separado do renderer, etapas com resultados e executor
nativo. Ainda nao aplicado: screenshots, UIA, teclado/mouse e controle geral.

## Browser Use

Fonte: https://github.com/browser-use/browser-use

Snapshot: `c75e8476e26d18b7617643bc2ae082fae8eae431` / main / MIT.
Arquivos: `browser_use/agent/service.py`,
`browser_use/tools/registry/service.py`, `pyproject.toml`, `LICENSE`.

Registro normaliza parametros de ferramentas e pode excluir acoes. Servico
do agente trata passos, limites e falhas de modelos. Python, Pydantic,
clientes HTTP/CDP e eventos formam uma pilha distinta do nosso Electron.

Aplicado: catalogo/schema, recusa de ferramentas desconhecidas, argumentos
estritos, prazo do provedor e filtro por permissoes. Navegacao DOM/CDP ainda
nao aplicada; abrir pesquisa nao e ler resultados. Biblioteca MIT nao torna
inferencia ou servicos hospedados gratuitos.

## Leon

Fonte: https://github.com/leon-ai/leon

Snapshot: `011240d2446a0294faf8d2303c4fc32db59160a3` / develop / MIT.
Arquivos: `server/src/core/llm-manager/llm-provider.ts`,
`core/context/ARCHITECTURE.md`, `package.json`, `LICENSE.md`.

Divide preparo da requisicao, tentativa, tratamento de resultado e provedores;
so considera um motor pronto depois da configuracao. Servidor/skills e pontes
de execucao ficam separados. Usa Node e componentes Python conforme o recurso.

Aplicado: adaptador de modelo separado, configuracao explicita, descoberta real
de modelos e ausencia de status ficticio. Nao incorporamos servidor/skills Leon.

## OpenVoiceOS

Fonte: https://github.com/OpenVoiceOS/ovos-core

Snapshot: `8ca3cda026a9e018cf10bac3e6cafe26fca29302` / dev / Apache-2.0.
Arquivos: `docs/architecture.md`, `pyproject.toml`, `LICENSE`.

Listener, intents, skills, audio, GUI e hardware comunicam estados/eventos.
Ecossistema Python depende de messagebus, plugin-manager, config e workshop.

Aplicado em escala local: notificacoes de estado do backend para a interface,
sem confundir visualizacao, fala e executor. STT dedicado, wake-word e bus
distribuido continuam fora desta alpha.

## Open Interpreter

Fonte: https://github.com/openinterpreter/open-interpreter

Snapshot: `cc054cf52fa3585a3de50e0d4e0be6f9ee6677e8` / main / Apache-2.0.
Arquivos: README, `codex-rs/core/src/tools/registry.rs`,
`codex-rs/Cargo.toml`, `LICENSE`.

A arvore observada tem workspace Rust/Codex; nao presumimos que tutoriais
antigos da distribuicao Python descrevam o codigo atual. Registro separa
contratos de handlers, disponibilidade e ganchos de execucao.

Aplicado: ferramenta nao equivale a comando shell; disponibilidade e
autorizacao sao verificadas antes do efeito. Nao importamos runtime nem shell.

## Sukeesh / Jarvis

Fonte: https://github.com/Sukeesh/Jarvis

Snapshot: `0c62c730de3af69d0105d0bbc7c65feee25c6f67` / master / MIT.
Arquivos: `jarviscli/plugins/file_manager.py`, `jarviscli/PluginManager.py`,
`jarviscli/CmdInterpreter.py`, `installer/requirements.txt`, README e LICENSE.

Assistente CLI orientado a plugins/intencoes; gerenciador de arquivos separa
comandos e confirmacao de exclusao. Inspecao mais limitada que nas referencias
acima: nao importamos nem validamos a arvore completa de dependencias.

Aplicado: comandos deterministas funcionam sem um LLM; exclusao nao deve surgir
de interpretacao vaga. No Dief, arquivos ficam numa pasta concedida e exclusao
usa a Lixeira, sem remocao recursiva. Dependencias observadas incluem pluginmanager,
requests, bibliotecas de voz e integracoes opcionais; nao importamos esse conjunto.

## Decisao para a primeira versao

Manter React/Three + Electron e o armazenamento atual. Uma camada pequena de
ferramentas e orquestracao combina os padroes pertinentes sem carregar seis
frameworks, runtimes ou telemetrias de terceiros. Isso nao replica todos os
recursos dos projetos estudados nem demonstra capacidades vistas em videos.

Mapeamento: `src/core/tools.mjs` (registro/schema), `agent.mjs` (ciclo),
`ollama.mjs` (modelo), `engine.mjs` (transacoes/auditoria),
`desktop/workspace.mjs` (arquivos), `desktop/main.cjs` (broker),
`src/components/AgentConsole.jsx` (plano, autorizacao e resultados).

Proximos executores: navegador isolado com observacao, agente Windows/UIA e
helper UAC de operacoes especificas. Cada um precisa de permissao, cancelamento,
testes nativos e protecao contra instrucao maliciosa em paginas/documentos.

API Ollama verificada: https://docs.ollama.com/api/chat e
https://docs.ollama.com/capabilities/structured-outputs . Inferencia em loopback
usa schema e validacao posterior; nao depende de SDK nem guarda tokens.
