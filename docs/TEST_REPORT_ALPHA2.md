# Verificacao da alpha 2

Data: 2026-10-08. Versao: 1.0.0-alpha.2.

## Aprovado

- 22 testes Node: preservacao da alpha anterior, contratos, confirmacao e
  revogacao de acesso, limites de parametros de voz, falhas de sintese,
  concorrencia, integridade, isolamento IPC e protocolo de assets.
- Build Vite de producao. O chunk Three.js permanece lazy, com aviso de tamanho
  acima de 500 KB nao ocultado. O scan passou de 100 linhas independentes
  para um buffer de segmentos, reduzindo chamadas de desenho.
- Chromium/Playwright em quatro viewports: desktop, wide, mobile e landscape.
  Pixels e movimento do canvas, arrasto, overflow, persistencia, tarefas,
  auditoria, foco, pausa, movimento reduzido e override explicito.
- Estado visual de resposta, seis secoes de configuracoes, idioma persistido,
  cancelamento/confirmacao de ampliacao de acesso e revogacao na interface.
- npm audit: zero vulnerabilidades conhecidas reportadas nesta rodada.
- Previa real do usuario: movimento reduzido foi identificado. Com autorizacao
  do pedido de animacoes, foi selecionado "Animar neste aplicativo". O timestamp
  de frames do canvas voltou a avancar; dados locais anteriores foram mantidos.

## Limitacoes e bloqueio

A abertura do pacote nativo e do runtime Electron pelo ambiente retornou
"Acesso negado" antes de criar o perfil sintetico. Nao se alteraram protecoes
do Windows nem se contornou o bloqueio. Portanto, nao se considera aprovada
a execucao nativa da alpha 2. O teste da alpha 1 nao substitui esta validacao.

A pesquisa externa esta implementada no broker do EXE, mas nao foi exercitada
contra um navegador externo nesta rodada. Nao foram concedidos acessos reais
ao PC, efetuadas pesquisas externas pelo Jarvis, removidos arquivos pessoais
ou elevado o aplicativo. Autorizacoes de teste ficaram em contextos sinteticos.

Nenhuma amostra de voz foi ouvida/comparada com o filme. Testes da voz usam
doubles; o seletor real identificou Microsoft Daniel/Maria no navegador.
Safari iOS, aparelhos Android fisicos, microfone real, UAC e automacao do PC
continuam fora da validacao desta etapa.

Esta alpha nao inclui IA generativa, controle de arquivos/mouse/teclado,
helper administrador ou pareamento com o Painel. A interface explicita isso.
Nenhuma alteracao foi feita no site principal ou em seus downloads.
