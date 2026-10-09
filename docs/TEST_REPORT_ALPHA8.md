# Alpha.8: execucao por tarefa e voz por referencia

## Mudancas de execucao

- Novo preset habilita web, arquivos, Windows, PowerShell, solicitacao de admin
  e autonomia. O pedido dado ao assistente e a autorizacao, sem dialogos por
  sessao/etapa ou classificacao de risco no preset padrao. Nao faz acoes ao abrir
  nem retoma planos antigos automaticamente.
- Migracao de preferencia uma vez, com marcador: muda o preset antigo pedido
  pelo operador, preserva tarefas/memorias/historico/tema e respeita revogacoes
  posteriores. Politica supervisionada legada permanece testada internamente.
- Sem pasta obrigatoria: resolvedor do modo completo aceita caminhos absolutos
  e relativos, diferentes unidades, e respeita permissao real do SO. Diretorio
  inicial e contexto, nao fronteira. Testes usaram somente pastas temporarias.
- PowerShell recebe diretorio absoluto, herda o token do EXE e nao tem sandbox.
  Nenhum script real foi executado com elevacao durante os testes desta rodada.
- Sem teto de ciclos/etapas/15 minutos por pedido; sem timeout padrao de
  PowerShell. Cancelamento, formatos tipados, verificacao de efeitos/repeticao,
  timeouts de rede e buffers limitados permanecem. Saidas grandes sao marcadas
  parciais sem interromper o processo. Historico local continua rotativo.
- Ajustes e Execucoes nao mostram seletor restrito/supervisionado, escolha de
  pasta autorizada ou dupla autorizacao para executar. Ha uma chave para deixar
  tarefas em espera. Escape e desligar o holograma interrompem o atendimento,
  alem da escuta/voz. Interromper nao desfaz efeitos concluidos.
- Administrador e pedido no manifesto do futuro pacote. UAC, direitos do
  Windows, autenticacao/desktop seguro e limitacoes UI Automation continuam
  reais: nao foram contornados. Browser isolado nao equivale a controlar todas
  as abas pessoais, jogos ou controles protegidos.

## Voz

- Audio publico obtido do link fornecido pelo operador:
  https://www.youtube.com/watch?v=NEXplNDRx7U . Nao houve acesso a cookies ou
  tentativa de contornar login/bloqueio. Conversao para PCM mono 24 kHz e trecho
  de 13 s; passa-altas/passa-baixas/reducao de ruido. Isso nao e separacao
  perfeita de musica/falas nem comprova direitos de redistribuicao.
- XTTS-v2 condicionado por referencia, nao Kokoro com filtro. Configuracao
  persistente local aponta para Python/modelo/amostra; o worker extrai e reusa
  o condicionamento, sintetiza novas frases, limita picos e devolve WAV real.
- Modelo oficial coqui/XTTS-v2, revisao
  6c2b0d75eae4b7047358e3b6bd9325f857d43f77, arquivos grandes verificados SHA256.
  Python 3.12, torch/torchaudio 2.6.0 CPU, coqui-tts 0.27.2 e transformers 4.55.4.
  Instalacao isolada em artifacts/clone-runtime, sem mudar Python global.
- Padrao/migracao do Kokoro para XTTS, escolha posterior de outro motor
  preservada. Nao troca silenciosamente para Kokoro se configuracao falhar.
  Botao Testar voz mostra preparacao/reproducao. Modelo/amostra/configuracao
  nao sao incluidos no Git nem publicados em downloads.
- Worker oculto, JSON via stdin/stdout, sem comando montado com texto falado;
  cancelamento termina o worker. Idle de 5 minutos libera RAM. Worker Python
  vai fora do ASAR no futuro pacote; empacotamento nativo ainda nao validado.
- Preparacao de startup verifica arquivos da configuracao de referencia quando
  XTTS esta escolhido. Nao e um instalador completo/portatil de Python/XTTS para
  outras maquinas: a preparacao atual e local de desenvolvimento.

## Resultado dos testes

- 106 testes unitarios aprovados, incluindo migracao, default XTTS, ausencia de
  fallback, cancelamento/worker, arquivos fora da pasta inicial, comando com cwd
  absoluto (spawn mock), 70 etapas sem antigos tetos e saida grande sem kill.
- Teste de interface aprovado em cinco viewports, tarefa executada sem modal
  extra, nenhuma escolha de pasta e chave de execucao persistente. Apresentacao
  em tres viewports tambem aprovada; dados/som de transporte sao fixtures.
- Build aprovado, toque/cancelamento RMS sintetico e recuperacao de startup
  aprovados. O teste de startup inclui falha de importacao deliberada, nao bug
  residual. npm audit --omit=dev: zero vulnerabilidades conhecidas.
- Previa atual recarregada no navegador interno; XTTS aparece selecionado como
  padrao. Botao Testar voz acionado com o backend real e voltou habilitado sem
  erro visivel. Isso nao equivale a avaliacao auditiva humana.
- Sintese real XTTS: amostras em artifacts/jarvis-cloned-sample.wav e
  jarvis-cloned-short.wav. Duas execucoes frias aproximadamente 94.3/92.4 s;
  resposta curta warm 16.1 s. WAVs nao vazios; duracoes variaram entre geracoes.
  Nao e baixa latencia nem clone garantidamente identico ao dublador.
- Verificacao ASR local Whisper base reconheceu a maior parte da frase longa,
  mas teve discrepancias na frase curta. Isso nao prova pronuncia perfeita nem
  semelhanca de timbre. Nao houve avaliacao auditiva humana/comparativa.
- Um teste diagnostico de ASR encontrou incompatibilidade de PyAV; a tentativa
  de downgrade por compilacao falhou. O diagnostico foi corrigido decodificando
  PCM com SoundFile/Scipy, sem depender desse caminho PyAV.
- Microfone fisico nao testado. EXE/UAC/controle nativo nao executados devido
  ao bloqueio anterior do ambiente, sem contorno. Nao publicar binario nesta
  rodada; Painel Dief, Mongo, instalador e downloads nao foram alterados.

## Reproduzir a preparacao local

Requer uma amostra local em artifacts/jarvis-reference-clean.wav e ambiente
Python preparado em artifacts/clone-runtime. Instalar torch/torchaudio CPU pelo
indice oficial PyTorch e scripts/clone-requirements.txt nesse ambiente. Depois:

```sh
npm run prepare:clone
npm run test:clone
```

O script baixa aproximadamente 1,9 GB, verifica integridade e gera configuracao
local no diretorio de componentes do Jarvis. Ela aponta para os arquivos em
artifacts: nao apagar esses arquivos enquanto estiverem configurados.

Referencias primarias:
- https://coqui-tts.readthedocs.io/en/latest/models/xtts.html
- https://huggingface.co/coqui/XTTS-v2/blob/main/LICENSE.txt
- https://github.com/idiap/coqui-ai-TTS
