# Interface alpha: verificacao

Data: 2026-10-08. Versao: 1.0.0-alpha.1.

## Resultados locais

- 18 testes Node passaram: comandos, confirmacao, persistencia, concorrencia,
  falha de gravacao, auditoria, protocolo/IPC e ciclo de vida da voz.
- Build Vite aprovado. O renderer Three.js e carregado separadamente;
  permanece um aviso de chunk acima de 500 KB, nao ocultado.
- Playwright/Chromium aprovado em 1440x900, 1920x1080, 393x851 e 844x390.
  Verificados pixels do canvas, movimento, arrasto, enquadramento, overflow,
  comandos, reload, persistencia, ordem de paineis, foco, tema, tarefas,
  auditoria, pausa, navegacao mobile e movimento reduzido.
- npm audit: zero vulnerabilidades conhecidas reportadas nesta execucao.
- Aplicativo Windows empacotado passou no teste de interface com perfil
  sintetico separado. SQLite protegido disponivel, revisao persistida 2,
  window.require ausente e bridge restrita presente no renderer.
- Executavel portable gerado, sem instalar no perfil do usuario ou alterar
  downloads do Painel. Nao representa uma release estavel nem assinatura
  de publicador validada.

SHA256 do portable:

```text
C7E9802CB20FC531A7A124F46D64AF0B6B961E1A690113CF4E1226CB44AC54D2
```

## Alcance e limites

A primeira referencia TikTok foi aberta e sua interface observada. A segunda
pediu verificacao; nao foi contornada. As imagens fornecidas orientaram o
holograma e a composicao, sem copiar assets ou codigo do produto de referencia.

Nao foram testados microfone real, Safari iOS ou aparelhos Android fisicos.
Testes de voz usam doubles para validar o ciclo de vida. A entrada por voz
dedicada do EXE, IA generativa, conectores, automacao do Windows e sincronizacao
com o Painel ainda nao foram implementados nesta alpha.

Os testes nao garantem ausencia de bugs, nem substituem auditoria independente.
O historico local encadeado nao deve ser confundido com certificacao de seguranca.
Nenhum dado real do Painel, Mongo ou credencial integra este repositorio.
