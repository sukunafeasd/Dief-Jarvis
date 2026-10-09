# Verificacao / 1.0.0-alpha.3

Rodada de 08/10/2026. Dados sinteticos em perfis Chromium separados e pastas
temporarias dedicadas. Nenhuma tarefa, memoria, arquivo pessoal, chave ou
configuracao do Painel Dief foi usada como fixture.

## Resultados

- `npm test`: 44 testes, 44 aprovados, zero falhas.
- `npm run test:browser`: aprovado. Desktop 1440x900/1920x1080 e viewports
  393x851/844x390, pixels e movimento do nucleo, configuracoes, comandos,
  autorizacao cancelada/aceita, execucao real de tarefas, etapas e reload.
- `npm run build`: aprovado. Nucleo Three permanece lazy; aviso de chunk acima
  de 500 KB continua informado, nao foi ocultado. Nenhuma dependencia nova.
- `npm audit` e `npm audit --omit=dev`: zero vulnerabilidades conhecidas.
- Sintaxe do broker Electron: conferida com Node.
- Portable Windows gerado usando output isolado depois de EPERM na substituicao
  de `release/win-unpacked`. Nao encerramos processos nem alteramos protecoes.
- 13 arquivos de runtime/frontend do ASAR identicos aos arquivos testados;
  versao e entrada verificadas. Scripts/config de build sao removidos do
  package.json pelo empacotador, portanto esse manifesto e comparado por contrato.

## Cobertura acrescentada

Planejamento sem efeito, autorizacao, cancelamento antes/durante execucao,
sucesso parcial, falha de etapa, interrupcao/reabertura sem replay, concorrencia,
retirada de permissao antes/depois do dialogo, preservacao de dados alpha anteriores.
Schema recusa shell, argumentos extras, ferramentas desconhecidas e planos longos.
IPC recusa transicoes internas e concessao de pasta forjadas pelo renderer.

Executor de arquivos testado com Node no Windows: criacao exclusiva, leitura,
listagem, traversal, dispositivos reservados, extensoes executaveis, junctions,
raiz vinculada, texto binario/UTF-8 invalido, tamanho e cancelamento.
Lixeira usa callback controlado nos testes: nao afirmamos ter validado o dialogo
Electron/shell.trashItem real nesta rodada.

Ollama testado com transportes/respostas controlados: host fixo, schema, filtro
de ferramentas, catalogo, erros HTTP, truncamento e resposta maliciosa. Sonda
real em 127.0.0.1:11434 recebeu conexao recusada; nenhum modelo real foi usado.

## Limites da validacao

Execucao completa do Electron continua pendente pelo bloqueio de abertura
"Acesso negado" observado na rodada anterior. Nao repetimos tentativas iguais
nem contornamos o Windows. Empacotar/conferir ASAR nao substitui teste nativo.
Voz real, UAC, controle geral do PC, Safari iOS/Android fisicos e navegacao
autonoma nao foram validados nem apresentados como prontos.

## Artefato local

`release/Dief-Jarvis-1.0.0-alpha.3.exe`, 102281221 bytes.
SHA256: `7B6B9615146D83049CED26BC823A527DD27DA5C23D1840E4BE98939E5F4BC0D4`.
ASAR SHA256: `c035adb48dcae94935ae2396f9c47e234a912a415bcec4903c8cd3a4d1f5e9c4`.
Sem publicacao de download no site e sem alegacao de assinatura digital.

Verificacao reproduzivel: `npm run verify:package -- <caminho/app.asar>`.
Capturas ficam em artifacts, fora do Git; o pipeline tambem gera suas evidencias
em perfil limpo. Servidor de previa local: http://127.0.0.1:5194/ .
