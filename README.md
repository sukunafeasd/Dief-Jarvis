# Dief Jarvis

Assistente pessoal independente do Painel Dief. Versao **1.0.0-alpha.8**.
Esta e uma alpha com execucao autorizada pela tarefa dada ao assistente,
nao a versao final 1.0 nem garantia de controle universal do Windows.

## Disponivel

- Holograma Three.js full-bleed, paletas ambar/ciano, movimento e reacao ao audio.
- Apresentacao contextual: nucleo a esquerda e dados a direita (empilhados no
  celular), com hologramas de tarefas, jornal, atividade, sol, chuva e neve.
  Destaque acompanha trechos do audio realmente em reproducao, nao temporizador
  ficticio nem sincronizacao palavra a palavra.
- Fixacao persistente de seis topicos por comando/botao. Interesse repetido pode
  fixar um topico automaticamente; desligavel nos ajustes. Mostra os ultimos dados
  consultados com horario e origem, sem atualizar dados web em segundo plano.
- Holograma como central, sem legendas ou controles de microfone. Toque para
  ativar/adormecer; arrastar gira o nucleo sem ativar a escuta. Menu recolhido,
  texto em vista separada e memoria/execucoes/auditoria reunidas nos registros.
- Animacoes ativas por padrao, independentemente da preferencia do sistema.
  Economia, pausa e respeito ao movimento reduzido sao escolhas nos ajustes.
- Escuta local consentida, AudioWorklet + Vosk, nome Jarvis e comandos PT/EN.
- Voz padrao XTTS-v2 em portugues, condicionada por amostra local. Novas falas
  sao sintetizadas usando essa referencia; nao sao reproducao do arquivo nem
  a antiga mistura Alex/Santa. Sem garantia de identidade/perfeicao sonora.
  Modelo e referencia ficam locais, fora do Git e fora de qualquer distribuicao.
- Kokoro permanece alternativa leve: Dief/PT (Alex 80% + Santa 20%), Alex/Santa
  para comparar e George em ingles. Fala por trechos e preparo do proximo
  enquanto o atual toca, normalizacao de unidades/Markdown.
- Perfil vocal original com nove modos de cadencia, personalidade concisa e
  acabamento Web Audio: filtro, equalizacao, compressor e limitador. Direcao
  artistica nao altera idade/timbre do modelo nem equivale a treinamento vocal.
  No motor Kokoro, cache em RAM para oito frases genericas e ate 16 variantes;
  falas pessoais nunca entram nele. Limpo ao parar o motor de sintese.
- Azure Speech opcional preparado: Antonio/Caio PT-BR, chave cifrada com
  safeStorage em tabela separada no EXE, sem chave em estado/exportacao/auditoria.
  Nenhuma conta foi criada e nenhuma sintese Azure real foi feita nesta rodada.
- Memoria automatica conservadora de fatos declarados em primeira pessoa,
  com origem, atualizacao, deduplicacao e opcao de desligar. Perguntas, citacoes,
  segredos e afirmacoes de terceiros nao sao memorias automaticas. Nao e
  consciencia, captura geral do PC ou garantia de compreensao de qualquer frase.
- Preparacao obrigatoria no EXE para componentes/modelo/executor ausentes.
  Downloads consentidos, verificados por tamanho/SHA256 e com cancelamento.
- Assistente Ollama com ferramentas tipadas, observacao/replanejamento e
  historico de resultados reais. Web/arquivos/PC/PowerShell habilitados por
  padrao; o pedido do operador autoriza a execucao sem confirmacao duplicada.
  A migracao aplica esse preset uma vez, preservando dados e escolhas posteriores.
- Executor Windows UI Automation e navegador agente isolado com leitura real
  de pesquisa e nova observacao apos alteracoes.
- PowerShell com os privilegios do EXE, sem dialogo adicional por script no
  preset padrao, sem sandbox de pasta ou mudanca automatica de ExecutionPolicy.
- Caminhos absolutos em qualquer unidade do computador, sem pasta obrigatoria.
  Caminhos relativos usam a pasta pessoal ou diretorio inicial opcional.
  Criar texto/codigo sem sobrescrever e excluir arquivos pela Lixeira.
- Tarefas, memorias, medidas informadas, status local, clima Open-Meteo e noticias
  de tecnologia Hacker News na tela, com origem. Previsao de sete dias,
  cidade configuravel, hardware/RAM reais e busca/conclusao de tarefas por ID.
  Sem sensores ficticios.
- SQLite protegido por safeStorage no EXE; IndexedDB no browser e auditoria local.

## Limites

A previa browser executa comandos locais e voz preparada, nao controla Windows
nem consulta um provedor LLM. Ferramentas nativas exigem o EXE preparado.
Nao pareamos Painel Dief/Mongo, celular, relogio, calendario ou e-mail.
Nao ha bypass de UAC/CAPTCHA nem controle visual de jogos/apps sem UIA.
Comandos solicitados podem acessar tudo que o processo tiver direito, inclusive
fora da pasta de trabalho: o executor PowerShell NAO e uma sandbox. Nao ha
garantia de seguranca ou controle universal. O manifesto de empacotamento pede
administrador ao iniciar o futuro EXE; o UAC continua exigindo autorizacao do
Windows. Essa elevacao nao foi validada em uma execucao nativa nesta rodada.

Escuta inicia por toque ou automaticamente se o microfone ja estiver autorizado.
A permissao do navegador/Windows nao e contornada. Escuta ao minimizar pode
continuar por padrao e pode ser desligada nos ajustes; fechar a aplicacao encerra
a captura. O navegador/SO pode suspender processos em segundo plano.
Outra pessoa/TV pode acionar Jarvis; nao ha
identificacao do falante. Durante a fala/processamento o reconhecimento pausa.
Use Escape ou toque novamente no holograma para interromper; nao ha barge-in
por voz nesta alpha. Apos o toque ha uma janela de 12s para o primeiro comando
sem dizer o nome; fora dela, o nome Jarvis pode aparecer em qualquer parte da
frase. Apos a resposta ha uma janela de 8s para continuar a conversa.
O caminho curto de voz da vista de texto usa Web Speech e pode usar servico do
navegador; o holograma usa Vosk local. Audio capturado nao e salvo.

Dados web/documentos sao nao confiaveis e nao autorizam novos objetivos. O preset
padrao nao pede confirmacao extra, aumentando o impacto de erros do modelo ou
voz de terceiros. Interromper nao desfaz efeitos. Auditoria nao e prova externa
antiviolacao. Escape e desligar o nucleo tambem interrompem a tarefa ativa.
Dados browser/exportacoes JSON sao legiveis; nao guarde segredos na previa.

## Desenvolvimento

Node >=22.12, npm. Windows para helper nativo.

```sh
npm ci --ignore-scripts
npm run dev
npm test
npm run build
npm run test:browser
npm run test:hologram
npm run test:touch
```

Previa: http://127.0.0.1:5194 . Nenhum deploy de producao e feito por esses comandos.

Preparar/testar voz real local (downloads ~167 MB):

```sh
npm run prepare:voice
npm run test:synthesis
npm run test:voice
npm run test:wake
npm run test:voice-stream
npm run test:voice-style
npm run test:presentation
```

Esses testes nao usam microfone fisico; alguns usam fixtures de audio/dados.
CHROME_PATH seleciona o executavel Chromium para os testes Playwright.

Desktop:

```sh
npm run setup:desktop
npm run build:helper
npm run build
npm run desktop
```

O aplicativo bloqueia uso enquanto faltarem componentes, Ollama, modelo ou
helper. Permissoes do Windows/microfone continuam sendo do sistema operacional.
Qwen3:1.7b e sugestao inicial; custos de RAM/disco dependem do modelo escolhido.
O XTTS padrao usa runtime Python separado e aproximadamente 1,9 GB de modelo.
Preparacao e licenca estao no relatorio alpha.8. Nesta maquina, geracao fria
levou 92-94 s; uma resposta curta com modelo carregado levou 16 s. Nao e fala
instantanea. Kokoro e alternativa mais leve. Azure e opcional, exige uma chave
fornecida pelo usuario e envia o texto da resposta a Microsoft; pode consumir
cota ou gerar custos. Para a previa, configure JARVIS_AZURE_REGION e
JARVIS_AZURE_KEY somente no ambiente do servidor e reinicie-o manualmente.
Nunca use variaveis VITE_* para segredos. No EXE, configure em Ajustes > Voz.
Nao contratamos, instalamos nem ativamos um servico pago.

**Nao publicar binarios alpha.8 antes de resolver redistribuicao GPL do EPhone e
validacao Windows real.** Scripts de pacote usam publish never; arquivos de
build/teste ficam fora do Git. Instalador/downloads do Painel Dief nao mudaram.

## Comandos

- Jarvis, mostre minhas tarefas.
- Jarvis, quais tarefas temos?
- Jarvis, fixe tarefas.
- Jarvis, desfixe clima.
- Jarvis, crie uma tarefa: revisar o projeto.
- Jarvis, lembre que prefiro respostas curtas.
- Jarvis, hoje eu corri dois quilometros.
- Jarvis, mostre status.
- Jarvis, temperatura em Porto Alegre. (EXE + web autorizado)
- Jarvis, previsao em Porto Alegre. (EXE + web autorizado)
- Jarvis, consulte hardware. (EXE + controle PC autorizado)
- Jarvis, busque tarefa dentista.
- Jarvis, mostre noticias de tecnologia. (EXE + web autorizado)
- Jarvis, liste janelas. (EXE + controles Windows autorizados)

Execucoes recebe tarefas e executa pelo mesmo assistente da conversa. /agente
continua sendo a escolha explicita de apenas preparar um plano. Planos antigos
nao sao executados automaticamente ao abrir. O preset padrao nao exige
autorizacao por sessao ou por etapa; o pedido original e a autorizacao.
Desligar execucao automatica deixa planos em espera. Interrupcoes nao repetem
efeitos. Foram removidos os tetos de 24 ciclos, 64 etapas e 15 minutos por
atendimento. Planos atomicos continuam ate 8 etapas, com continuacao. Formatos,
observacoes e buffers permanecem validados/limitados para nao esgotar memoria;
saidas grandes sao marcadas parciais, sem matar PowerShell por volume de texto.

## Documentacao

- [Arquitetura e referencias desta rodada](docs/AUTONOMIA-E-VOZ-ALPHA5.md)
- [Voz, preparo e licencas da base alpha.4](docs/VOZ-E-AUTONOMIA-ALPHA4.md)
- [Pesquisa de projetos publicos](docs/PESQUISA-AGENTES.md)
- [Relatorio de testes alpha.5](docs/TEST_REPORT_ALPHA5.md)
- [Relatorio de testes e limites alpha.6](docs/TEST_REPORT_ALPHA6.md)
- [Apresentacao contextual, voz e testes alpha.7](docs/TEST_REPORT_ALPHA7.md)
- [Execucao por tarefa, referencia XTTS e testes alpha.8](docs/TEST_REPORT_ALPHA8.md)

src/core guarda estado e contratos; src/components guarda interface;
desktop guarda brokers, drivers e SQLite; tests guarda verificacoes.
Nao incluir segredos, bancos pessoais, capturas de audio ou dados de usuario.
