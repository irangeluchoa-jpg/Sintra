## Melhorias da conversa

Pessoa 1 fala português; Pessoa 2 fala o idioma escolhido no seletor. A direção da tradução e do reconhecimento é ajustada automaticamente ao selecionar o falante. Cada gravação inicia uma nova fala; a tradução é solicitada ao parar ou quando o reconhecimento encerra, sem enviar resultados intermediários repetidamente. Não é interpretação simultânea.

É possível copiar a tradução e baixar as últimas 30 falas como texto. O arquivo exportado permanece no aparelho até você apagá-lo. O histórico na página continua temporário. Há aviso de falta de conexão e controles com área de toque maior.

# Modo gratuito

O modo padrão funciona sem conta ou chave paga. Selecione Pessoa 1 ou Pessoa 2 antes de falar: a seleção é manual. O app traduz e mantém até 30 falas na memória da página; fechar/recarregar apaga o histórico. A MyMemory tem limites gratuitos e o reconhecimento de voz depende do navegador e de internet.

Pode hospedar os arquivos estáticos gratuitamente em um serviço HTTPS: index.html, styles.css, free.js, ai.js, mic-support.js, sw.js, manifest.webmanifest e os dois ícones PNG. O modo gratuito não precisa do servidor Node. A separação automática via AssemblyAI é opcional e continua exigindo uma chave/conta com créditos.

Para testar localmente, use `node server.mjs` ou `python3 -m http.server 8000`. Para instalar no celular, é necessário um endereço HTTPS público, ainda não configurado. Não há APK nem publicação na loja.

# Sintra

Aplicação web mobile instalável (PWA). Tradução pt-BR → inglês, espanhol, francês ou alemão, reconhecimento de voz do navegador e leitura da tradução. O modo IA usa AssemblyAI para transcrever uma gravação de até 60 segundos e separar os falantes por Pessoa A/B/etc. A análise acontece depois da gravação; não identifica pessoas pelo nome nem oferece diarização simultânea em tempo real.

## Executar

Node.js 22 ou superior, sem pacotes adicionais:

```sh
node server.mjs
```

O servidor escuta em `127.0.0.1:8000`. Para usar a IA, configure `ASSEMBLYAI_API_KEY` como segredo do servidor antes de iniciá-lo. Nunca coloque a chave no HTML ou no JavaScript enviado ao navegador. Uma conta com créditos na AssemblyAI é necessária; consulte os preços do provedor. Sem a chave, o modo IA fica indisponível, com uma mensagem na interface.

## Celular e publicação

É necessário hospedar este servidor atrás de um proxy HTTPS para instalar no celular e acessar o microfone. No Android compatível, use “Instalar Sintra” ou a opção de instalação do navegador. No iPhone, abra no Safari e escolha Compartilhar → Adicionar à Tela de Início. A interface pode abrir offline depois da primeira visita; reconhecimento de voz, tradução e IA precisam de internet. O suporte às APIs de voz varia conforme navegador e sistema.

Este servidor é para desenvolvimento e escuta somente em loopback. Antes de disponibilizar a API de IA publicamente, implemente autenticação de usuários, cotas e limites por usuário no servidor/gateway para controlar cobranças. Um endpoint sem autenticação não deve ser exposto na internet com a chave paga. Nenhum serviço de hospedagem foi configurado neste projeto.

## Dados

O reconhecimento de voz pode enviar áudio ao serviço do navegador. A tradução envia o texto à MyMemory. O modo IA solicita autorização antes de enviar a gravação à AssemblyAI. Os resultados ficam apenas na memória da página, sem localStorage. Apagar o resultado local não apaga dados no provedor; consulte sua política de retenção. Os rótulos de falantes são estimativas e podem errar com ruído, vozes semelhantes ou falas sobrepostas.

## Verificação

```sh
node --check server.mjs
node --check ai.js
node --test tests/*.test.mjs
```

A suíte local verifica arquivos servidos, manifesto e ausência de configuração da IA. Não valida a precisão do reconhecimento ou da separação de falantes; isso exige uma chave válida e teste com áudio real em um celular.

## Microfone permitido, mas transcrição recusada

A permissão do site e a disponibilidade do serviço de reconhecimento são verificações diferentes. Abra “Microfone não funciona?” e execute o teste de cinco segundos. Ele usa captura local e uma barra de volume, sem salvar ou enviar áudio.

- Se a captura for bloqueada, confira também as permissões de microfone do sistema operacional. No Windows, habilite o acesso para aplicativos da área de trabalho.
- Se abrir sem detectar volume, verifique mudo, dispositivo de entrada e volume.
- Se detectar áudio, mas o reconhecimento recusar, o acesso ao microfone está funcionando; o serviço de reconhecimento ou alguma política do navegador pode estar indisponível. Reinicie ou teste outro navegador compatível.

Teste automatizado no Chromium: recusa do reconhecimento simulada, captura com microfone virtual e recusa de captura simulada. Isso não verifica as permissões nem o hardware do aparelho do usuário.

## Correção de repetição na voz

Cada gravação usa uma instância independente de reconhecimento, configurada para uma fala por vez. O texto é reconstruído a partir do resultado completo do navegador, evitando acrescentar novamente resultados finais reenviados. A tradução e a leitura aguardam o término da captura. Eventos atrasados de sessões canceladas são ignorados. Repetições que fazem parte da fala, como “não, não”, são preservadas.

A suíte inclui cinco testes de regressão para resultados repetidos, revisões parciais, eventos atrasados, exclusão entre captura e leitura e falhas do reconhecimento. Os testes usam eventos simulados; a qualidade da transcrição real continua dependendo do serviço de voz do navegador e do ambiente acústico. O modo gratuito não ativa AssemblyAI.
