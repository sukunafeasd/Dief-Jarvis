# Dief Jarvis

Assistente pessoal independente do Painel Dief.
Versao atual: **1.0.0-alpha.1**, primeira etapa da interface. Nao e a versao
completa 1.0 nem um agente conectado a provedores externos.

## O que funciona agora

- Central holografica Three.js com paletas ambar/ciano, rotacao e modos
  economico, pausa e movimento reduzido; renderizacao suspensa ao ocultar.
- Conversa local com comandos tipados para abrir, fechar e organizar paineis.
- Tarefas, conclusao, memorias explicitas e briefing de dados locais reais.
- Auditoria das acoes com hashes encadeados, verificacao e exportacao consentida.
- Interface desktop, compacta/mobile e modo foco.
- Aplicativo Electron proprio, sem exigir administrador, com renderer isolado.
- Persistencia browser em IndexedDB; no aplicativo, SQLite com payload protegido
  pelo safeStorage do Windows. Nao ha sincronizacao Mongo nesta etapa.

## Limites importantes

O interprete de comandos e deterministico: nao e ainda uma IA generativa.
Nao controla Windows, arquivos externos, contas, e-mails, agenda ou navegador.
Nenhum conector e mostrado como ativo sem implementacao.
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
