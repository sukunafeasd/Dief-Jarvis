# Verificacao alpha.4 / 2026-10-08

Ambiente: Windows, Node 24.19.0, Chromium Playwright headless. Nenhum dado de
producao ou tarefa do Painel Dief usado. Binarios alpha.4 nao foram publicados.

## Evidencias executadas

- npm test: **62/62**, sem skips. Persistencia, concorrencia, auditoria, modelos,
  schemas, limites, cancelamento, permissoes e executores/politicas com mocks.
- npm run test:browser: aprovado. Quatro viewports, canvas nao vazio/em movimento,
  drag, tema, paineis, foco, movimento reduzido, tarefas, historico e reload.
- npm run test:hologram: aprovado. Sem composer, tarefa/medida criadas pelo fluxo
  real do browser, quatro tamanhos, dados dentro da tela sem cobrir controles,
  fullscreen, persistencia e modal obrigatorio de preparo (fixture do renderer).
  Tambem testa observar/preencher/clicar DOM de fixture, expiracao de referencias
  e bloqueio de campos sensiveis. Nao e uma sessao Electron nativa.
- npm run build: aprovado. Entrada ~335,87 KB/~102,82 KB gzip. Three/globo e Vosk
  separados/lazy; Vosk ~5,79 MB/~2,38 MB gzip somente ao ativar escuta. Aviso de
  chunk grande mantido visivel, nao suprimido. Valores podem variar com rebuild.
- npm audit: **0 vulnerabilidades conhecidas reportadas**, nao prova de ausencia
  de vulnerabilidades. Override uuid corrige dependencia declarada do Vosk.
- npm run build:helper: compilado pelo csc do Windows; manifesto SHA256 gerado.
  O helper NAO foi usado para controlar aplicativos deste computador.
- npm run prepare:voice: oito artefatos reais presentes/verificados, total
  **167034544 bytes**. Nao foi instalado Ollama ou baixado modelo Qwen no host.
- npm run test:synthesis: WAVs reais em CPU para Alex/PT e George/EN, e frases
  de teste. Sem captura de microfone fisico. Ultima rodada: Alex ~7,2 s para
  gerar 4,31 s de audio; George ~5,7 s para 4,285 s. Estes tempos nao garantem
  latencia em outros computadores. Sintese nao e streaming nesta alpha.
- npm run test:voice: modelos reais reconheceram a frase sintetica dirigida a
  Jarvis. Detector ingles reconheceu o nome; gate correlacionou tempos e retirou
  a transcricao errada PT. Fala de teste sem nome nao gerou comando.
- npm run test:wake: microfone **sintetico** Chromium -> AudioWorklet -> modelos
  reais -> comando dirigido. Parar encerrou todas as tracks e mudou estado off.
- Clima: consulta real Open-Meteo de Porto Alegre respondeu com cidade,
  temperatura e horario do servico. Noticias: consulta real da API oficial HN
  retornou manchetes com fonte e publicacao. Nao sao resultados inventados.

## Bugs encontrados e corrigidos

1. Modelo PT ouvia Jarvis como jardim/ja disse: detector dedicado + correlacao de
   tempos, sem aceitar jardin/jardim como aliases que despertam sozinhos.
2. Phonemizer selecionado inicialmente so funcionava em ingles: substituido
   por EPhone multilanguage; portugues realmente sintetizado. GPL registrada.
3. Interromper fala deixava motor ocupado: cancelamento chega ao worker e aguarda
   termino antes de aceitar nova fala; cancelamento antes de iniciar e testado.
4. Falha de worker ocioso podia virar erro nao tratado: handler persistente e
   reinicializacao segura do motor.
5. Preparar plano tinha janela de concorrencia antes de reservar o lock:
   reserva anterior a qualquer await. Duas preparacoes nao duplicam execucoes.
6. Assistant lia runs[0] depois de executar: busca pelo ID, sem confundir planos.
7. Palavra quilometros era convertida para metros: unidade corrigida/testada.
8. Tarefas/memorias ficavam invisiveis no modo holograma: paineis proprios nesse
   modo; configurações/auditoria podem abrir sua vista real.
9. Texto antigo do nucleo sobrepunha legenda/caption: identificador anterior
   ocultado no holograma e heading responsivo com especificidade correta.
10. Microfone podia compartilhar verificacao generica de media: escopo estrito
    audio-only/top-frame/origem propria; camera e captura de tela bloqueadas.
11. Referencia UIA tinha nome divergente do contrato: helper agora retorna ref,
    compativel com argumentos e dialogo de confirmacao.
12. Instancia elevada podia ser recusada pelo lock da anterior: liberar lock
    antes de relancar, retomar em caso de cancelamento. Teste UAC real pendente.
13. Downloads sem verificar diretorios intermediarios: bloquear links/junctions,
    conferir disco e SHA/tamanho, remover somente o proprio arquivo parcial.
14. IPv4 privado mapeado em IPv6: BlockList com ranges reservados, incluindo
    ::ffff:7f00:1, coberto por teste.
15. Chat escrito usava caminho deterministico diferente da escuta: ambos passam
    pelo AssistantSession; browser continua local por falta de broker nativo.
16. Parar durante preparo podia deixar plano pendente: cancela o plano criado
    antes de qualquer execucao. Trocar pasta/modelo bloqueado durante atendimento.

## Nao verificado / impedimentos

- Microfone humano, sotaques, ruido, falsos positivos e latencia em uso real.
- Safari iOS/Android fisicos: somente viewports Chromium nesta rodada.
- Electron real, CSP/protocolo de voz nativo, fullscreen Windows, UAC e UIA em
  aplicativos reais. Execucao Electron estava negada no ambiente; nao repetimos
  nem contornamos essa restricao por um helper de automacao.
- Instalacao Ollama/Qwen, inferencia com modelo real e tarefas Windows completas:
  implementadas mas validadas por contratos/mocks, nao alegadas como aprovadas.
- Autonomia nao e irrestrita: arquivos em pasta autorizada, UIA compativel,
  navegador isolado e confirmacao para alteracoes sensiveis. Sem shell livre.
- Licenciamento: EPhone/eSpeak GPL pode exigir fonte do produto combinado.
  Nenhum pacote alpha.4 foi distribuido; revisar licenca/notices/fonte exata
  antes de publicar binarios. A alpha.3 antiga nao contem estas alteracoes.

Capturas em artifacts/hologram-{desktop,wide,mobile,landscape}.png e
artifacts/startup-fixture.png. WAVs sinteticos em artifacts/jarvis-*.wav.
Artifacts, componentes locais, bancos, executaveis e segredos ficam fora do Git.
