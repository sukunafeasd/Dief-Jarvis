# Referencias e implementacao / alpha.5 / 2026-10-09

Evolucao privada do Dief Jarvis; sem alterar o Painel Dief, seus downloads,
Mongo ou dados de producao. Fontes publicas foram estudadas como referencias;
nao importamos/executamos um Jarvis de terceiros nem copiamos seu projeto.

## Referencias primarias consultadas

- Microsoft UFO: https://github.com/microsoft/UFO e documents/docs/mcp/overview.md.
  Separacao entre planejamento, registro de ferramentas, observacao e executor.
- InterGenJLU Jarvis: https://github.com/InterGenJLU/jarvis e core/tts.py.
  Mistura de embeddings Kokoro, pipeline por frases, ferramentas/skills distintas.
- Bluematter Jarvis: https://github.com/bluematter/jarvis.
  Transporte local de voz e reproducao por partes. Nao copiado integralmente.
- AJC0520 Jarvis: https://github.com/AJC0520/jarvis.
  Ollama, clima, informacoes, configuracao por servico. Nao ativamos suas
  integracoes Google Calendar/Home Assistant nem fingimos estarem conectadas.
- Thaynabarreiro Jarvis: https://github.com/Thaynabarreiro/jarvis-second-brain.
  Preferencias e comandos explicitos. Tambem usa AntonioNeural no seu caminho
  de voz online. Nao incorporamos um acesso nao documentado ao servico Edge.
- Kokoro: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md.
  Vozes PT pm_alex/pm_santa e perfis britanicos; nao sao vozes oficiais de filmes.
- Microsoft Speech: https://learn.microsoft.com/pt-br/azure/ai-services/speech-service/language-support?tabs=tts.
  Vozes masculinas PT Antonio, Caio e outras. Servico cloud exige conta/chave e
  consentimento para enviar texto; nao foi contratado nem ativado nesta alpha.
- Open-Meteo: https://open-meteo.com/en/docs. Campos diarios reais, fonte/hora.
- PowerShell: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1.
  EncodedCommand UTF-16LE evita montar comandos atraves de cmd/shells diferentes.

## Pedido, ferramenta, observacao, nova decisao

Ollama continua sendo o provedor realmente implementado. Escolha do modelo e
consentimento de contexto permanecem no broker nativo; nenhuma chave foi
colocada no renderer e nenhum provedor pago foi habilitado. A previa browser
nao consulta um LLM nem controla Windows; executa o catalogo local.

O assistente recebe nome/cidade, hora, tarefas com IDs, ultimas mensagens,
memorias e observacoes. Cada ciclo Ollama pede uma ferramenta, nao uma cadeia
cega de cliques. Operacoes web/Windows retornam recibo + observacao posterior.
Se a observacao falha, o recibo permanece e a verificacao e marcada indisponivel.
Enviar um clique nao prova sucesso da tarefa; o modelo deve ler o resultado.

Busca web agora abre Bing dentro do navegador agente e devolve DOM observado.
O resultado e informacao nao confiavel; nao e uma nova ordem. WAF, CAPTCHA,
login, paginas dinamicas e falhas de rede ainda podem impedir leitura. Nao foi
validada uma sessao Electron real de pesquisa nesta rodada.

28 ferramentas tipadas. Acrescentadas: task.list/search/complete, memory.search,
weather.forecast, system.hardware e command.execute. Busca de memoria e lexical
normalizada, nao uma busca vetorial/FAISS. Busca de tarefas alcanca itens antigos
fora da primeira pagina e devolve IDs existentes, nunca um indice inventado.

Depois de autorizar/concluir um plano no modo autonomo, AssistantSession.resume
usa o objetivo e os resultados salvos. Nao reexecuta a etapa concluida nem
inventa uma nova mensagem do usuario. Alteracoes repetidas pelo modelo sao
interrompidas com explicacao; observacoes de leitura podem repetir.

Nao e autonomia ilimitada: ate 24 ciclos/64 etapas/15 minutos por atendimento,
para conter loops e uso indefinido de recursos. Planos de ate 8 etapas continuam
suportados. Campos/resultados/contextos tambem possuem limites de armazenamento.
Interromper nao desfaz efeitos nem garante parar todo processo externo iniciado.

## Acesso amplo e consentimento

Modo completo + autonomia + consentimento nativo por sessao permite operacoes
rotineiras sem confirmar cada clique/preenchimento/criacao de texto. O grant
da sessao nao fica no banco. Reabrir pede autorizacao nova; revogar acesso invalida
o grant. Alterar politica durante preflight interrompe antes do proximo efeito.

Rotulos de controles indicam alto risco (comprar, enviar, publicar, excluir,
senha, instalar etc.) e mantem dialogo. Essa classificacao e heuristica, pode
errar e NAO garante detectar todo efeito sensivel. Paginas podem mudar entre
observar, aprovar e clicar. O operador precisa acompanhar o historico.

Permissao de arquivos aceita um disco inteiro quando escolhido no dialogo do
Windows, modo completo e confirmacao adicional. APIs de arquivo usam caminhos
relativos, nao atravessam links/junctions, nao sobrescrevem e nao apagam pastas.
Codigo (.js/.py/.ps1 etc.) pode ser criado como texto, sem executar por isso.
Leitura direta continua limitada a textos pequenos; nao ha parser PDF/Office.

PowerShell tem permissao separada + arquivos/pasta autorizados e SEMPRE exige
revisao nativa do script integral (incluindo prefixo UTF-8) antes de executar.
O processo usa binario fixo do Windows, sem shell:true, sem perfil interativo,
sem ExecutionPolicy Bypass. Pode executar codigo arbitrario com os privilegios
atuais, acessar a rede e arquivos fora da pasta de trabalho: NAO e sandbox.
O script pode ser perigoso mesmo quando gerado para um pedido aparentemente
inofensivo. Nenhuma protecao formal contra prompt injection e alegada.

Timeout/limite de saida/cancelamento tentam encerrar a arvore do processo via
taskkill e aguardam a tentativa antes de liberar o executor. Processos que se
destacam/reiniciam/escapam podem sobreviver. Pode haver efeitos parciais, sem
rollback. ExitCode 0 NAO prova que o objetivo foi atingido. A revisao do script
e indispensavel; nenhum comando real foi executado pelo executor nesta rodada.

Administrador depende do UAC e direitos do Windows. Senhas/CAPTCHA/desktop seguro
nao sao contornados. Este modo nao cria capacidade visual para jogos/canvas ou
conexao ficticia a celular/relogio, e nao garante controle de qualquer programa.

## Voz portuguesa padrao

O usuario escolheu estilo da dublagem PT, nao ingles. Novo perfil local dief_pt:
80% pm_alex + 20% pm_santa, embeddings nativos portugueses. Receita de mistura
inspirada no padrao Kokoro dos projetos, com implementacao propria/validacao.
Novos workspaces recebem Dief/PT. O antigo padrao Alex migra uma vez; escolher
Alex novamente ou manter outra voz e respeitado. Nenhuma memoria e apagada.

Nao encontramos uma voz oficial da dublagem disponibilizada para incorporar.
Este e um perfil sintetico de estilo, NAO clone do dublador, voz licenciada do
filme ou comparacao objetiva provando "a mais parecida". Amostras locais para
avaliacao humana: artifacts/jarvis-dief-pt.wav, jarvis-santa.wav e jarvis-alex.wav.

O nono componente pm_santa.bin e fixado na mesma revisao HF, 522240 bytes e SHA256
8b012db3185778afe2e45a62cbad69db73021774fe68dda634bcc748a982eede. Total verificado:
167556784 bytes. Mistura exige vetores finitos, shape correto e pesos somando 1.

VoiceChannel separa frases, normaliza unidades/Markdown apenas na fala, sintetiza
no maximo um trecho a frente e toca o atual sem esperar o texto inteiro. RMS
continua medido do audio real. Cancelar resolve o playback pendente, encerra
sintese e descarta partes atrasadas. Sem envio de microfone/TTS para nuvem.

O pipeline e por partes, nao streaming de tokens do LLM nem audio instantaneo.
CPU/modelo precisam de tempo. Nesta maquina: primeiro audio de teste ~6,17 s;
houve pausa de ~1,49 s entre as duas partes. Nao garantimos mesma latencia em
outros PCs. Audio de teste e sintetico, sem microfone humano.

## Distribuicao e validacao pendentes

EPhone/eSpeak GPL da alpha.4 continua exigindo decisao/licencas/fonte completa
antes de distribuir o produto combinado. Nenhum EXE alpha.5 foi publicado.
Nao reinstalamos Electron/Ollama para contornar a execucao anteriormente negada.
Microfone humano, UAC, UIA em apps reais, comandos PowerShell reais, inferencia
Ollama instalada e comportamento nativo completo continuam pendentes.
