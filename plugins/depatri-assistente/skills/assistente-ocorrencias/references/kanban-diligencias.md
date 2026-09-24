# Kanban de Diligências DEPATRI

## Objetivo
Centralizar todas as diligências operacionais em um único quadro, independentemente da origem: ofício, intimação, análise de imagem, contato, busca de informação, diligência de campo, consulta de sistema, resposta de empresa ou outra providência.

## Aba
Criar uma aba própria chamada `KANBAN_DILIGENCIAS`.

## Colunas do quadro
1. `A_FAZER`
2. `EM_ANDAMENTO`
3. `AGUARDANDO_TERCEIRO`
4. `PARA_REVISAR`
5. `CONCLUIDO`

Não usar `ATRASADO` como status manual. Atraso é calculado automaticamente quando existe PRAZO e a data atual ultrapassa esse prazo sem o cartão estar concluído.

## Campos do cartão
- ID_DILIGENCIA
- ID_CASO, quando houver
- ID_OFICIO, quando houver
- TITULO
- TIPO_DILIGENCIA
- DESCRICAO
- DATA_PEDIDO
- DATA_ATUALIZACAO
- PRAZO, quando houver
- PRIORIDADE: BAIXA | NORMAL | ALTA | URGENTE
- STATUS_KANBAN
- ETAPA
- EQUIPE
- RESPONSAVEL, quando informado
- TIPO_PROCEDIMENTO
- NUMERO_PROCEDIMENTO
- NUM_OFICIO, quando houver
- DESTINATARIO, quando houver
- EMAIL_DESTINATARIO, quando houver
- DATA_ENVIO, quando houver
- DATA_RESPOSTA, quando houver
- LINK_DOC
- LINK_PDF
- LINK_DRIVE
- GMAIL_THREAD_ID, quando houver
- GMAIL_MESSAGE_ID, quando houver
- OBSERVACAO
- DATA_CONCLUSAO

## Regras gerais
- Todo cartão deve estar associado a um caso/procedimento quando houver essa informação.
- DATA_PEDIDO, EQUIPE e NUMERO_PROCEDIMENTO são históricos e não devem ser apagados.
- Mudança de status não cria um novo cartão, salvo quando a resposta gerar uma diligência nova e independente.
- Não duplicar cartão para o mesmo fato/ação.
- Conclusão deve registrar DATA_CONCLUSAO.
- Reabertura deve retirar DATA_CONCLUSAO e registrar nova DATA_ATUALIZACAO.
- O quadro deve permitir filtros por equipe, responsável, procedimento, tipo, prioridade, status e prazo.

## Ofício no Kanban
Ao gerar um ofício com sucesso:
- TITULO = `Enviar Ofício <NUM_OFICIO> – <DESTINATARIO ou TIPO_DOCUMENTO>`
- TIPO_DILIGENCIA = `OFICIO`
- STATUS_KANBAN = `A_FAZER`
- ETAPA = `ENVIAR_EMAIL`

Quando o e-mail for enviado:
- STATUS_KANBAN = `AGUARDANDO_TERCEIRO`
- ETAPA = `AGUARDAR_RESPOSTA`
- DATA_ENVIO = data/hora real
- preservar NUM_OFICIO, DATA_PEDIDO, EQUIPE e NUMERO_PROCEDIMENTO.

Quando chegar resposta:
- STATUS_KANBAN = `PARA_REVISAR`
- ETAPA = `ANALISAR_RESPOSTA`
- DATA_RESPOSTA = data/hora real
- guardar o vínculo do Gmail.

Quando a resposta for analisada e não houver nova providência:
- STATUS_KANBAN = `CONCLUIDO`
- ETAPA = `FINALIZADO`
- DATA_CONCLUSAO = data/hora real.

Se a resposta exigir outra ação, criar uma nova diligência vinculada ao mesmo caso e ao ofício.

## Outros exemplos de cartões
- `Analisar imagens do estabelecimento X`
- `Solicitar imagens da Rua Y`
- `Identificar proprietário do veículo ABC1D23`
- `Verificar passagens no Agilis`
- `Intimar pessoa X`
- `Realizar diligência no endereço Y`
- `Analisar resposta do Ofício 623/2026`
- `Gerar Relatório Técnico do caso`

## Comandos naturais
- "Mostre o Kanban"
- "O que temos para fazer?"
- "Mostre as diligências da BRAVO"
- "O que está aguardando resposta?"
- "O que está atrasado?"
- "Quais diligências vencem hoje?"
- "Coloque esta diligência em andamento"
- "Marque esta diligência como concluída"
- "A resposta chegou, coloque para revisar"
- "Crie uma diligência para analisar essas imagens"
