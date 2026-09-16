# Aplicar a atualização à versão Apps Script

Esta é a atualização do sistema atual. Ela não publica o sistema no domínio próprio nem converte sua base para Firestore.

1. Abra o mesmo projeto Apps Script em que os cinco originais estão instalados. Guarde a versão atual antes da substituição.
2. Substitua o conteúdo de `MAESTRO.gs`, `INDEX.html` e `JAVASCRIPT.html` pelos arquivos completos de mesmo nome da pasta `apps-script`.
3. Atualize também `DASHBOARD.gs`, cuja referência à planilha externa passou a ser obtida de configuração privada. `DASHBOARD_JS.html` continua idêntico ao original. Mantenha esses nomes e os demais arquivos de seu projeto.
4. Nas configurações do projeto Apps Script, abra Propriedades do script e configure as chaves listadas em `APPS_SCRIPT_PROPERTIES.example.json`, usando os IDs dos recursos de seu ambiente. Os valores reais foram retirados do código público e não constam no arquivo de exemplo. Usando uma cópia para testes, informe os recursos de teste. Salve e abra a versão de teste do aplicativo.
5. Entre com um perfil ADMIN ou NUIP, abra Casos Prioritários e selecione Novo caso. Informe um nome ainda não utilizado, tipo e subtipo compatíveis.
6. Confirme que o caso aparece em Selecione um caso e nos dois campos Fenômeno Criminal em Demandas Ativas. Registre uma demanda de teste, selecione o caso e verifique a consulta de demandas vinculadas.
7. Depois dessa validação no seu ambiente, atualize a implantação do Apps Script para a nova versão. Recarregue o portal para que frontend e backend usem a mesma versão.

## Ajustes de estrutura executados pelo código

- Ao salvar o primeiro caso novo, `INVEST_CASOS` recebe apenas os cabeçalhos adicionais que estiverem ausentes: `TIPO_CRIME`, `SUBTIPO_CRIME`, `SOLICITACAO_ID`, `CRIADO_POR` e `CRIADO_EM`, além de garantir `ID_CASO` e `NOME_CASO`. Cada caso ocupa uma nova linha e recebe um UUID.
- Ao salvar ou editar uma demanda, `DEMANDAS_ATIVAS` recebe a coluna `CASO_ID` se ela não existir. A coluna `CASO` conserva o nome para leitura; o ID passa a determinar o vínculo.
- Nenhuma coluna ou linha antiga é excluída. O catálogo histórico `CASO_ESPECIFICO` continua sendo lido para resolver nomes anteriores e não recebe uma segunda cópia dos novos casos.
- O tipo e o subtipo são validados contra a configuração existente. Se o catálogo estiver vazio, o cadastro recusa valores improvisados; confira `DB_CONFIG`.

## Tratamento do histórico

Demandas antigas sem `CASO_ID` podem ser associadas na consulta quando o nome identificar um único caso. Quando há dois casos com o mesmo nome, o sistema apresenta a pendência. Abra a demanda e escolha o cadastro correto em Fenômeno Criminal para gravar seu ID.

Uma edição de outros campos preserva um nome histórico que ainda não tenha correspondência no catálogo. Escolher outro caso explicitamente grava seu novo ID e nome oficial. Os demais campos da demanda continuam sendo tratados pela rotina original.

Não foram alteradas planilhas em uso durante a preparação destes arquivos. Os ajustes de estrutura descritos acima ocorrerão quando as rotinas de gravação forem executadas no projeto atualizado.

A extração dessas configurações altera apenas como os IDs são lidos. Ela não troca a planilha de destino por conta própria, não migra dados e não redefine permissões de arquivos.
