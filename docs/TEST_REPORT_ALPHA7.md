# Alpha.7: apresentacao contextual e voz original

## Implementacao

- Nucleo Three.js desloca-se para dar espaco a informacao, com separacao de
  cena e dados nos viewports desktop, vertical e horizontal.
- Tarefas, memoria, clima, noticias de tecnologia, atividade informada e status
  usam somente dados disponiveis. Icones holograficos reais renderizados em
  Three.js; clima inclui sol/nuvem/chuva/neve pelo codigo WMO retornado.
- Topicos fixados persistem no estado local e auditoria. Fixacao automatica
  requer tres consultas do usuario e dados disponiveis para os topicos externos.
  Nao cria consulta web automatica nem inventa email, mercado ou sensor.
- Lista de tarefas fala quantidade/nomes e permite concluir/reabrir pelo botao.
  Fontes e horarios permanecem visiveis. Destaque visual responde a onplay do
  audio; correspondencia por trecho/titulo e aproximacao entre trechos, nao
  alinhamento fonetico ou palavra a palavra.
- Perfil vocal original em src/core/voice_profile.json. O TTS continua Kokoro,
  mistura Dief de Alex/Santa, sem treinamento novo ou amostras de ator/filme.
  Nove modos ajustam cadencia, mantendo a mesma identidade-base.
- Filtro passa-altas, EQ de presenca/agudos, compressor e curva limitadora reais
  no Web Audio. Nao implementa de-esser dinamico, medicao LUFS nem voz clonada.
- Cache de frases genericas no servico de voz: RAM, ate 16 variantes de 256 KB,
  chave inclui perfil e velocidade, copia defensiva do WAV, limpo ao parar.
  Somente oito frases predefinidas; nenhum texto pessoal e retido.
- Personalidade concisa no provedor Ollama, sem alegar sensores, contas ou
  operacoes nao executadas. Chamadas permanecem tipadas e auditadas.
- Empacotamento futuro configurado requireAdministrator. Nao contorna UAC;
  permissoes explicitas e aprovacoes de alto risco permanecem.

## Verificacao local

- npm test: 96/96, incluindo persistencia, personalidade/resumo, voz, pin,
  selecao de tarefas sem painel aberto, clima e cache sem dados pessoais.
- test:browser e test:hologram: aprovados, fluxo real de interface e canvas.
- test:touch: aprovado, toque/cancelamento/RMS com microfone sintetico.
- test:startup: aprovado, falha de importacao deliberada e recuperacao.
- test:wake: aprovado, AudioWorklet/modelos reais com audio sintetico.
- test:presentation: aprovado em 1440x900, 393x851 e 844x390; pixels nao vazios,
  movimento, ausencia de sobreposicao nucleo/dados, fixacao persistente e destaque
  acionado por reproducao. Clima/noticias/audio de transporte sao fixtures
  identificadas; nao comprovam consulta de conta ou sensor.
- test:voice-stream: sintese Kokoro real, proximo trecho preparado durante fala.
  Primeiro audio medido entre 6.35 e 8.16 s em duas execucoes CPU frias;
  ainda nao e latencia instantanea nem garantia para outros computadores.
- test:voice-style: sintese Kokoro e processamento OfflineAudioContext reais.
  Amostra de 11.465 s, pico 0.854 e RMS 0.126 (escala linear), sem clipping.
  artifacts/voice-original-a.wav bruto; voice-original-b.wav processado.
  Nao houve avaliacao auditiva comparativa com a dublagem nem clone de ator.
- Build Vite aprovado. Chunks grandes de reconhecimento/Three.js continuam
  separados e carregados sob demanda, com aviso de tamanho do bundler.
- npm audit --omit=dev: zero vulnerabilidades conhecidas na verificacao.

## Pendencias explicitas

Windows nativo e elevacao UAC nao foram executados: o ambiente recusou o
aplicativo anteriormente, sem tentativa de contorno. Nenhuma nova distribuicao
EXE/instalador publicada. Redistribuicao EPhone/GPL continua pendente.

Nao ha Gmail/calendario/relogio pareado, mercado financeiro ao vivo, atualizacao
web periodica ou dados do Painel/Mongo nesta alpha. Fixar um topico nao concede
acesso PC/web. Permissoes nao passaram a irrestritas por padrao; arquivos seguem
area autorizada e PowerShell exige aprovacao integral.

Sem microfone fisico testado, sem Azure contratado/testado com chave real, sem
barge-in por voz. Amostras sinteticas ficam em artifacts fora do Git.
