# Dief Jarvis

Assistente pessoal independente do Painel Dief. Versao **1.0.0-alpha.4**.
Esta e uma alpha, nao a versao final 1.0 nem controle irrestrito do computador.

## Disponivel

- Holograma Three.js full-bleed, paletas ambar/ciano, movimento e reacao ao audio.
- Central por voz sem composer; menu recolhido; conversa escrita em outra vista.
- Escuta local consentida, AudioWorklet + Vosk, nome Jarvis e comandos PT/EN.
- Sintese neural local Kokoro: Alex em portugues e George em ingles britanico.
  Aproximacao de estilo, nao voz oficial/clone do ator do filme.
- Preparacao obrigatoria no EXE para componentes/modelo/executor ausentes.
  Downloads consentidos, verificados por tamanho/SHA256 e com cancelamento.
- Assistente Ollama com ferramentas tipadas, observacao/replanejamento, limites,
  permissao revogavel, confirmacoes sensiveis e historico de resultados reais.
- Executor Windows UI Automation e navegador agente isolado, sem shell livre.
- Arquivos em pasta escolhida; criar sem sobrescrever e excluir pela Lixeira.
- Tarefas, memorias, medidas informadas, status local, clima Open-Meteo e noticias
  de tecnologia Hacker News na tela, com origem. Sem sensores ficticios.
- SQLite protegido por safeStorage no EXE; IndexedDB no browser e auditoria local.

## Limites

A previa browser executa comandos locais e voz preparada, nao controla Windows
nem consulta um provedor LLM. Ferramentas nativas exigem o EXE preparado.
Nao pareamos Painel Dief/Mongo, celular, relogio, calendario ou e-mail.
Nao ha shell arbitrario, bypass de UAC/CAPTCHA, acesso a senhas, todo o disco ou
controle de jogos/apps sem UIA. O modo completo vale para ferramentas existentes.

Escuta so inicia apos consentimento. Outra pessoa/TV pode acionar Jarvis; nao ha
identificacao do falante. Durante a fala/processamento o reconhecimento pausa.
Use Escape ou parar para interromper; nao ha barge-in por voz nesta alpha.
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
```

Previa: http://127.0.0.1:5194 . Nenhum deploy de producao e feito por esses comandos.

Preparar/testar voz real local (downloads ~167 MB):

```sh
npm run prepare:voice
npm run test:synthesis
npm run test:voice
npm run test:wake
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
Sem servicos pagos ou envio de audio para TTS em nuvem.

**Nao publicar binarios alpha.4 antes de resolver redistribuicao GPL do EPhone e
validacao Windows real.** Scripts de pacote usam publish never; arquivos de
build/teste ficam fora do Git. Instalador/downloads do Painel Dief nao mudaram.

## Comandos

- Jarvis, mostre minhas tarefas.
- Jarvis, crie uma tarefa: revisar o projeto.
- Jarvis, lembre que prefiro respostas curtas.
- Jarvis, hoje eu corri dois quilometros.
- Jarvis, mostre status.
- Jarvis, temperatura em Porto Alegre. (EXE + web autorizado)
- Jarvis, mostre noticias de tecnologia. (EXE + web autorizado)
- Jarvis, liste janelas. (EXE + controles Windows autorizados)

Execucoes permite revisar/autorizar planos. /agente na conversa prepara um plano,
sem executar. No modo completo + autonomia, observacao e comandos locais podem
seguir automaticamente; cliques, preenchimentos e alteracoes de arquivos pedem
confirmacao nativa. Interrupcoes nao repetem efeitos concluidos.

## Documentacao

- [Voz, autonomia, preparo, riscos e licencas](docs/VOZ-E-AUTONOMIA-ALPHA4.md)
- [Pesquisa de projetos publicos](docs/PESQUISA-AGENTES.md)
- [Relatorio de testes alpha.4](docs/TEST_REPORT_ALPHA4.md)

src/core guarda estado e contratos; src/components guarda interface;
desktop guarda brokers, drivers e SQLite; tests guarda verificacoes.
Nao incluir segredos, bancos pessoais, capturas de audio ou dados de usuario.
