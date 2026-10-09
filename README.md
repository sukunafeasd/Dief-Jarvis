# Dief Jarvis

Assistente pessoal independente do Painel Dief.
Versao atual: **1.0.0-alpha.3**, primeira camada de planejamento e execucao.
Nao e a versao completa 1.0. Ollama e opcional e exige um modelo configurado.

## O que funciona agora

- Central holografica Three.js com paletas ambar/ciano, rotacao e modos
  economico, pausa e movimento reduzido; renderizacao suspensa ao ocultar.
- Conversa local com comandos tipados para abrir, fechar e organizar paineis.
- Tarefas, conclusao, memorias explicitas e briefing de dados locais reais.
- Auditoria das acoes com hashes encadeados, verificacao e exportacao consentida.
- Interface desktop, compacta/mobile e modo foco.
- Aplicativo Electron proprio, sem exigir administrador, com renderer isolado.
- Ajustes em seis secoes, selecao/teste de voz e movimento explicitamente configuravel.
- Politicas de acesso com confirmacao, revogacao e pesquisa externa autorizada no EXE.
- Central de execucoes com plano revisavel, autorizacao, cancelamento, resultados
  por etapa e recuperacao segura apos interrupcao, sem repetir efeitos externos.
- Catalogo tipado de oito ferramentas e adaptador Ollama com schema JSON,
  contexto limitado, prazo de resposta e recusa de saidas incompletas.
- No EXE: listar/ler arquivos e criar textos sem sobrescrever, em pasta escolhida;
  exclusao usa a Lixeira do sistema, nunca remove pastas recursivamente.
- Persistencia browser em IndexedDB; no aplicativo, SQLite com payload protegido
  pelo safeStorage do Windows. Nao ha sincronizacao Mongo nesta etapa.

## Limites importantes

O chat comum continua deterministico. Em Execucoes, o planejador pode usar
comandos locais ou Ollama. Nao controla livremente Windows, contas, e-mails ou
agenda; arquivos ficam restritos a pasta autorizada. Nao existe shell arbitrario.
Pesquisa no EXE apenas abre o navegador externo, quando explicitamente autorizada;
nao le resultados nem navega autonomamente nesta etapa.
Nenhum conector e mostrado como ativo sem implementacao.
Ollama usa exclusivamente `127.0.0.1:11434` no processo nativo, sem chaves no
renderer. Ao conectar, ha consentimento para enviar ate 8 mensagens e 20 memorias.
Use um modelo instalado localmente; nao baixamos modelos nem contratamos servicos.
O servico Ollama pode ter seu proprio encaminhamento; o Jarvis nao o audita.
Planos sao sequencias limitadas, nao um agente autonomo de observacao/replanejamento.
Voz de entrada browser usa Web Speech quando suportado, somente apos consentimento
de sessao, e pode usar o servico do navegador. No Electron ela fica indisponivel
ate integrar o motor de voz dedicado. TTS usa as vozes disponiveis no sistema.

Auditoria local detecta inconsistencias nos registros, mas nao e prova externa,
assinatura independente nem garantia de resistencia a quem controla o computador.
A exportacao JSON e legivel: proteja o arquivo. A versao browser nao cifra dados;
nao use para guardar senhas, tokens ou conteudo sensivel. DPAPI no aplicativo
tambem nao substitui backup de chaves ou protege contra todo malware local.

## Desenvolvimento

Node >=22.12, npm. No Windows, Electron 44.7.0.

```sh
npm ci
npm run dev
npm test
npm run build
```

Browser local: http://127.0.0.1:5194 .

```sh
npm run setup:desktop
npm run build
npm run desktop
npm run package:portable
```

O instalador do runtime Electron e acionado explicitamente, sem aprovar scripts
de instalacao de dependencias desconhecidas. O build e local e nunca publica
automaticamente. Releases em `release/`, fora do Git.

## Comandos locais

- `mostre minhas tarefas`
- `crie uma tarefa: revisar o projeto`
- `lembre que prefiro respostas curtas`
- `mostre minha memoria`
- `abra a auditoria`
- `mostre meu briefing`
- `feche tarefas`
- `modo foco` / `restaure a tela`
- `tema ciano` / `tema ambar`

Enter envia, Shift+Enter mantem quebra de linha. Ctrl+K foca a conversa.
Escape interrompe fala. Dados de teste nao sao enviados para o Painel Dief.

## Execucoes

Abra Execucoes e use, por exemplo, `crie uma tarefa: revisar; mostre tarefas`.
Separador `;` combina comandos locais. `liste pasta`, `leia arquivo notas.txt`,
`crie arquivo notas.txt: anotacoes`, `exclua arquivo notas.txt` e `pesquise ...`
exigem os executores/permissoes correspondentes. Pela conversa, `/agente ...`
abre o mesmo fluxo de planejamento. Nada e executado so por preparar um plano.

No EXE, autorize arquivos nos Ajustes e escolha uma pasta em Execucoes.
No modo restrito/supervisionado, cada etapa externa pede confirmacao nativa.
Modo completo dispensa esse dialogo por etapa, mas nao a autorizacao inicial do
plano, nem concede UAC ou ferramentas inexistentes. Cancelamento nao desfaz
etapas concluidas. Falhas/interrupcoes nao recebem repeticao automatica.

## Testes

`npm test`: contrato de comandos, persistencia, concorrencia, falha de gravacao,
confirmacao, corrupcao de auditoria e politica do broker/protocolo.

`npm run test:browser`: Chromium/Playwright, quatro viewports, pixels/movimento
do canvas, comandos reais, reload, paineis, tema, tarefas e movimento reduzido.
Defina `CHROME_PATH` para seu Chromium ou instale o browser Playwright.
Viewports de celular nao substituem validacao em Safari iOS/Android reais.

`electron . --interface-test` usa `JARVIS_TEST_DATA` para um perfil sintetico,
sem mostrar janela. Valida SQLite protegido, comando e isolamento do renderer.

## Estrutura

`src/core/`: estado, comandos, hashes e adaptador de dados browser.
`src/components/`: nucleo 3D e disposicao visual.
`desktop/`: protocolo local, preload restrito, broker e SQLite.
`tests/`: regressao funcional/visual e politica nativa.
`docs/`: arquitetura, referencia e plano completo 1.0.

Nenhum segredo, banco pessoal ou dados de usuario deve entrar neste repositorio.

Permissoes, limites e direcao de voz: `docs/CONTROLE-E-VOZ.md`.
Pesquisa e decisoes arquiteturais: `docs/PESQUISA-AGENTES.md`.
Contrato de execucao: `docs/AGENTE-ALPHA3.md`.
