# Método de Inserção de Imagens no Relatório Técnico

## Objetivo
Permitir que o usuário envie imagens diretamente na conversa e as associe ao Relatório Técnico sem precisar informar nomes de arquivo, IDs do Drive ou posição técnica no Google Docs.

## Comandos naturais
Aceitar frases como:
- "Adicione esta imagem ao RT"
- "Coloque essa imagem depois desta diligência"
- "Essa imagem é da evolução anterior"
- "Use essa no relatório"
- "Salve na pasta, mas não coloque no PDF"
- "Coloque essas três imagens juntas"
- "Troque a legenda dessa imagem"
- "Remova essa imagem do PDF, mas mantenha no Drive"

## Fluxo ao receber uma imagem
1. Identificar o caso/RT ativo pela conversa.
2. Se houver uma evolução/diligência imediatamente associada no contexto, vincular a imagem a ela automaticamente.
3. Se o usuário indicar posição específica, respeitar essa posição.
4. Se não for possível determinar o vínculo com segurança, perguntar apenas a qual diligência/evolução a imagem pertence.
5. Analisar visualmente a imagem somente quando solicitado ou quando necessário para sugerir legenda.
6. Nunca alterar a imagem original.
7. Salvar o arquivo original na subpasta do RT definida em `config-rt.md`.
8. Registrar os metadados da imagem, incluindo ordem, legenda e vínculo com evolução.
9. Preparar miniatura/prévia para conferência.
10. Somente imagens marcadas para inclusão entram no DOC/PDF; todas podem permanecer no Drive.

## Metadados recomendados
Usar/compatibilizar com a estrutura existente de imagens:
- ID_IMAGEM
- ID_EVOLUCAO
- NUM_OCORRENCIA
- ORDEM
- NOME
- MIME_TYPE
- FILE_ID
- URL
- LEGENDA
- USUARIO
- DATA_CRIACAO
- DATA_ATUALIZACAO
- EXCLUIDO
- INCLUIR_NO_RT (novo campo recomendado)
- POSICAO_RT (novo campo recomendado)

## Regra de posição
Prioridade:
1. posição explicitamente indicada pelo usuário;
2. imediatamente após a evolução/diligência à qual a imagem está vinculada;
3. grupo de imagens ao final da mesma evolução, quando houver várias;
4. se o vínculo for incerto, perguntar antes de posicionar.

Não inserir automaticamente todas as imagens ao final do relatório.

## Legenda
- Se o usuário fornecer legenda, preservar o conteúdo e ajustar apenas se ele pedir.
- Se não houver legenda, sugerir uma legenda técnica curta com base apenas no que for visível e no contexto confirmado.
- A legenda sugerida deve aparecer na prévia antes da finalização.
- Não identificar pessoas por aparência.
- Não criar placa, local, horário ou vínculo que não esteja confirmado.

## Apresentação no RT
Padrão sugerido:
- texto da diligência/evolução;
- espaço curto;
- imagem centralizada;
- legenda imediatamente abaixo;
- nova imagem e respectiva legenda, quando houver;
- continuação do texto.

Para duas imagens relacionadas e compatíveis em orientação/tamanho, o sistema pode montar lado a lado quando isso melhorar a leitura. Para três ou mais, preferir grade/colagem somente quando o usuário pedir ou quando a prévia indicar melhor legibilidade.

## Prévia
Antes de finalizar o RT, mostrar:
- trecho da evolução;
- miniatura da imagem;
- legenda;
- posição;
- indicação "INCLUIR NO PDF" ou "SOMENTE DRIVE".

Permitir comandos naturais de ajuste antes da finalização.

## Finalização no Google Docs
O template institucional contém `{{CORPO_RELATORIO}}`, mas a montagem final com imagens não deve reduzir o corpo a uma substituição textual simples.
Na geração final:
1. copiar o template oficial;
2. localizar `{{CORPO_RELATORIO}}`;
3. substituir o marcador por blocos ordenados de parágrafos/evoluções;
4. após cada bloco, inserir as imagens vinculadas usando o blob/arquivo do Drive;
5. aplicar largura máxima proporcional à página, sem distorcer;
6. inserir legenda em parágrafo próprio;
7. manter o QR Code em `{{QR_CODE_IMAGENS}}`;
8. exportar para PDF somente após a montagem completa.

## QR Code
O QR Code continua apontando para a subpasta específica do RT, onde permanecem os arquivos originais em resolução integral.
