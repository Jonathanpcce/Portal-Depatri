---
name: assistente-ocorrencias
description: Organizar e desenvolver ocorrências do DEPATRI; analisar B.O., CIOPS, documentos e imagens; consultar casos; adicionar diligências; preparar Relatório Técnico/RELINT e prévias no padrão institucional.
---

Use esta habilidade quando o usuário estiver trabalhando com uma ocorrência, caso, diligência, imagem ou relatório técnico do DEPATRI.

## Princípios
- As instruções explícitas do usuário prevalecem sobre este fluxo.
- Não invente fatos, nomes, placas, horários, locais, vínculos ou conclusões.
- Preserve a distinção entre informação documental, informação de campo e inferência.
- Pergunte somente o que for realmente necessário e não estiver disponível nos arquivos, na conversa ou nos serviços conectados.
- Quando uma ação alterar dados, criar arquivos, mover documentos ou enviar mensagens, só execute quando o pedido do usuário autorizar a ação.
- Prefira os conectores Google Drive/Docs/Sheets para dados e arquivos do Portal DEPATRI; use Gmail, Calendar e Contacts quando a tarefa exigir.
- Não exponha dados operacionais desnecessários fora do ambiente autorizado.

## Fluxo: iniciar ou atualizar caso
1. Ler o B.O., CIOPS, PDF, Word, planilha, texto, áudio ou imagem fornecido.
2. Extrair apenas o que estiver suportado: identificador do procedimento, data, hora, local, vítima, suspeitos, veículos, natureza, equipe e demais fatos relevantes.
3. Verificar se o caso já existe antes de criar duplicado.
4. Quando o caso existir, atualizar o caso correto em vez de criar outro.
5. Organizar anexos em pasta própria quando o usuário pedir criação/organização no Drive.

## Kanban de diligências
Consultar `references/kanban-diligencias.md` sempre que a tarefa envolver criação, consulta, atualização, priorização ou conclusão de diligências. Toda diligência relevante deve poder aparecer no quadro operacional.

## Fluxo: adicionar diligência
1. Identificar o caso.
2. Preservar integralmente os fatos fornecidos.
3. Ajustar a redação para texto técnico, fluido e objetivo.
4. Não introduzir conclusão que o usuário não tenha solicitado.
5. Vincular imagens e suas legendas à evolução quando solicitado.

## Imagens no Relatório Técnico
Consultar `references/imagens-rt.md` sempre que o usuário quiser salvar, vincular, legendar, posicionar, remover ou inserir uma imagem no RT.

## Fluxo: analisar imagem
1. Descrever somente características efetivamente visíveis.
2. Não identificar uma pessoa apenas por aparência, salvo quando o usuário fornecer identificação externa válida e pedir comparação descritiva.
3. Separar observação visual de qualquer informação recebida de outra fonte.
4. Produzir, quando solicitado, legenda curta e técnica.
5. Se a imagem fizer parte de uma evolução, manter a relação entre texto, ordem da imagem e legenda.

## Fluxo: gerar Relatório Técnico
1. Recuperar as informações iniciais, evoluções, diligências e imagens do caso.
2. Consultar `references/config-rt.md` antes de numerar ou criar a pasta.
3. Consultar o padrão em `references/padrao-relatorio.md`.
4. Ao comando "Gerar RT", reservar o próximo número usando exclusivamente a aba `INTEL_NUMERADOR`; o valor visível em `ULTIMO_NUMERO` é o último número já usado e deve ser incrementado em +1.
5. Só depois de confirmar a reserva do número, criar a subpasta do RT diretamente dentro da pasta-mãe definida em `references/config-rt.md`.
6. Usar no nome da pasta o novo número, ano e identificador da ocorrência.
7. O QR Code deve apontar para a subpasta específica recém-criada.
8. Gerar a narrativa e uma prévia para conferência.
9. Na prévia, indicar a posição das imagens e respectivas legendas; quando possível, mostrar miniaturas.
10. Quando o usuário autorizar a finalização, usar o modelo institucional disponível, preservar a formatação do modelo, inserir imagens selecionadas, inserir o QR Code da pasta de mídias e gerar DOC/PDF.
11. A pasta de mídias deve permanecer como repositório dos arquivos originais; o PDF recebe apenas as imagens relevantes escolhidas.
12. Retornar links para DOC/PDF/pasta somente quando realmente criados.

### Segurança da numeração
- Nunca escolher o número pelo maior nome de pasta encontrado no Drive.
- Nunca usar diretamente o valor atual de `ULTIMO_NUMERO`; ele representa o último RT já utilizado.
- Sempre usar `ULTIMO_NUMERO + 1`.
- Atualizar o numerador antes da criação da pasta para reservar o número e reduzir risco de duplicidade.
- Se não for possível confirmar a atualização do numerador, interromper a geração antes de criar a pasta.
- Em futura integração MCP/Apps Script, usar bloqueio transacional/LockService para evitar duas reservas simultâneas.

## Comandos equivalentes
Interprete frases naturais como:
- "Gere RT"
- "Gere o relatório com tudo que temos"
- "Crie pasta de imagem"
- "Abra a pasta do RT"
- "Analise essa imagem"
- "Adicione esta imagem ao RT"
- "Coloque essa imagem depois desta diligência"
- "Salve essa imagem apenas no Drive"
- "Adicione esta diligência ao caso..."
- "Me mostre a prévia"
- "Finalize o RT"
- "Consulte o caso..."
- "Mostre o Kanban"
- "O que temos para fazer?"
- "O que está aguardando resposta?"
- "O que está atrasado?"

## Resultado esperado
O usuário deve receber uma resposta objetiva com o que foi encontrado/feito, pendências reais e, quando aplicável, a prévia ou os links dos arquivos criados.


## Ações do executor RT
Quando o backend Apps Script/MCP estiver conectado, usar estas ações determinísticas:

- `RT_STATUS`: diagnóstico sem reservar número nem criar pasta.
- `RT_CONFIGURAR`: configurar pasta-mãe e template no Apps Script.
- `RT_PREPARAR`: localizar o caso, reservar o próximo número com bloqueio e criar/reutilizar a pasta do RT.
- `RT_PREVIA`: recuperar o conteúdo estruturado, evoluções e imagens para revisão antes da finalização.
- `RT_ADICIONAR_IMAGEM`: salvar a imagem original na pasta do RT e registrar legenda, vínculo e inclusão no PDF.
- `RT_ATUALIZAR_IMAGEM`: alterar legenda, posição, inclusão no RT ou exclusão lógica.
- `RT_FINALIZAR`: copiar o modelo oficial, inserir texto/imagens/legendas/QR e gerar DOC/PDF.

### Ordem obrigatória do comando "Gerar RT"
1. Consultar o caso e compor/revisar o conteúdo narrativo.
2. Executar `RT_PREPARAR`.
3. Executar `RT_PREVIA` e apresentar a prévia ao usuário.
4. Aceitar ajustes de texto, imagens e legendas.
5. Somente quando o usuário pedir para finalizar, executar `RT_FINALIZAR`.

O modelo nunca deve gerar ou consumir um número por conta própria. A numeração é responsabilidade exclusiva de `RT_PREPARAR`, que usa `LockService` e a aba `INTEL_NUMERADOR`.
