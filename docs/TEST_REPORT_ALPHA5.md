# Verificacao alpha.5 / 2026-10-09

Sem modificar downloads/site/Mongo do Painel Dief. Sem executar tarefas em apps
do usuario, comandos pelo novo executor, Ollama ou microfone fisico.

## Executado

- npm test: 79/79; consentimento, preflight, revogacao, retomada, IDs de tarefas,
  memoria, previsao, hardware, mistura de voz, cancelamento/streaming com mocks.
- npm run build: aprovado; entrada ~343 KB / 105 KB gzip. Globo/Vosk lazy.
  Aviso de chunk grande mantido, nao escondido. Vosk nao carrega na abertura.
- npm run test:browser: aprovado; quatro viewports, movimento/pixels, comandos,
  persistencia, foco, tema e movimento reduzido.
- npm run test:hologram: aprovado; quatro viewports, cards, fullscreen,
  preparacao obrigatoria por fixture e controles DOM em fixture.
- npm run test:voice e test:wake: aprovados; modelos Vosk reais, microfone WAV
  sintetico, AudioWorklet e comando dirigido. Fala negativa nao gerou comando.
- npm run prepare:voice: nove componentes com SHA/tamanho, 167556784 bytes.
- npm run test:synthesis: audio neural real em CPU; perfil Dief/PT produziu
  WAV 350204 bytes / 7,295 s, sintese ~12,94 s da frase completa. Tambem Alex,
  Santa, George e positivos/negativos sinteticos de reconhecimento.
- npm run test:voice-stream: aprovado; Kokoro real -> HTTP local -> Audio real
  Chromium -> RMS/fases. Dois trechos; primeiro audio ~6172 ms, antes do segundo
  pronto. Evidencia JSON em artifacts/voice-stream-evidence.json. Nao e medicao
  do desempenho de um EXE final nem prova de qualidade subjetiva da dublagem.
- Consulta real Open-Meteo: Porto Alegre retornou sete dias e campos validos.
- Consulta real Node os: hardware/memoria/cores do host; sem inventar carga CPU.
- node --check main.cjs/preload.cjs: aprovado. Nenhum teste Electron real.
- npm audit: nenhuma vulnerabilidade conhecida reportada; nao e garantia de
  seguranca nem valida scripts produzidos por um LLM.

## Correcoes e melhorias

1. Pesquisa apenas externa, sem leitura: navegador agente retorna dados reais.
2. Operacoes rotineiras sempre pediam confirmacao: politica unificada e grant
   nativo por sessao. Alto risco e comandos continuam com dialogo.
3. Politica podia mudar durante preflight sem parar o efeito: comparar politica
   antes de executar. Revogacao/alteracao chega ao executor, nao so ao checkbox.
4. Plano aprovado terminava sem seguir objetivo: retomada usa resultado salvo.
5. Modelo podia repetir escrita em ciclos: fingerprint canonico impede repeticao.
6. Tarefas sem IDs para LLM/conclusao: listar/buscar/completar por ID real.
7. Tarefas antigas fora da primeira pagina: busca encontra itens mais antigos.
8. Resposta de voz aguardava todo WAV: preparo de um trecho a frente/playback.
9. Cancelar playback podia deixar promessa pendente: resolver/limpar media,
   parar sintese e ignorar audio atrasado, com teste de regressao.
10. Unidades/Markdown lidos como simbolos: normalizacao apenas do texto falado.
11. Clima so atual: previsao diaria validada, cidade persistida e fonte visivel.
12. Status local confundido com hardware: ferramenta OS separada com valores reais.
13. Novo acesso a comandos e a discos: consentimentos explicitos, diretorio real,
    script integral, Unicode, cancelamento da tentativa e historico de recibos.
14. Saida grande podia perder o recibo apos efeito: preservar observacao parcial
    marcada, em vez de tratar um efeito enviado como se nunca tivesse ocorrido.
15. Perfil PT padrao e comparacao de vozes; migracao nao substitui escolhas novas.
16. Consultas locais devolviam JSON longo: resumo curto baseado nos dados reais,
    resultado completo no historico e aviso explicito em respostas parciais.

## Nao alegado como aprovado

Electron, UIA, UAC, execucao de comandos e modelo Ollama real, pesquisa Bing no
browser Electron, microfone humano, sotaques, falsos positivos e dispositivos
iOS/Android fisicos. Contratos/mocks nao substituem esses testes.

Classificador de controles e melhor esforco. PowerShell aprovado e codigo sem
sandbox, pode acessar a rede e arquivos fora da area escolhida. Nao ha garantia
de detectar todo alto risco ou de interromper todo processo destacado. Campos
web protegidos e UAC permanecem manuais. Fonte/licencas GPL ainda bloqueiam a
distribuicao binaria. Alpha.3 antiga nao contem estas mudancas.

## Correcao da previa branca / 2026-10-09

- Reproduzido na aba real do navegador interno: HTML 200, mas src/main.jsx
  retornava 504 Outdated Request. O Vite antigo estava com ambiente de
  transformacao fechado/reiniciando; apenas servir HTML nao provava saude.
- Encontrado cache de otimizacao compartilhado entre servidores de testes e
  desenvolvimento. Separados desenvolvimento e cada suite para evitar colisao.
- O processo antigo nao foi encerrado: a tentativa de parar/reiniciar foi
  bloqueada pelo ambiente. Nova previa iniciada normalmente na porta livre 5196.
  Nao houve exclusao de IndexedDB, bancos ou dados pessoais. Dados de navegador
  da origem 5194 continuam naquela origem; a nova porta e uma origem distinta.
- Tela inicial escura e guard estatico de carregamento, com mensagem e botao
  Recarregar em falha/demora. Bootstrap captura falha do import antes do React.
- npm run test:startup: aprovado; outro servidor de testes nao derruba o
  servidor ativo; import bloqueado mostra recuperacao, recarregar restaura UI.
- npm test 79/79, test:browser e build aprovados novamente. Arquivo publico
  startup-guard.js conferido no dist e no verificador de pacotes (sem novo EXE).
- Confirmado na aba real do usuario: holograma visivel, src/main.jsx HTTP 200,
  voz preparada com nove componentes. Captura artifacts/preview-restored.png.
