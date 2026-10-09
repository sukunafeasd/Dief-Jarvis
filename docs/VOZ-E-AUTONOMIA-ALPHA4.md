# Voz e autonomia / alpha.4

Implementacao local independente do Painel Dief. Nao altera downloads, Mongo,
instalador ou producao do painel.

## Referencias e escolhas

- [Microsoft UFO](https://github.com/microsoft/UFO): observacao, ferramenta tipada,
  execucao e nova observacao. Implementacao propria, nao uma copia integral.
- [FlaUI](https://github.com/FlaUI/FlaUI): referencias de controles UI Automation,
  em vez de coordenadas de tela fixas. Usamos APIs Windows diretamente no helper.
- [Vosk browser](https://github.com/ccoreilly/vosk-browser): reconhecimento local
  em workers. Nenhum envio de audio para reconhecimento em nuvem no holograma.
- [Kokoro](https://github.com/hexgrad/kokoro) e
  [perfis oficiais](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md):
  Alex (`pm_alex`) em portugues e George (`bm_george`) em ingles britanico.
  George foi escolhido como aproximacao de estilo, nao como voz oficial,
  identica, autorizada pelo ator ou clonada do filme. Nao ha avaliacao objetiva
  provando que seja a voz mais semelhante entre todos os provedores existentes.

## Fluxo por voz

Central em modo holograma por padrao, sem campo de texto. Conversa escrita fica
em outra vista; menu, configuracoes e execucoes continuam acessiveis. No EXE a
janela abre em tela cheia; o botao correspondente pode sair desse modo.

A ativacao do microfone exige consentimento nesta sessao. O holograma usa
AudioWorklet e dois reconhecedores no mesmo relogio PCM: modelo ingles com
gramatica do nome Jarvis e modelo de comandos portugues. Para comandos em ingles
usa o modelo ingles tambem. O nome e removido por tempos das palavras, porque o
modelo portugues pode transcreve-lo como "jardim" ou "ja disse".

Somente comandos dirigidos ao nome seguem ao assistente. Dizer apenas Jarvis
abre uma janela de 8 segundos para completar o pedido apos a resposta falada.
Nao ha identificacao do falante: outra pessoa, gravacao ou TV pode despertar.
Sensibilidade e falsos positivos precisam de testes com vozes humanas reais.

O reconhecimento fica suspenso durante o atendimento/fala para nao ouvir a
propria resposta. Nao existe interrupcao por voz durante a fala nesta alpha;
use o botao de parar ou Escape. Ocultar/fechar a janela, sair da central ou
desativar escuta encerra tracks, contexto de audio e workers. Nunca guardamos
audio capturado. WAVs em artifacts sao somente frases sintetizadas de teste.

TTS: Kokoro ONNX q8 em CPU, phonemizacao multilanguage e estilos locais. Sem
download durante inferencia e sem custo por fala. Texto e dividido em trechos,
nao cortado silenciosamente. O worker libera o motor apos dois minutos ocioso.
Parar cancela tambem sintese pendente. A intensidade do nucleo segue o RMS do
audio realmente reproduzido/capturado, nao uma barra aleatoria.

O modo de microfone curto da vista de texto ainda usa Web Speech do navegador,
com aviso separado: esse caminho pode usar o servico do navegador. Nao o
confundir com a escuta local do holograma.

## Preparacao obrigatoria no EXE

Antes de atender pedidos, o broker verifica:

1. Oito arquivos de voz/reconhecimento (~167 MB), tamanho e SHA256 fixos.
2. Servico Ollama acessivel exclusivamente em 127.0.0.1:11434.
3. Modelo instalado e escolhido com consentimento para contexto local.
4. Helper Windows empacotado, tamanho e SHA256 do manifesto gerado pelo build.

Sem isso ha uma tela de preparo ou sair, nao um botao de ignorar. Preferencias
nao substituem verificacao real. O runtime Electron/Node e dependencias de
aplicacao sao empacotados; nao pedimos Python, Docker ou Node ao usuario final.
O helper depende do .NET Framework do Windows; o build falha se ele faltar.

Ollama: instalador oficial v0.40.1 fixo, ~1,58 GB, SHA256 conferido antes de
abrir. qwen3:1.7b e o modelo inicial sugerido (~1,4 GB); pode selecionar outro
modelo ja instalado. Tamanhos de modelo sao estimativas, nao promessa de RAM.
Modelos podem exigir varios GB de RAM. O usuario confirma downloads e qualquer
UAC/instalacao nativa. Nao instalamos Ollama neste computador durante esta rodada.

Downloads de dados verificam espaco, caminhos, symlinks/junctions, tamanho,
checksum e cancelamento. Somente arquivos completos e verificados sao ativados;
um arquivo ja valido e reutilizado. O downloader nunca executa codigo vindo de
uma pagina, prompt ou modelo. Os links de modelos sao fixos no manifesto.
SHA256 protege integridade do artefato fixado, nao substitui assinatura de editor.

## Permissoes e executores

Restrito/supervisionado/completo sao politicas do Jarvis, nao privilegios do
Windows. Acesso a web, arquivos, controles Windows e solicitacao de admin sao
separados, explicitamente consentidos e revogaveis. Microfone nao libera camera,
captura de tela, subframe, outra janela ou origem externa.

O modo completo + autonomia autoriza observacoes e comandos locais durante um
pedido. Cliques/preenchimentos Windows/web e criar/excluir arquivos continuam
com confirmacao nativa. O dialogo apresenta pagina/janela e controle observado,
nao somente uma referencia opaca. Observe novamente apos qualquer efeito.

21 ferramentas tipadas: tarefas, memorias, paineis, medidas informadas, status
local, listar/ler/criar/enviar arquivos para Lixeira, pesquisa externa,
abrir/observar/clicar/preencher navegador agente, listar/observar/focar/invocar/
preencher controles Windows, clima e manchetes de tecnologia.

- UI Automation: IDs de processo/janela e runtime de controles, limite de
  resultados, 20 segundos por helper. Sem shell livre, coordenadas de mouse ou
  execucao arbitraria. Terminais, registro, UAC e desktop seguro ficam manuais.
  Apps sem controles UIA compativeis, jogos e canvas nao sao controlados aqui.
- Navegador agente: sessao isolada, sem Node/preload/permissoes/downloads/popups.
  HTTPS publico, DNS conferido e IPs privados/reservados bloqueados, inclusive
  IPv4 mapeado em IPv6. Referencias expiram em 30 segundos; senhas, pagamento e
  uploads sao manuais. Logins, CAPTCHA e autenticacao nao sao contornados.
- Arquivos: pasta especifica escolhida pelo usuario, sem escapar por links,
  sobrescrever arquivos ou apagar pastas recursivamente. Nao e todo o disco.
- Admin: reiniciar somente o proprio executavel via UAC depois de confirmacao.
  Nao desativa protecoes nem aceita UAC automaticamente. Elevacao precisa de
  teste Windows real; liberar o lock antes de relancar evita rejeitar a nova
  instancia como duplicada. Cancelamento tenta preservar a sessao anterior.

DNS e validacao de caminho sao controles de melhor esforco: nao garantem
eliminar corridas locais/TOCTOU nem rebinding entre validacao e conexao do
Chromium. Paginas/janelas podem mudar entre dialogo e acao. Conteudo observado e
dado nao confiavel, nao uma autorizacao. Nao existe garantia formal de imunidade
a prompt injection. Limites/confirmacoes reduzem impacto, nao zeram o risco.

## Agente e dados na tela

Ollama recebe pedido, ate 8 mensagens, 20 memorias/tarefas e observacoes limitadas.
Schema exige ferramentas existentes e argumentos validos. Ate 5 ciclos/8 passos,
3 minutos por atendimento e timeout por ferramenta/provedor. Cancelar interrompe
o ciclo. Efeitos concluidos continuam registrados; nao ha repeticao automatica
de operacoes interrompidas. Nenhuma consciencia ou autonomia ilimitada e alegada.

Tarefas/memorias, temperatura Open-Meteo de cidade explicitamente informada,
status real do workspace e manchetes da API oficial Hacker News podem aparecer
no holograma. Noticias sao tecnologia, nao um feed geral/local. Origem e horario
acompanham os dados. "Corri dois quilometros" mostra 2 km como informacao do
operador; nao fingimos celular/relogio conectado nem sensor esportivo.

Persistencia: SQLite + safeStorage/DPAPI no EXE; IndexedDB sem cifragem no browser.
Auditoria encadeada detecta inconsistencias locais, mas nao e prova externa ou
protecao contra todo malware/usuario com controle do computador.

## Licencas e distribuicao

Kokoro/Vosk: Apache-2.0 nos projetos/modelos escolhidos (verificar notices por
artefato antes de redistribuir). Transformers.js: Apache-2.0. Dependencias
transitivas mantem suas proprias licencas.

EPhone 1.0.2/eSpeak: **GPL-3.0-or-later**. License integral em
licenses/EPhone-GPL-3.0.txt. Driver neural e worker marcados GPL-3.0-or-later.
Fonte upstream: https://github.com/sjmik/ephone-js. Integridade npm fixada no
package-lock. Nao encontramos gitHead no metadata npm; nao alegamos que um link
para main seja a fonte correspondente exata de uma distribuicao binaria.

O worker usa vinculacao no mesmo produto; colocar SPDX em dois arquivos NAO
resolve por si so as obrigacoes GPL do produto combinado. Esta rodada e privada
e nao publica EXE alpha.4. Antes de distribuir, decidir e cumprir licenciamento
do produto combinado, oferecer fonte correspondente completa (inclusive build
e espeak/phonemizador), preservar notices ou substituir o componente por outro
licenciado de forma compativel. Nao relicenciamos todo o projeto sem decisao.

## Validacao restante

Testes automatizados nao substituem microfone humano, Safari/Android fisicos,
Electron real, UAC, UIA em apps reais e inferencia Ollama instalada. A execucao
do Electron estava bloqueada neste ambiente numa tentativa anterior; nao
contornamos a restricao usando o helper para operar o computador do usuario.
