---
name: oficios-depatri
description: Preparar ofícios e mandados do DEPATRI a partir de modelos existentes no Drive, dados do caso e numeração disponível; criar documento, PDF, rascunho de e-mail e controlar pendências de envio/resposta.
---

Use esta habilidade quando o usuário pedir criação, adaptação, consulta, envio, acompanhamento ou resposta de ofício, mandado de intimação ou documento equivalente do DEPATRI.

## Fonte dos modelos
Consultar sempre a configuração em `references/config-oficios.md`.

## Fluxo de geração
1. Identificar o tipo de documento e o destinatário.
2. Consultar o caso/procedimento indicado para recuperar somente os dados necessários.
3. Consultar `DB_TEXTOS_DOCS` e selecionar o Google Docs-modelo correto pelo `MODELO_DOC_ID`.
4. Copiar o modelo inteiro; não recriar o documento do zero.
5. Preservar cabeçalho, logomarca, tabelas, rodapé, formatação e assinatura já existente no modelo.
6. Usar o numerador correto; nunca inventar número.
7. Preencher datas, períodos, placas, IPs, IMEIs, e-mails, pessoas, empresa e demais campos conforme o pedido.
8. Criar o Google Docs/PDF somente quando solicitado.
9. Depois que o ofício for criado com sucesso, criar/atualizar obrigatoriamente o controle de pendência descrito abaixo.
10. Se o usuário pedir e-mail, preparar rascunho no Gmail por padrão; enviar somente quando ele pedir explicitamente.
11. Quando o usuário perguntar se houve resposta, pesquisar o Gmail pelo número do ofício, procedimento, destinatário e contexto.

## Integração com o Kanban
Consultar também `../assistente-ocorrencias/references/kanban-diligencias.md`. O acompanhamento do ofício deve aparecer no Kanban de diligências, usando um único cartão que muda de etapa conforme envio, espera, resposta e revisão.

## Pendência obrigatória de cada ofício
Cada ofício criado deve possuir um único registro de acompanhamento em `PENDENCIAS_OFICIOS`, vinculado pelo `ID_OFICIO`.

### Dados que nunca podem faltar
- ID_PENDENCIA
- ID_OFICIO
- NUM_OFICIO
- TIPO_DOCUMENTO
- DATA_PEDIDO
- EQUIPE
- TIPO_PROCEDIMENTO
- NUMERO_PROCEDIMENTO
- DESTINATARIO, quando conhecido
- EMAIL_DESTINATARIO, quando conhecido
- LINK_DOC
- LINK_PDF

### Estado inicial
Além do registro em `PENDENCIAS_OFICIOS`, criar/atualizar o cartão correspondente em `KANBAN_DILIGENCIAS` com `STATUS_KANBAN = A_FAZER` e `ETAPA = ENVIAR_EMAIL`.

Imediatamente após a criação bem-sucedida do ofício:
- STATUS_ENVIO = `PENDENTE`
- DATA_ENVIO = vazio
- STATUS_RESPOSTA = `AGUARDANDO_ENVIO`
- DATA_RESPOSTA = vazio

### Quando o e-mail for enviado
No Kanban, mover o mesmo cartão para `AGUARDANDO_TERCEIRO` e definir `ETAPA = AGUARDAR_RESPOSTA`.

Atualizar o mesmo registro:
- STATUS_ENVIO = `ENVIADO`
- DATA_ENVIO = data/hora real do envio
- STATUS_RESPOSTA = `AGUARDANDO_RESPOSTA`
- guardar MESSAGE_ID/THREAD_ID do Gmail quando disponíveis.

### Quando houver resposta
No Kanban, mover o mesmo cartão para `PARA_REVISAR` e definir `ETAPA = ANALISAR_RESPOSTA`.

Após localizar uma resposta inequívoca vinculada ao ofício:
- STATUS_RESPOSTA = `RESPONDIDO`
- DATA_RESPOSTA = data/hora da mensagem recebida
- guardar MESSAGE_ID_RESPOSTA e/ou THREAD_ID
- não apagar DATA_PEDIDO, EQUIPE ou NUMERO_PROCEDIMENTO.

### Se o e-mail for enviado fora do plugin
O comando "verifique respostas dos ofícios pendentes" deve:
1. listar os registros com STATUS_RESPOSTA = `AGUARDANDO_RESPOSTA`;
2. pesquisar Gmail por NUM_OFICIO, NUMERO_PROCEDIMENTO, destinatário e assunto;
3. só marcar como RESPONDIDO quando houver correspondência suficientemente clara;
4. se houver dúvida, apresentar a mensagem encontrada e pedir confirmação antes de dar baixa.

## Regras de integridade
- Não criar uma segunda pendência para o mesmo `ID_OFICIO`; atualizar a existente.
- `DATA_PEDIDO` é a data/hora da criação do ofício e nunca muda.
- `EQUIPE`, `TIPO_PROCEDIMENTO` e `NUMERO_PROCEDIMENTO` devem vir do registro do ofício/caso, nunca de inferência.
- Não marcar como enviado apenas porque existe um rascunho.
- Não marcar como respondido apenas porque existe nova mensagem do mesmo domínio; deve haver vínculo com o ofício/procedimento.
- Se a geração do documento falhar, registrar a falha em `INTEL_OFICIOS`, mas não criar uma pendência de envio como se o ofício estivesse pronto.

## Assinatura
- A assinatura oficial que já estiver incorporada ao Google Docs-modelo deve ser preservada na cópia.
- Nunca gerar, desenhar ou inventar assinatura.
- Se futuramente houver assinatura dinâmica, ela deve vir de cadastro autorizado e estar vinculada à autoridade competente, não ao usuário que apenas gerou o documento.

## Comandos equivalentes
Interprete frases naturais como:
- "Faça um ofício de imagens"
- "Faça ofício para a Localiza"
- "Faça ofício para o provedor"
- "Faça ofício de telefonia"
- "Faça ofício para o iFood"
- "Faça um mandado de intimação"
- "Prepare o e-mail do ofício"
- "Envie o ofício"
- "Quais ofícios estão pendentes de envio?"
- "Quais estão aguardando resposta?"
- "Verifique respostas dos ofícios pendentes"

## Regras gerais
- Não modificar o conteúdo jurídico/administrativo do modelo sem pedido.
- Não inventar destinatário, endereço, e-mail ou período.
- Se houver vários modelos possíveis, escolher pelo tipo de solicitação e pelo destinatário; perguntar somente se continuar ambíguo após consultar os modelos.
- Retornar links apenas para arquivos realmente criados.
