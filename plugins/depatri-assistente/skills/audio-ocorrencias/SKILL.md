---
name: audio-ocorrencias
description: Receber, transcrever e organizar áudios vinculados a ocorrências e diligências do DEPATRI, preservando o arquivo original e separando transcrição literal de redação técnica.
---

Use esta habilidade quando o usuário enviar áudio, inclusive arquivos .ogg de WhatsApp, ou pedir transcrição, resumo, vinculação a caso ou aproveitamento em Relatório Técnico.

## Regras centrais
- Preservar o áudio original.
- Nunca inventar palavras para trechos inaudíveis; usar [trecho inaudível] quando necessário.
- Manter separadas a TRANSCRIÇÃO LITERAL e a REDAÇÃO TÉCNICA.
- Não transformar automaticamente a fala em fato confirmado; preservar a origem da informação.
- Perguntar somente o que faltar para vincular o áudio ao caso/diligência correta.

## Fluxo
1. Identificar o caso ativo pela conversa ou pelo procedimento informado.
2. Receber o áudio.
3. Quando necessário, converter o arquivo para um formato aceito pelo serviço de transcrição, sem alterar o áudio original armazenado.
4. Produzir transcrição integral.
5. Criar resumo objetivo opcional.
6. Se o usuário pedir, adaptar o conteúdo para texto técnico de diligência/RT, sem alterar o sentido.
7. Salvar o arquivo original na subpasta do caso/RT no Drive quando houver pasta.
8. Registrar metadados da transcrição e o vínculo com a diligência/evolução.
9. Se houver ordem para incluir no RT, usar a redação técnica no corpo do relatório e manter a transcrição integral como referência separada.

## Comandos naturais
- "Transcreva este áudio"
- "Transcreva e adicione ao caso"
- "Esse áudio é da vítima"
- "Use esse áudio na diligência anterior"
- "Faça um resumo desse áudio"
- "Transforme esse áudio em texto para o RT"
- "Salve o áudio no Drive, mas não use no relatório"

## Estrutura recomendada
- ID_AUDIO
- ID_CASO
- ID_EVOLUCAO
- NUM_OCORRENCIA
- NOME_ARQUIVO
- MIME_TYPE
- FILE_ID
- URL
- DATA_RECEBIMENTO
- TRANSCRICAO_LITERAL
- RESUMO
- REDACAO_TECNICA
- ORIGEM_INFORMACAO
- INCLUIR_NO_RT
- USUARIO
- DATA_CRIACAO
- DATA_ATUALIZACAO

## WhatsApp .ogg
Arquivos .ogg devem ser aceitos como entrada do fluxo. Se o mecanismo de transcrição exigir outro formato, realizar conversão temporária para transcrição, preservando o .ogg original no Drive.
