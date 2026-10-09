# Dief Jarvis alpha.6 - holograma, memoria e voz opcional

Data: 2026-10-09. Previa local desta rodada: http://127.0.0.1:5196/.

## Entrega

- Holograma como unica central: titulo centralizado, menu e tela cheia no canto.
  Sem legendas, composer, microfone ou pausa na tela principal. Texto manual fica
  em uma vista propria. Aviso de autorizacao aparece apenas para planos pendentes.
- Toque ativa a escuta e abre 12s para um comando direto. Segundo toque adormece,
  cancela fala/preparacao e encerra as tracks. Arrastar gira sem ativar. Enter e
  Espaco tambem acionam o nucleo. Escape interrompe a escuta na janela ativa.
- Deteccao local do nome no meio/fim da frase, janela de continuidade de 8s,
  reacao RMS ao audio e microfone silenciado para comandos enquanto fala/pensa.
- Animacao independente da preferencia do SO por padrao, com opcoes de economia,
  pausa e movimento reduzido. Migracao preserva dados e escolhas posteriores.
- Memorias, execucoes e auditoria reunidas em Nucleo e registros. Memoria
  automatica optavel de declaracoes pessoais claras, deduplicada e persistida
  na mesma transacao do chat. Nome/cidade podem ser atualizados. Nao memoriza
  perguntas, citacoes, segredos ou texto do assistente. Nucleo cheio nao promete
  uma gravacao que nao ocorreu. Contexto Ollama prioriza memorias relevantes e
  inclui ate 16 mensagens recentes, tratando notas como dados nao confiaveis.
- Pronuncia local corrigida para palavras PT inequivocas sem mudar o texto visivel.
- Integracao oficial Azure Speech preparada para Antonio/Caio em PT-BR. Nenhuma
  conta criada, chave real usada, assinatura contratada ou requisicao real feita.
  Padrao segue Kokoro local. Nao e voz oficial/clone da dublagem nem ha comprovacao
  de que um desses perfis seja o mais parecido com o ator.

## Verificacoes Executadas

- npm test: **89/89**, incluindo permissao, memoria, recuperacao, cancelamento,
  callbacks atrasados, ferramentas tipadas, SSML escapado, destino Azure fixo,
  rejeicao HTTP401 e cancelamento durante leitura de credencial (mocks).
- npm run build: passou, 1915 modulos. Aviso de chunks grandes de Vosk/Three.js
  permanece visivel; modelos/carregamento sao tardios. Nao ocultamos o aviso.
- npm audit e npm audit --omit=dev: **0 vulnerabilidades conhecidas** no resultado.
- npm run test:browser: cinco viewports, pixels e movimento sob preferencia de
  movimento reduzido, arraste, menu, tarefas/planos reais locais, memoria/reload,
  registros agrupados, opcoes Azure e ausencia de composer fora da vista escrita.
- npm run test:hologram: quatro viewports, dados de tarefa/medida persistidos,
  tela cheia, canvas nao vazio/movimento e fixture de preparacao obrigatoria.
- npm run test:touch: Chromium com audio sintetico, captura/worklet/RMS reais,
  toque duplo durante preparacao, escuta autorizada com visibilidade simulada
  como oculta e tracks encerradas ao adormecer. Sem microfone fisico.
- npm run test:wake e test:voice: modelos Vosk reais em Chromium, audio sintetico,
  comando com nome reconhecido e amostra sem nome sem acionamento. Os modelos
  podem errar palavras; nao ha garantia de reconhecimento em qualquer ambiente.
- npm run test:synthesis: Kokoro real em CPU, WAVs validos para Dief/PT, Santa,
  Alex e George. Primeira sintese Dief de ~7s levou ~11.2s neste equipamento.
- npm run test:voice-stream: dois trechos reais, primeiro audio ~5.9s enquanto
  proximo seguia em preparo. Latencia inicial continua dependente da CPU/modelo.
- npm run test:startup: caches isolados, falha de importacao deliberada, aviso
  recuperavel e reload que restaura a interface sem limpar dados.
- node --check desktop/main.cjs e git diff --check: passaram.
- Navegador interno: menu, ajustes, selecao Azure sem chave, retorno a Kokoro e
  central conferidos. Evidencias locais em artifacts/, fora do Git.

## Correcoes Encontradas Nesta Rodada

- Fundo do menu mobile sobrepunha a navegacao e bloqueava cliques: z-index e
  especificidade corrigidos; botao de fechar agora visivel em todos os tamanhos.
- Ativacao assincrona podia completar depois de um segundo toque: token de geracao
  invalida a preparacao antiga antes de obter o microfone.
- Teste de wake abria a escuta do app e a da fixture juntas: isolamento corrigido,
  repeticao passou com exit code 0. Nao foi contornado o consentimento real.
- Resquicios dos controles/legendas antigos removidos; teste atualizado para a
  geometria real da nova central e aviso de autorizacao mantido separado.
- Cancelamento Azure antes de carregar a chave podia deixar uma requisicao tardia:
  geracao invalida o pedido. Minimizar/ocultar com escuta de fundo desligada cancela
  os dois motores de voz. Selecao Azure fixa idioma PT-BR compativel com os perfis.

## Limites e Seguranca

Permissao do navegador/Windows continua obrigatoria. Autoescuta so e tentada com
permissao ja concedida; tocar pode abrir o prompt do sistema. Escuta ao minimizar
fica configuravel; SO/navegador podem suspende-la. Nao ha escuta depois de fechar
o processo, identificacao do falante ou barge-in. Audio do microfone nao e salvo.

Acesso PC, PowerShell e elevacao nao foram ativados implicitamente. Operacoes
sensiveis preservam autorizacao; UAC nao e contornado. Controle do PC nao funciona
na previa browser. Nao executamos comandos nativos reais, UAC ou UI Automation
nesta rodada. Validacao do EXE Windows segue pendente; nao foi publicado binario.

Chave Azure no EXE usa safeStorage em voice_secret, separada de estado/memoria,
exportacao JSON e auditoria. Esse caminho nativo foi revisado, mas nao validado
com chave real. Previa permite chave apenas no ambiente do servidor, nunca VITE_*.
Selecionar Azure pode enviar texto a Microsoft e gerar custos quando configurado.

Redistribuicao GPL/EPhone continua pendente antes de qualquer binario distribuido.
Nao houve mudanca no Painel Dief, Mongo, instaladores ou downloads de producao.

## Referencias Primarias

- Azure Speech, catalogo de idiomas/vozes:
  https://learn.microsoft.com/pt-br/azure/ai-services/speech-service/language-support?tabs=tts
- Kokoro, perfis publicados:
  https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
