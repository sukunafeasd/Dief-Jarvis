# Dief Jarvis

Assistente pessoal independente do Painel Dief. Versao **1.0.0-alpha.7**.
Esta e uma alpha, nao a versao final 1.0 nem controle irrestrito do computador.

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
- Sintese neural local Kokoro: perfil Dief/PT padrao (Alex 80% + Santa 20%),
  Alex/Santa para comparar e George em ingles britanico. Fala por trechos com
  preparo do proximo enquanto o atual toca, normalizacao de unidades/Markdown.
  Aproximacao de estilo, nao voz oficial/clone do ator do filme.
- Perfil vocal original com nove modos de cadencia, personalidade concisa e
  acabamento Web Audio: filtro, equalizacao, compressor e limitador. Direcao
  artistica nao altera idade/timbre do modelo nem equivale a treinamento vocal.
  Cache somente em RAM para oito frases genericas, limitado a 16 variantes;
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
- Assistente Ollama com ferramentas tipadas, observacao/replanejamento, limites,
  permissao revogavel, confirmacoes sensiveis e historico de resultados reais.
- Executor Windows UI Automation e navegador agente isolado com leitura real
  de pesquisa e nova observacao apos alteracoes.
- PowerShell separado: permissao propria, script integral aprovado no dialogo
  nativo, processo sem sandbox, sem alterar ExecutionPolicy automaticamente.
- Area de arquivos escolhida; disco inteiro exige modo completo + confirmacao.
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
Comandos aprovados podem acessar tudo que o processo tiver direito, inclusive
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

Dados web/documentos sao nao confiaveis. Confirmacao e limites reduzem riscos,
nao garantem protecao absoluta. Auditoria nao e prova externa antiviolacao.
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

Os dois ultimos usam modelos reais e audio sintetico, nao microfone fisico.
CHROME_PATH seleciona o executavel Chromium para os testes Playwright.

Desktop:

```sh
npm run setup:desktop
npm run build:helper
npm run build
npm run desktop
```

O aplicativo bloqueia uso enquanto faltarem componentes, Ollama, modelo ou
helper. Instalar Ollama/modelo e autorizar microfone/PC sao operacoes separadas.
Qwen3:1.7b e sugestao inicial; custos de RAM/disco dependem do modelo escolhido.
O padrao Kokoro continua local e gratuito. Azure e opcional, exige uma chave
fornecida pelo usuario e envia o texto da resposta a Microsoft; pode consumir
cota ou gerar custos. Para a previa, configure JARVIS_AZURE_REGION e
JARVIS_AZURE_KEY somente no ambiente do servidor e reinicie-o manualmente.
Nunca use variaveis VITE_* para segredos. No EXE, configure em Ajustes > Voz.
Nao contratamos, instalamos nem ativamos um servico pago.

**Nao publicar binarios alpha.7 antes de resolver redistribuicao GPL do EPhone e
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

Execucoes permite revisar/autorizar planos. /agente na conversa prepara um plano,
sem executar. No modo completo + autonomia, observacao e comandos locais podem
seguir automaticamente, inclusive cliques/preenchimentos e criacao de textos,
apos autorizacao nativa por sessao. Lixeira, comandos PowerShell e controles
identificados como alto risco mantem aprovacao. Classificacao por rotulos e
melhor esforco, nao prova de seguranca. Interrupcoes nao repetem efeitos.
Um plano aprovado pode continuar o objetivo original usando os resultados
reais, sem executar novamente suas etapas. Limites operacionais: 24 ciclos,
64 etapas e 15 minutos por atendimento; planos atomicos continuam ate 8 etapas.

## Documentacao

- [Arquitetura e referencias desta rodada](docs/AUTONOMIA-E-VOZ-ALPHA5.md)
- [Voz, preparo e licencas da base alpha.4](docs/VOZ-E-AUTONOMIA-ALPHA4.md)
- [Pesquisa de projetos publicos](docs/PESQUISA-AGENTES.md)
- [Relatorio de testes alpha.5](docs/TEST_REPORT_ALPHA5.md)
- [Relatorio de testes e limites alpha.6](docs/TEST_REPORT_ALPHA6.md)
- [Apresentacao contextual, voz e testes alpha.7](docs/TEST_REPORT_ALPHA7.md)

src/core guarda estado e contratos; src/components guarda interface;
desktop guarda brokers, drivers e SQLite; tests guarda verificacoes.
Nao incluir segredos, bancos pessoais, capturas de audio ou dados de usuario.
