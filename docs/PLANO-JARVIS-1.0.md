# Dief Jarvis 1.0 - Plano de produto e engenharia

Data: 08/10/2026. Estado: somente planejamento, sem implementacao ou deploy.
Nome de trabalho: Dief Jarvis. Uso inicial: assistente pessoal do Cafe no Windows.

## 1. Decisao principal

Recomendo EXE proprio na primeira versao, conectado ao Painel Dief, mas com
nucleo compartilhavel. Ele funciona sem precisar deixar o Painel aberto.
O site oferece apresentacao, conversa basica, tarefas, lembretes e configuracoes;
as ferramentas de computador pertencem ao aplicativo desktop.

Motivo concreto encontrado no projeto: o Painel usa launcher elevado e fluxo de
verificacao de administrador. Um assistente com IA, voz, arquivos e integracoes
nao deve herdar esses privilegios continuamente. Um processo filho nao perde
automaticamente a elevacao do pai nem representa uma barreira de seguranca.

Depois de medir desempenho e separar privilegios, podemos oferecer modo embutido.
Os dois modos usam o MESMO nucleo, dados locais e contrato de ferramentas.
Nao criar duas memorias divergentes ou dois assistentes concorrendo no mesmo PC.
EXE separado nao garante ser mais leve: dois shells Electron abertos tambem
custam RAM. Nao prometer consumo zero quando o assistente estiver ativo.

| Caminho | Beneficio | Custo/risco | Decisao |
| --- | --- | --- | --- |
| Dentro do processo principal atual | Uma instalacao | Acopla IA, elevacao e estabilidade ao Painel | Rejeitado |
| Modulo sob demanda em host nao elevado | Reusa shell/tema | Precisa separar privilegios e medir | Opcao posterior |
| EXE proprio com nucleo compartilhado | Vida propria, minimo privilegio, release proprio | Pode duplicar shell quando ambos estao abertos | Recomendado 1.0 |

## 2. Leitura da referencia

A pagina publica de Lucas Victor apresenta voz, memoria, briefing, HUD,
multiplos monitores, provedores de IA e conexoes com rotina e dispositivos.
Inspira o produto, mas nao permite auditar o software interno ou provar que
todos os exemplos funcionam com qualquer conta ou equipamento.
[Referencia consultada](https://jarvis.lucasvictor.ai/).

Objetivo: experiencia semelhante com identidade Dief e ferramentas reais.
Nao copiar codigo, imagens, voz de terceiros ou dados da demonstracao.
Sem numeros, conexoes ou operacoes inventadas. Jarvis e software, nao consciencia
ou IA infalivel. Identidade comercial final e licencas devem ser verificadas
antes de uma distribuicao publica ampla.

## 3. Definicao da 1.0

Assistente pessoal persistente de voz/texto que organiza rotina, consulta fontes
autorizadas, lembra preferencias e executa tarefas tipadas no Windows.
Toda acao possui permissao, resultado verificavel e historico.

Tres estados de entrega:
- Nucleo obrigatorio: necessario para chamar o produto de 1.0.
- Conector opcional 1.0: so fica operacional depois de conectado e testado.
- Extensao posterior: arquitetura prevista, nunca anunciada como pronta.

Primeiro usuario: Cafe. Estrutura owner_id desde o inicio, impedindo que outro
membro consulte contexto, arquivos ou dispositivos dele. Liberar para outros
usuarios exige testes especificos de isolamento, quotas e recuperacao.

## 4. Jornada diaria pretendida

1. Abrir Dief Jarvis pelo atalho proprio ou pelo Painel.
2. Autenticar a conta e desbloquear o perfil local.
3. Ver microfone desligado, fontes disponiveis e horario dos dados.
4. Ativar voz por tecla/botao; palavra de ativacao e opcional.
5. "Organiza minha tarde": consulta fontes e propoe, sem alterar a agenda sozinho.
6. "Abre meu ambiente de trabalho": executa rotina autorizada, verificando cada passo.
7. "Me lembra amanha": resolve data/fuso, esclarece ambiguidades e salva de verdade.
8. Internet cai: tarefas, memorias e historico local permanecem.
9. Ao fechar, escolher sair ou manter somente os recursos autorizados na bandeja.

## 5. Interface do EXE

Centro de comando: conversa central, contexto pertinente ao lado e trilha de
execucao visivel. Janela compacta, tela cheia e paineis adicionais sob demanda.
Nao abrir widgets ou janelas secundarias durante a inicializacao.

| Area | Conteudo |
| --- | --- |
| Conversa | Texto/voz, anexos escolhidos, fontes e propostas |
| Meu dia | Agenda, tarefas, pendencias e briefing |
| Automacoes | Rotinas, gatilhos, teste, permissao, pausa e execucoes |
| Memoria | O que sabe, origem, validade, corrigir, esquecer, exportar |
| Conexoes | Contas autorizadas, escopos, ultimo sucesso, revogacao |
| Computador | Apps/pastas permitidos, foco e diagnostico |
| Historico | Solicitado, aprovado, executado, falhou, cancelado, incerto |
| Configuracoes | Voz, personalidade, privacidade, tema, custos, desempenho |

Visual: acompanha os tokens do tema do Painel, com identidade propria, superficies
coerentes, cor de destaque, linhas precisas e iluminacao moderada. HUD compacto
com nivel de audio REAL; nao uma animacao fingindo ouvir.
Sem texto cortado ou botao decorativo sem funcao. Animacoes curtas, pausa quando
oculto e movimento reduzido. Widgets exibem fonte e horario de atualizacao.

Estados obrigatorios: bloqueado, inativo, ouvindo, transcrevendo, consultando,
aguardando confirmacao, executando, falando, offline, erro e pausado.
Parar/cancelar sempre acessivel. Escape interrompe fala; atalho global configuravel
para abrir/falar, com validacao de conflitos. Acesso por teclado e leitor de tela.

## 6. Ferramentas obrigatorias

| Grupo | Ferramentas | Regra |
| --- | --- | --- |
| Conversa | Streaming, continuidade, contexto pertinente | Nao reenviar historico inteiro |
| Voz | PTT, transcricao, resposta falada, interrupcao | Captura visivel e autorizada |
| Memoria | Guardar, corrigir, esquecer, buscar, exportar | Origem e controle do dono |
| Rotina | Tarefas, subtarefas, prioridades, lembretes, repeticoes | Persistencia antes do sucesso |
| Briefing | Resumo de hoje/noite e pendencias | So dados reais, datados |
| Apps | Abrir permitido, focar janela, URL autorizada | Allowlist, nao comando livre |
| Windows | Volume, midia, rede, espaco, diagnostico | Funcoes especificas |
| Arquivos | Busca em pastas escolhidas, texto/PDF, resumo | Escopo e tamanho limitado |
| Organizacao | Propor renomear/mover, preview, lixeira, desfazer | Confirmacao e verificacao |
| Pesquisa | Noticias/RSS e web com fontes | Conteudo externo nao confiavel |
| Automacao | Sequencias, horarios, condicoes e teste seco | Idempotencia e cancelamento |
| Integracao Dief | Conta, tema, diagnostico, abrir ferramentas | Nao duplica moedas/inventario |
| Privacidade | Pausar tudo, desconectar, ver/excluir dados | Sem coleta oculta |
| Recuperacao | Backup, exportacao, restore e integridade | Teste em perfil novo |

Pedidos de exemplo:
- "Me lembra de pagar a internet sexta as 10h."
- "Quais tarefas ficaram abertas?"
- "Procura o PDF do orcamento na pasta autorizada."
- "Resume esse documento e indica a origem dos valores."
- "Abre VS Code e navegador de trabalho."
- "Baixa o volume para 30%."
- "Como esta meu PC?" sem atribuir causa a metricas inexistentes.
- "Propoe organizar esses arquivos, sem mover ainda."
- "O que lembra sobre mim? Esquece essa preferencia."
- "Desliga microfone e acompanhamento de janelas."

## 7. Integracoes e cobertura do projeto desejado

Nao integrar vinte servicos antes de estabilizar o nucleo. A matriz estabelece
o primeiro recorte e como chegar depois a cobertura mais ampla da referencia.

| Integracao | Escopo | Entrega |
| --- | --- | --- |
| Google Calendar | Ler, propor, criar evento aprovado | Opcional 1.0 |
| Gmail | Priorizar, resumir, rascunho, envio confirmado | Opcional 1.0 |
| Google Drive | Arquivos escolhidos, nao varredura irrestrita | Opcional 1.0 |
| Obsidian/Markdown | Pasta local, busca, escrita confirmada | Opcional 1.0 |
| Noticias/RSS e clima | Fontes e localidade escolhidas, cache datado | Nucleo conectado |
| Notion | Bases e paginas selecionadas | Posterior |
| Outlook | Agenda/email Microsoft autorizados | Posterior |
| Slack | Canais autorizados e rascunhos | Posterior |
| WhatsApp | Definir modalidade suportada e limites | Pesquisa separada |
| iMessage | Nao prometer acesso nativo no Windows | Fora da 1.0 |
| Spotify | Controle/leitura suportados pelo provedor | Posterior |
| Home Assistant | Estados e dispositivos autorizados | Experimental posterior |
| Impressora 3D | Estado; iniciar/cancelar confirmado | Posterior; depende do equipamento |
| WHOOP, Strava, Oura | Dados da conta conectada | Posterior; depende de API/OAuth |
| Apple Saude | Ponte iOS, HealthKit e consentimento | Fora da 1.0 Windows |
| Financas pessoais | CSV voluntario, categorias, resumos | Posterior, leitura |
| Mercado/DiefTrade | Informacao com fonte/atraso | Posterior, sem operar dinheiro |
| MCP | Ferramentas tipadas de servidores aprovados | Um adaptador aprovado na 1.0 |
| Camera/gestos | Presenca/gestos, nao autorizar acao critica | Pesquisa posterior |
| Reconhecimento do dono | Windows Hello, quando suportado | Opcional apos validar autenticacao |

Gmail exige OAuth/escopos: senha SMTP do Painel nao libera a caixa de entrada.
Alguns escopos exigem verificacao e outros requisitos para dados em servidor.
[Escopos oficiais](https://developers.google.com/workspace/gmail/api/auth/scopes).
Desktop usa navegador do sistema e fluxo suportado com PKCE.
[OAuth desktop](https://developers.google.com/identity/protocols/oauth2/native-app).

WhatsApp nao e especificado como API irrestrita de todas as mensagens pessoais.
A documentacao Meta nao ficou acessivel nesta pesquisa: validar modalidade,
politicas, custos e consentimento antes de fechar escopo. Nao exportar cookies
ou fazer scraping de sessao silenciosamente como atalho.

HealthKit requer app/capacidade/permissoes Apple; o EXE Windows nao ganha acesso
direto ao Apple Saude. [Apple](https://developer.apple.com/documentation/xcode/configuring-healthkit-access).
Home Assistant tem API autenticada; acesso ao servidor nao substitui permissao
para agir em cada dispositivo. [API](https://developers.home-assistant.io/docs/api/rest/).

## 8. Voz e personalidade

Personalidade brasileira, prestativa, direta, com humor configuravel e jeito
Dief. Configurar tratamento, apelido, genero/pronomes, formalidade, humor e
tamanho de respostas. Nao impor "senhor" em toda frase nem imitar voz protegida.

Dois modos, nunca dois capturadores simultaneos:
- Economico: ativacao -> transcricao -> IA -> TTS em streaming.
- Conversa fluida: voz em tempo real com interrupcao e limites de consumo.

PTT obrigatorio. Palavra "Jarvis" opcional, detector local, avaliado em portugues,
ruido e falsos acionamentos. Nao enviar ambiente inteiro continuamente a APIs.
Palavra de ativacao ou reconhecimento de locutor nao autenticam o dono.

Candidatos a avaliar: whisper.cpp para transcricao local opcional, Porcupine
para ativacao sujeito a licenca/acesso, voz Windows instalada como fallback,
ElevenLabs ou equivalente para fala natural. Sem modelos grandes no instalador.
[whisper.cpp](https://github.com/ggml-org/whisper.cpp),
[Porcupine](https://picovoice.ai/docs/porcupine/),
[ElevenLabs streaming](https://elevenlabs.io/docs/eleven-api/concepts/audio-streaming).

OpenAI oferece WebRTC com credenciais efemeras para clientes; chave permanente
nunca entra no JavaScript do site. [Documentacao](https://developers.openai.com/api/docs/guides/voice-webrtc).
Modelo/voz definitivos dependem de benchmark, preco e acesso na implementacao,
nao do nome exibido na demonstracao. Pausar ao bloquear Windows, trocar conta,
deslogar ou revogar permissao. Nao armazenar audio bruto por padrao.

## 9. Cerebro e decisao

```text
texto/voz -> contexto permitido -> interpretacao tipada -> proposta
            -> politica -> aprovacao -> executor -> verificacao -> historico
```

IA propoe ferramenta/parametros; executor decide se pode agir. Prompt, email,
PDF ou MCP nunca concedem autorizacao. Mostrar resumo operacional e alvos,
nao pensamento interno do modelo como justificativa de seguranca.

Resolver deterministicamente horario, volume e abertura de apps. Modelo rapido
para conversa/triagem; raciocinio mais caro somente quando necessario.
Uma sessao ativa de voz, tarefas paralelas limitadas. Timeout, cancelamento,
limite de passos e protecao contra loops. Resultado incerto nao vira "feito".

Offline: tarefas, memorias, lembretes e comandos locais permitidos. Conversa
generativa offline somente se houver modelo local opcional testado. Sem API/
modelo, explicar indisponibilidade; nao fingir pesquisa ou lembranca inexistente.

## 10. Memoria com logica

Camadas: conversa recente, episodios datados, fatos/preferencias duradouros,
contexto de trabalho autorizado e dados de conectores com validade.
Registro: id, dono, origem, data do fato/coleta, validade, sensibilidade,
confianca, versao e escopo. Inferencia marcada; conflito nao sobrescreve fato
silenciosamente. Contexto antigo nao e estado atual do computador.

"Vou sair daqui a pouco" e episodio temporario; "prefiro resposta curta" pode
virar preferencia corrigivel. Senha, token e informacao de terceiros nao viram
memoria comum. Documento indexado nao executa instrucoes escritas nele.

Compartilhar com mascote so fatos do dono autorizados por ele. Personalidade
e historico separados. Jarvis nao envia contexto automaticamente para recados,
visitas ou conversas entre mascotes. Aplicar permissao ANTES da recuperacao,
inclusive vetorial. Esquecer remove indice, resumos derivados e filas elegiveis.

## 11. Arquitetura

```text
Dief Jarvis.exe: usuario normal, Electron/React local
  -> broker: sessao, permissoes, segredos, transporte
  -> core: memoria, planejamento, rotinas, conectores
  -> workers sob demanda: voz, documentos, indexacao
  -> adaptadores Windows com comandos tipados
  -> SQLite e diario de sincronizacao

Site /jarvis -> API autenticada -> tarefas web / proxy de IA com quota
                              -> Mongo: dados web + snapshots privados cifrados

Painel EXE -> abrir Jarvis / tema / ferramenta aprovada
           (nao hospeda IA no processo elevado)
```

Electron/React aproveita experiencia existente. UI local, nao pagina remota com
Node. Context isolation, sandbox, CSP, preload minimo e IPC validado por janela,
frame, sessao, schema e permissao. TypeScript nos modulos novos e JSON Schema
nos contratos. Helpers Windows seguem os padroes C# conhecidos.

Workers utilityProcess ajudam responsividade, nao garantem confinamento;
broker nao entrega todas as chaves a todos os workers.
[Electron utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process).
Uma instancia por perfil/dispositivo, mutex e transacoes. Sem listener exposto
na rede. IPC com identidade Windows e handshake; origem web sozinha nao
autoriza ferramenta. Callback OAuth loopback curto/validado, nao API local aberta.

Estrutura futura, nao criada:

```text
jarvis/core        contratos, memoria, policy, jobs
jarvis/desktop     UI, preload, broker, bandeja
jarvis/windows     helpers tipados
jarvis/connectors  Google, pastas, RSS, adapters aprovados
jarvis/web         integracao /jarvis
jarvis/tests       unidade, seguranca, voz, UI, integracao
jarvis/docs        contratos, ADRs, operacao, recuperacao
```

Pode ficar no monorepo, com build/release independentes. Nao precisa criar
outro repositorio agora. Bibliotecas novas exigem versoes/licencas/SBOM e
compatibilidade com Electron; nao escolher framework extra sem necessidade.

## 12. Dados locais, Mongo, chaves e recuperacao

SQLite com transacoes, WAL e migracoes versionadas; gravar antes do ACK.
Anexos privados cifrados em area propria. Validar biblioteca SQLite/packaging.
Nao instalar uma copia inteira do Mongo no computador.

Entidades: perfis/dispositivos/permissoes; mensagens; memorias e fontes;
documentos; tarefas/lembretes; rotinas/gatilhos; jobs/aprovacoes/efeitos;
conectores/referencias de credenciais; preferencias; outbox/cursores/versoes/
tombstones; manifests de backup e resultados de restore.

Mongo: namespace jarvis_* e filtro owner_id obrigatorio. Conta estavel, dominio
nao identifica dados. Conversas/memorias privadas/snapshots cifrados no cliente
antes de sincronizar, com chave diferente de JWT e do cofre do Painel.
Metadados de tarefas que o dono tornar disponiveis na web podem ser legiveis
ao servidor; a escolha e classificacao ficam visiveis.

Credenciais pessoais/API keys no desktop, protegidas pelo sistema. safeStorage
usa DPAPI no Windows; nao substitui backup portavel da chave nem protege contra
todo malware no mesmo usuario. [Electron](https://www.electronjs.org/docs/latest/api/safe-storage).
Chave de dados aleatoria, protegida localmente; recuperacao por segredo forte
do dono ou dispositivo autorizado. Troca de senha nao destroi chave de dados.
Perder todos os dispositivos E o segredo pode tornar o backup indecifravel.

Sync: outbox persistida, IDs globais, versoes, deduplicacao, backoff e conflitos
explicitos. ACK local nao significa copia remota. Mostrar: salvo neste PC,
sincronizando, salvo remotamente, conflito ou falhou. Exclusao cria tombstone;
restore antigo reaplica exclusoes/revoga sessoes para nao ressuscitar dados.

Backup SQLite por API/snapshot consistente: nao copiar arquivo vivo ignorando
WAL. Cifrar, gerar integridade/manifests. Politica inicial: snapshot local apos
lotes; externo no maximo a cada 2h online; retencao sugerida 7 diarios,
4 semanais, 3 mensais ajustada a quota. Backup Mongo inclui jarvis_*, mas exige
restore com chaves: aparecer no ZIP nao prova recuperacao.

RPO remoto alvo 2h online, sujeito a rede; local confirmado deve sobreviver a
reinicio normal. Medir RTO por restauracao real. Sem promessa absoluta de
"nunca perder". Exportacao portavel cifrada e ensaio de restore sao obrigatorios.

## 13. Conta e sessoes

O Painel tem regra de sessao substituida por outro dispositivo. Nao copiar
esse fluxo para Jarvis e desconectar site/EXE quando abrir o assistente.
Criar autorizacao de dispositivo Jarvis separada, derivada da conta, audiencia
propria e escopos estreitos. Pareamento/revogacao explicitos. Preservar regra
do Painel; nao remover protecao global para integrar.

Sem permissao automatica de admin/cofre ou contexto de outra conta. Logout/
bloqueio cancela acoes pendentes; bandeja nao sensivel apenas se consentida.
Windows Hello pode desbloquear chaves quando suportado; camera/voz reconhecida
nao substituem autorizacao. [Windows Hello](https://learn.microsoft.com/en-us/windows/apps/develop/security/windows-hello).

## 14. Automacoes

Rotina = gatilho, condicoes, passos tipados, escopos, aprovacao, politica de
erros e historico. IA auxilia a montar; a definicao salva e editavel.
Gatilhos 1.0: manual, hora/data, repeticao, app autorizado, tarefa/lembrete.
Preview e teste sem efeitos. Texto encontrado em email nao vira gatilho.

Exemplos: modo trabalho abre apps/tarefas; modo jogo silencia/pausa indexacao;
organizar downloads propoe e aguarda; resumo da noite usa dados reais; aviso
de compromisso permite adiar/concluir.

Job persistido com dono, alvo, etapas, IDs, prazo e estado. Editar rotina
invalida aprovacao antiga. Duplicacao nao cria dois eventos/envios. Quando
provedor nao tem idempotencia, verificar resultado e tratar retorno ambiguo
como incerto; nao repetir automaticamente efeito externo.

PC desligado: nada local executa. Lembrete vencido aparece como atrasado na
volta; nao executar lote destrutivo/enviar atrasado silenciosamente. Acordar
PC via agendador Windows e futuro/consentido. Lembretes web independentes
nao fingem PC ligado; hospedagem que dorme nao garante horario exato 24h.

## 15. Seguranca de acoes

| Nivel | Exemplos | Politica |
| --- | --- | --- |
| Consulta | Agenda, PC, pasta autorizada | Escopo concedido |
| Reversivel | Volume, abrir app, tarefa local | Permissao e log |
| Externo | Email, evento | Preview e aprovacao especifica |
| Destrutivo | Mover/excluir/fechar app com trabalho | Preview, confirmacao e rollback viavel |
| Privilegiado | Limpeza/configuracao administrativa | Helper curto, UAC, escolha explicita |
| Financeiro/autenticacao | Comprar/pagar/senha/2FA | Dono conclui; nao autonomo 1.0 |

Aprovacao vinculada a acao, alvo, conteudo, hash do plano, versao e prazo.
Qualquer mudanca exige reconfirmar. Voz inicia proposta, mas acao sensivel
exige aprovacao forte local. Sem eval, shell arbitrario, segredo irrestrito ou
desativar antivirus/firewall. Helper elevado nao hospeda IA/conectores.

Tela: janela/trecho escolhido, indicador, exclusao de login/cofre/bancos/OTP;
sem guardar screenshot por padrao. Observacao de app/titulo opt-in, nao keylogger.
PDF/email/pagina/MCP nao confiaveis. Descricao de ferramenta nao concede escopo.
[Seguranca MCP](https://modelcontextprotocol.io/docs/draft/tutorials/security/security_best_practices).
Tokens fora de logs/prompts/URLs/exportacoes abertas. Renovar chaves antigas
expostas antes de implementar; separar custos/escopos das APIs do mascote.

## 16. Reaproveitamento do Painel

Reusar bibliotecas puras: tema, diagnostico, normalizacao, desempenho, hashes,
verificacao de update e formatos. Adaptar identidade/manifesto/chaves ao Jarvis.
Reusar principio de IPC seguro, nao oferecer todos os handlers atuais a IA.
Limpeza forte mantem preview, limites de caminhos/idade e confirmacao; nunca
"limpar tudo" interpretado livremente. Overlay usa medidas reais/unidades.
Mascote separado; arbitragem de audio evita Jarvis/mascote/alertas falando juntos.

## 17. Aba do site

Entregar apresentacao real, requisitos/download, dispositivos pareados,
conversa basica, tarefas/lembretes, configuracoes e historico autorizado.
Memorias so as tornadas acessiveis pelo dono. Sem acesso irrestrito ao Windows.

Pedido web para PC exige dispositivo online, pareado, escopo, prazo e aprovacao
local em efeitos sensiveis. Controle remoto completo fora da primeira liberacao.
Para memoria cifrada, navegador precisa desbloquear chave e enviar apenas
contexto minimo aprovado ao modelo. Servidor nao promete ler o que nao decifra.
Sem ponte HTTP local aberta. Vercel serve web/API, nao microfone/processo Windows
permanente; nao usar coordenador dos jogos como cerebro do Jarvis.
Quando houver desenvolvimento real, substituir rotacao ficticia por versao,
changelog e estado verificavel. Dados demonstrativos separados dos reais.

## 18. Desempenho

Metas propostas, nao resultados atuais nem garantias:

| Cenario | Meta inicial |
| --- | --- |
| Encerrado | Nenhum processo Jarvis/chamada IA |
| Bandeja sem voz/conectores ativos | CPU media <=1% total, sem GPU dedicada |
| Standby cloud sem UI | Investigar 100-220 MB no total dos processos |
| UI + voz cloud | Investigar 250-500 MB, sem modelos locais |
| Abrir UI aquecida | p95 <=1s no equipamento de referencia |
| Comando local simples | Feedback <=150ms; resultado p95 <=1s quando viavel |
| Voz online | Primeiro audio alvo 1-3s; medir p50/p95/rede |
| Parar audio/cancelar | Feedback imediato, audio para ate 300ms |
| Modo jogo | Meta de variacao FPS <=2% em ensaio repetido |

Revisar faixas conforme benchmark; nao sacrificar seguranca por numero bonito.
Modelos locais podem consumir muito mais RAM/GPU e tem orcamento separado.
Carregamento sob demanda, workers, cache limitado, incremental sync, cancelamento,
backpressure, descarte de buffers e pausa de UI oculta. Sem captura 24h/polling
de milissegundos/indexacao irrestrita. Auto-start opt-in.
Baseline Windows 11 x64; Windows 10 depende do suporte real das dependencias/SO,
nao prometer sem teste. Ensaiar 8/16/32 GB; Linux/macOS fora da 1.0.

## 19. Custos e provedores

Nenhuma contratacao agora. Nao prometer tudo gratuito: IA, voz, pesquisa,
armazenamento, verificacao OAuth e dispositivos podem ter custos. Assinatura
de app/chat nao e automaticamente credito de API.
Limite diario/mensal escolhido pelo dono, estimativa antes de tarefa longa,
minutos/tokens/provedor/custo real quando disponivel. Limite interno ajuda,
mas nao garante corte instantaneo da cobranca do provedor.

Perfis: economico (texto/PTT/contexto enxuto), equilibrado (voz natural/cache),
privado/local (modelos opcionais/hardware). API pessoal no desktop, nunca no
EXE publico ou compartilhada entre contas. Chat web usa proxy com quota ou
ponte desktop escolhida, nao chave pessoal no navegador. Sem fallback pago
silencioso e sem consultar todos os provedores por mensagem.
Validar modelos/precos/licencas oficiais ao implementar, sem cotacao contratada.

## 20. Diagnostico e status

Metricas: primeiro token/audio, tempo de ferramentas, retries, erros, fila,
sync, cache e consumo. Logs redigidos, sem dados pessoais em tracing externo
por padrao. Nucleo/voz/conectores/memoria/sync/backup com ultima verificacao.
Desativado, offline, dormindo, falhou, reautorizar e pronto sao distintos.
Inatividade nao e falha da IA; nao pagar chamadas para manter indicador verde.
Backup sinaliza destino e integridade, nao apenas geracao local.

## 21. Testes e criterios de aceite

Portoes obrigatorios: nenhuma acao critica sem aprovacao; nenhum vazamento
entre donos/dispositivos; nenhum efeito confirmado duplicado; nenhuma falha
disfarcada de sucesso; restore/migracao real; nenhum fallback pago oculto.

Unidade: schemas, datas/fusos, policy, replay, idempotencia, scopes de memoria,
cancelamento, rotinas, tombstones, chaves, quotas.
Integracao: SQLite/Mongo sinteticos, OAuth expirado/revogado, API 429/500,
conector interrompido, caminho perigoso, email/calendar fake e rede caindo.
Adversarial: PDF/email/MCP tentando exfiltrar segredo, executar shell ou
alterar rotina; frame nao autorizado, alvo trocado depois de aprovado, elevacao.
Windows: escala 100/125/150/200%, monitores negativos, trocar microfone,
sleep/resume, bloqueio, sem admin, UAC cancelado, update interrompido.
Mobile web: Safari iOS/Chrome Android reais, teclado, touch, rotacao, duplicacao.
Voz: portugues, nomes pessoais, ruido, TV, eco, interrupcao e falsa ativacao;
corpus autorizado, nunca gravacao escondida.

Aceitacao: pelo menos 50 pedidos reais com resultado esperado verificavel;
meta >=95% nos pedidos suportados. Fora do escopo exige recusa/esclarecimento.
Casos de seguranca critica precisam todos passar, nao apenas boa media.
Benchmark: 5 execucoes por perfil, p50/p95, CPU/RAM de TODOS os processos,
start frio/quente, 24h standby, jogo com/sem. Emular viewport nao equivale
a testar iPhone. Testes destrutivos nunca usam arquivos reais do dono.

## 22. Ordem de desenvolvimento

| Etapa | Entrega | Portao |
| --- | --- | --- |
| A | Hardware/orcamento/privacidade/escopo | Decisoes aprovadas |
| B | EXE minimo, nao elevado, IPC, benchmark | Policy e UI validas |
| C | Texto, memoria, tarefas, historico | Offline/reinicio preservam |
| D | Apps/volume/pastas/preview | Acoes tipadas seguras |
| E | PTT/TTS/interrupcao; wake opcional | Voz/privacidade medidas |
| F | Google/pastas/RSS escolhidos | OAuth/quotas/reautenticacao |
| G | Scheduler/jobs/dry-run/pausa | Duplicacao/reconexao/sleep |
| H | Mongo/sync/chaves/backup/web | Restore/isolamento |
| I | HUD/temas/acessibilidade/multimonitor | Hardware real |
| J | Candidato 1.0/instalador/rollback | SBOM/testes/aceite/pos-deploy |

Prototipo isolado e sintetico -> alpha pessoal -> beta autorizado -> 1.0.
Nao publicar automaticamente por fase. Sem prazo total antes de prototipo de
voz/hardware/OAuth; existem dependencias externas que nao controlamos.

## 23. Instalador e atualizacao

Icone/appId/userData/manifestos proprios; nome no Windows Dief Jarvis.
Instalador atualiza Jarvis, nao substitui Painel. Manifesto RSA/hashes e
avaliacao de Authenticode publico; RSA nao equivale a reputacao Windows.
Update pausa efeitos, salva fila, snapshot, migracao e integridade.
Rollback precisa ser compativel com schema; nao voltar binario antigo sobre
schema novo sem estrategia testada. Dados fora da pasta de instalacao.
Chaves fora do Git/build/log. Deep links aceitam IDs/rotas, nao comando shell.

## 24. Fora da 1.0

Consciencia/autonomia irrestrita; controle de qualquer app/dispositivo;
webcam/gravacao oculta; operacoes financeiras autonomas; senha/contorno 2FA;
ler todos os chats/cofre de todos; todos os conectores sem conta/licenca;
modelo local grande preinstalado; dependencia obrigatoria de GPU; demonstracao
apresentada como atividade real. Nada disso sera anunciado como pronto.

## 25. Decisoes antes de implementar

1. CPU, RAM, GPU, Windows e monitores.
2. Orcamento mensal e economico versus voz fluida.
3. Primeiros conectores: proposta Calendar + Gmail + pastas.
4. Dados na nuvem versus somente locais.
5. Segredo de recuperacao e copia externa.
6. Voz/tratamento/humor/palavra de ativacao.
7. Somente Cafe versus beta multiusuario.
8. Confirmar EXE proprio 1.0; embutido so apos separar privilegios.

Defaults: pessoal, EXE proprio, cloud sob demanda, PTT, wake desligado ate
configurar, sem camera, sem autostart, sem admin, Google opcional, pastas
selecionadas, backup privado cifrado e controle dos efeitos externos.

## 26. Resultado esperado

Conversar por voz/texto com continuidade; memoria controlavel; rotina organizada;
fontes conectadas reais; ferramentas seguras; resultados verificaveis. Dados
confirmados persistem, sao exportaveis/restauraveis e pertencem a mesma conta
quando o dominio muda. Identidade propria e central de comando funcional.
A matriz posterior conduz ao objetivo mais amplo; a 1.0 so recebe esse nome
quando o nucleo estiver utilizavel e verificado.

Este plano nao criou aplicativo, conta, conector, chave, automacao, banco,
repositorio ou deploy. Somente documentacao para discutir e executar depois.
