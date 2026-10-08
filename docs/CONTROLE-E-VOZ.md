# Controle do PC e voz: alpha 2

## Escopo real desta etapa

O produto continua independente do Painel. O usuario pode configurar e revogar
permissoes separadas para web, arquivos, desktop e administrador. Escolher
acesso total salva uma politica explicitamente confirmada; NAO transforma o
renderer em administrador ou ativa ferramentas que ainda nao existem.

No EXE, ampliar acesso exige tambem uma caixa nativa independente do renderer.
O primeiro executor externo implementado abre uma pesquisa no Bing no navegador
padrao: recebe somente texto limitado, monta a URL HTTPS internamente, valida
a origem IPC e verifica a autorizacao atual no backend. No modo supervisionado
o texto e destino sao apresentados antes de abrir. Nenhuma pesquisa e enviada
durante testes automaticos ou somente por abrir a interface.

Arquivos, controle de janelas/mouse/teclado e helper elevado ainda estao
indisponiveis, explicitamente identificados nos ajustes.
Ao adicionar um novo executor sensivel, sera necessario reconfirmar seu escopo;
preferencias antecipadas nao sao concessoes silenciosas para codigo futuro.

## Arquitetura para controle completo

- Agente comum sem administrador; helper Windows separado, elevado por UAC
  apenas para tarefas que realmente exigirem privilegios.
- Concessoes no broker nativo, nao decisoes de seguranca no renderer.
- Ferramentas com esquemas tipados, timeouts, cancelamento e resultado real.
- Automacao por UI Automation; capturas de tela somente com consentimento.
- Arquivos com preview, backup e lixeira por padrao; exclusao permanente,
  alteracoes de seguranca, credenciais e publicacao com confirmacao especifica.
- Pesquisa web/API: documentos recuperados sao dados nao confiaveis, nunca
  autorizacao para executar comandos ou transmitir arquivos pessoais.
- Helper com IPC autenticado, comandos limitados por capacidade, sem shell
  arbitrario exposto ao navegador ou modelo. Revogar bloqueia novos trabalhos.
- Registro dos pedidos, autorizacoes, falhas e resultados, sem senhas ou tokens.

Permissao geral nao deve eliminar confirmacoes de alto impacto. Acesso total
significa disponibilidade de ferramentas autorizadas, nao garantia de realizar
qualquer tarefa nem desativacao das protecoes do Windows.

## Animacao

A previa do usuario informou movimento reduzido. A alpha anterior pausava o
globo corretamente, mas nao deixava claro o motivo. Agora os ajustes mostram
esse estado e oferecem a escolha explicita de animar neste aplicativo.
Pausa manual, ocultacao da janela e modo economico continuam disponiveis.

Rotacao, orbitas e pulsos sao mais perceptiveis. Recebimento gera ondas;
processamento acelera aneis; escuta pulsa; resposta pronta e fala modulam o
nucleo. Sem analise de audio conectada, a animacao de fala e de estado, nao
uma medicao falsa da amplitude da voz. Processamento local rapido nao e
retardado artificialmente; a resposta aparece imediatamente.

## Voz

Esta etapa usa vozes disponibilizadas por SpeechSynthesis: selecao, idioma
pt-BR/en-GB, tom, velocidade, volume e teste. Nenhuma chave/API externa ou
clonagem foi ativada. Voz remota do navegador pode usar servicos do navegador;
o seletor identifica vozes reportadas como locais ou remotas.

Direcao artistica sugerida: masculina britanica, articulada, serena e precisa.
Ryan (Azure, en-GB) e vozes britanicas licenciadas da ElevenLabs sao candidatos
para uma futura comparacao audivel. Nao foram ouvidas e comparadas nesta rodada;
nao se afirma que alguma e a mais semelhante ou a voz exata do filme.
Uma voz original/clonada depende de autorizacao/licenca do titular.

Fontes oficiais consultadas:

- https://learn.microsoft.com/azure/ai-services/speech-service/language-support?tabs=tts
- https://elevenlabs.io/text-to-speech/british-accent
- https://help.elevenlabs.io/hc/en-us/articles/23143350045329-What-is-the-Voice-Library

Na entrada de voz do EXE, o motor dedicado continua pendente. No navegador,
captura so inicia por toque e consentimento, nao executa a transcricao sozinha.
