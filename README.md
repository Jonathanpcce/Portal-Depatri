# Portal DEPATRI — arquivos completos corrigidos

Atualização dos módulos aplicada aos cinco arquivos originais em 15/09/2026. Versão para o repositório `Jonathanpcce/Portal-Depatri`, configurada em 16/09/2026 para o projeto Firebase `portal-depatri-6da3c`.

O cadastro de Casos Prioritários agora solicita somente **nome do caso, tipo de crime e subtipo de crime**. Ao confirmar o cadastro, o mesmo caso passa a aparecer em **Selecione um caso** e em **Fenômeno Criminal**, tanto no formulário quanto na busca de Demandas Ativas.

Foram retirados da interface de Casos Prioritários o mapa, os eventos e as configurações Gemini/MapTiler. O menu Assistente IA também foi retirado. O filtro Tipo de crime passou a receber os tipos de crime, corrigindo o preenchimento anterior com nomes de casos.

## Arquivos para atualizar o sistema atual

| Arquivo completo | Alteração |
|---|---|
| `apps-script/MAESTRO.gs` | Cadastro validado no servidor, catálogo compartilhado, vínculo do caso por ID e busca de demandas |
| `apps-script/INDEX.html` | Remoção do Assistente IA e das dependências MapTiler |
| `apps-script/JAVASCRIPT.html` | Novo formulário de casos, seleção compartilhada e correção dos filtros |
| `apps-script/DASHBOARD.gs` | Lógica preservada; referência à planilha externa movida para configuração privada |
| `apps-script/DASHBOARD_JS.html` | Preservado integralmente |

Os arquivos estão completos. Na versão deste repositório público, os IDs de planilhas, pastas e modelos são obtidos das propriedades do projeto Apps Script. Configure as chaves de `docs/APPS_SCRIPT_PROPERTIES.example.json` antes de usar essa versão no Apps Script. Não é necessário montar o sistema a partir dos trechos da pasta `patches`. Consulte `docs/INSTALACAO.md` para aplicar a atualização ao Apps Script.

O catálogo de tipos e subtipos é lido de `DB_CONFIG`, categoria `CRIME_PRODUTIVIDADE`, colunas `NOME` e `VALOR_EXTRA`. O subtipo acompanha o tipo escolhido. Quando o tipo não possui subtipos cadastrados, como OUTROS na tabela fornecida, o campo fica desabilitado e é salvo vazio.

## Casos e demandas anteriores

O código conserva os registros anteriores. Casos antigos com nomes repetidos são exibidos com o identificador de cada cadastro; demandas sem ID cujo nome corresponda a mais de um caso ficam sinalizadas para conferência. Nenhum vínculo ambíguo é atribuído automaticamente.

O novo cadastro impede repetir um nome após normalização de caixa, acentos e espaços. Se FURTO DE HILUX já existir, selecione o registro existente. O exemplo não precisa ser cadastrado novamente.

O cadastro de casos segue os perfis de edição do sistema original: ADMIN e NUIP. As consultas de demandas por perfis de leitura continuam limitadas à unidade. Esta atualização mantém o mecanismo de login do Apps Script; a autenticação Firebase pertence à etapa de migração.

## Firebase e domínio

**A correção dos cinco originais ainda utiliza Google Apps Script e Google Sheets. A migração completa para Firebase e a publicação em portaldepatri.com.br não foram concluídas.**

A pasta `firebase` inclui o módulo Firebase preparado anteriormente, seus testes e o planejador de migração. Esse módulo já possui cadastro, catálogo compartilhado, autenticação Firebase e serviço de vínculo para demandas existentes. Ele ainda não substitui o cadastro completo de demandas nem os demais módulos do Portal. Os dois conjuntos são etapas separadas e não devem ser publicados como se já estivessem integrados.

O repositório de destino é `Jonathanpcce/Portal-Depatri` e o projeto Firebase é `portal-depatri-6da3c`. O arquivo `firebase/.firebaserc` já aponta para esse projeto. Ainda faltam a autenticação do operador no Firebase, a configuração pública do aplicativo Web, a conversão dos demais serviços e a conferência/importação dos dados históricos. A configuração e validação do Firebase antecedem a associação do domínio e seus registros DNS. O envio deste código ao GitHub não publica o Portal no domínio; não houve deploy, importação de dados nem alteração de DNS.

## Validação e desenvolvimento

Foram aprovados **15 testes automatizados dos arquivos originais corrigidos**, incluindo cadastro pelo formulário, presença nos três seletores, gravação e pesquisa de demandas, permissões de edição, vínculos antigos e respostas assíncronas. Os testes usam DOM e serviços Apps Script simulados. Não equivalem a uma implantação validada no Google Apps Script ou no Firebase. Detalhes em `docs/VALIDACAO.md`.

Para executar os testes, use Node.js 22 ou superior:

```bash
npm ci
npm test
```

Com Firebase CLI instalada e autenticada no projeto, obtenha automaticamente a configuração pública do aplicativo Web:

```bash
npm run firebase:configure
```

Se houver mais de um aplicativo Web, passe seu `appId`: `npm run firebase:configure -- APP_ID`. O comando não cria usuários, banco ou implantação. Os comandos de publicação estão em `firebase/README.md`; a verificação antes do deploy recusa configuração incompleta ou de outro projeto.

O comando de build é opcional: reaplica as alterações aos cinco anexos originais. Os nomes de origem constam em `docs/ARQUIVOS.json`. Informe uma pasta que contenha esses arquivos originais, ainda sem alterações:

```bash
npm run build -- /caminho/dos/originais
```

O script recusa aplicar uma substituição se não encontrar o trecho esperado de forma única. Os arquivos corrigidos já incluídos no pacote podem ser usados diretamente, sem executar o build.
