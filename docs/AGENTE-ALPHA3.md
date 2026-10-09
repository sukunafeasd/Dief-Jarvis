# Contrato de execucao / alpha.3

## Ciclo e armazenamento

Pedido -> planning -> planned -> autorizacao -> running -> completed.
Falhas, cancelamento e interrupcao sao terminais. Uma unica operacao ativa por
controlador. Etapas locais gravam efeito + resultado na mesma transacao.
Efeitos de sistema nao sao atomicos com SQLite; se houver queda entre efeito e
checkpoint, a proxima abertura marca interrupted, nunca reexecuta por conta propria.
Usuario precisa verificar o efeito antes de criar novo plano.

Historico: ate 100 execucoes e 2 MB, 8 etapas por plano, detalhes/resultados persistidos
com o restante do workspace. Rotacao descarta primeiro um registro terminal
antigo; planos pendentes nao sao descartados silenciosamente. Auditoria local
tem a mesma rotacao/limites da alpha anterior. Isso nao e backup permanente.
IndexedDB no browser, SQLite protegido pelo safeStorage no EXE. Migracao adiciona
campos sem apagar tarefas, mensagens, memorias ou reescrever auditoria existente.

## Planejamento e contexto

Local: comandos explicitos, combinados por `;`. Ollama: `/api/tags` e `/api/chat`
em host/porta fixos de loopback, sem redirects, sem chaves e sem instalar modelos.
Timeout: 5 s catalogo / 60 s planejamento. Resposta limitada a 128 KB,
JSON validado, ferramentas/argumentos desconhecidos recusados. Resposta truncada
ou plano vazio nao executam. Nao ha raciocinio privado exposto como auditoria;
mostramos resumo/plano/efeitos observaveis.

Configuracao explicita envia ultimas 8 mensagens e ate 20 memorias, com limites
por entrada. Contexto e tratado como dados, nao autorizacao. Isso reduz mas nao
elimina prompt injection: controle efetivo e feito pelo broker/schema/operador.
O servico local pode usar sua propria nuvem; nao afirmamos offline garantido.

## Permissoes e ferramentas

Planos nunca executam ao serem preparados. Revisao/autorizacao inicial e sempre
necessaria. Restrito/supervisionado tambem pede dialogo nativo por etapa externa.
Completo dispensa apenas esse dialogo; nao concede shell, UAC ou todo o disco.
Permissoes sao rechecadas antes e depois do dialogo. Mudanca da pasta aborta.

- task.create / memory.create / screen.open: transacoes no nucleo local.
- web.search: abre pesquisa Bing no navegador, nao coleta resultados.
- workspace.list: lista ate 200 entradas da pasta concedida.
- workspace.read: UTF-8 regular ate 16 KB, sem binarios/links.
- workspace.create: .txt/.md/.json/.csv, criacao exclusiva, sem sobrescrever.
- workspace.trash: arquivo regular para Lixeira do sistema; pastas recusadas.

Renderer nao pode chamar transicoes internas `agent.*`. Broker so aceita
pedidos pelo canal proprio/top frame, com limite de chamadas. Pasta so pode ser
concedida pelo seletor nativo. Scripts/execs, caminhos absolutos, traversal,
dispositivos Windows, links e junctions sao recusados. Nao existe isolamento
contra outro processo malicioso trocando diretorios durante a operacao: os
checks de caminho nao substituem um sandbox de sistema ou filesystem por handles.
Use uma pasta dedicada e nao um compartilhamento controlado por terceiros.

## Cancelamento e falhas

Cancelamento para planejamento e proximas etapas. Uma chamada ao sistema que
ja terminou e registrada como concluida, mesmo se o cancelamento chegou no meio;
nao afirmamos rollback. Operacoes nativas atuais nao sao forcadamente terminadas
no meio de uma escrita. Prazo total 3 min verificado entre etapas, nao encerra
dialogo do operador ou syscall pendente. Nenhum retry automatico de efeitos.
Falha de persistencia depois do efeito exige verificar arquivos/navegador;
nao pode virar promessa de exatamente-uma-vez para recursos externos.

## Fora desta entrega

Controle geral de mouse/teclado/janelas, leitura autonoma do navegador, shell,
elevacao/UAC, wake-word, agenda/e-mail, sincronizacao Painel/Mongo e replanejamento
ReAct dependem de executores posteriores. Nada disso fica ativo por selecionar
modo completo. Configuracao de modelo nao equivale a prova de qualidade do modelo.
