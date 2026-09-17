# Portal DEPATRI — Casos e Demandas Ativas no Firebase

Atualizado em 17/09/2026 para o projeto `portal-depatri-6da3c`, com a configuração pública do aplicativo Web fornecida pelo usuário.

## Situação

Casos Prioritários e Demandas Ativas compartilham a mesma aplicação e a mesma sessão Firebase. O cadastro de casos solicita nome, tipo e subtipo; o caso confirmado aparece imediatamente em Selecionar um caso e nos dois campos Fenômeno Criminal de Demandas Ativas.

Demandas Ativas agora tem formulário, cadastro/edição, consulta, busca paginada, contadores, dados de veículos e PDFs. O backend usa Firestore e Storage. Foram aprovados 47 testes locais com serviços simulados. **Não houve deploy, teste no projeto Firebase real, importação da planilha ou alteração do domínio.**

A versão completa original corrigida está em `../apps-script`. Os demais módulos do Portal continuam dependendo da conversão dos serviços Apps Script/Drive. A consulta automática externa de valores/modelos de veículos também continua pendente; nesta aplicação os dados de veículos são preenchidos manualmente. Não substituir o Portal completo em uso por esta etapa isolada.

## Fluxos implementados

- Catálogo com nove tipos e 25 subtipos. OUTROS admite subtipo vazio conforme a tabela recebida.
- Criação transacional de casos com nome único e repetição da solicitação sem duplicidade.
- Cadastro e edição dos campos de Demandas Ativas, com vínculo por ID e nome do caso confirmado no servidor.
- Bloqueio de procedimento repetido e controle de versão para detectar edições concorrentes.
- Mesmos contadores dos originais. A evolução preserva a regra efetiva do código recebido: pelo menos 1 em um dos sete contadores de resultado ou uma razão diversa. Relatório de missão/extração isolado não muda a evolução.
- Pesquisa por equipe, status, data, procedimento, tipo de crime, caso e texto. A paginação percorre lotes limitados; pode ser necessário carregar mais páginas mesmo quando a página corrente não traz correspondências.
- ADMIN/NUIP podem gravar; DIRECAO/DIRETORIA podem consultar todas as unidades; DELEGACIA consulta somente sua lotação.
- PDFs de até 10 MB, enviados e baixados com sessão e autorização. Não são criados links públicos permanentes. PDFs enviados antes de uma falha no salvamento podem ficar sem vínculo; não há exclusão automática desses arquivos.
- Preservação de campos históricos não convertidos e referências ambíguas durante a edição, sem atribuir outro caso automaticamente.

A interface não contém mapa de casos, Plotar eventos, configurações Gemini/MapTiler ou Assistente IA. As funcionalidades fora desses dois módulos permanecem nos arquivos originais.

## Testes e prévia

Requer Node.js 22. A sessão usou Node.js 24.19.0; Cloud Functions está configurado para Node.js 22.

```bash
npm ci
npm ci --prefix functions
npm test
node scripts/check.mjs --production
```

Para visualizar os formulários com dados fictícios e somente em memória:

```bash
npm run preview
```

Abra `http://localhost:4173/test/preview.html`. Também é possível abrir `PREVIA_CASOS.html` diretamente. Essa demonstração inclui os dois formulários, usa menus de exemplo e não conecta ao Firebase. Os cadastros e PDFs desaparecem ao recarregar. Para regenerá-la, execute `node scripts/package.mjs`. A pasta `test` e a prévia avulsa não são publicadas pelo Hosting.

## Configuração do projeto

1. A configuração pública Web já está em `public/firebase-config.json` e corresponde ao destino definido no repositório. Não é uma credencial de administração. Para atualizá-la futuramente com Firebase CLI autenticada, execute `node scripts/configure-project.mjs`.
2. Habilitar Firestore, Storage e Authentication com e-mail/senha; verificar as condições de faturamento aplicáveis a Cloud Functions e Storage. Criar os usuários autorizados e documentos `usuarios/{uid}` conforme [MODELO_DE_DADOS.md](docs/MODELO_DE_DADOS.md).
3. Autenticar o operador na Firebase CLI. Os scripts de importação usam Application Default Credentials do operador autorizado; não colocar credenciais privadas no repositório.
4. Criar o catálogo de crimes com `node scripts/seed-catalog.cjs portal-depatri-6da3c --apply`. O comando recusa sobrescrever catálogo existente.
5. Exportar a aba `DB_CONFIG` para JSON, como objetos por linha ou matriz com cabeçalho. Manter a exportação na pasta local ignorada `data`. Conferir os menus sem gravar:

```bash
node scripts/seed-demand-config.cjs portal-depatri-6da3c data/DB_CONFIG.json
```

Após conferir o resultado, usar o mesmo comando com `--apply`. Somente status, unidades, equipes e tipos de ocorrência são lidos. O script cria `configuracoes/demandas` e recusa sobrescrever configuração existente. A equipe segue `VALOR_EXTRA`, com `NOME` como alternativa, igual ao código original.

6. Conferir e converter os registros históricos. `scripts/plan-migration.cjs` continua sendo somente um planejador; não importa dados. As novas APIs pressupõem documentos no formato descrito em [MODELO_DE_DADOS.md](docs/MODELO_DE_DADOS.md).
7. Validar autenticação, consultas, regras, índices, concorrência e PDFs no projeto de teste. O emulador atual requer Java 21 ou superior. Usar `demo-depatri-casos` e `useEmulators: true` apenas em localhost; nunca ativar essa opção na configuração de produção.

## Publicação pendente

Dentro da pasta `firebase`, após configurar e verificar o projeto:

```bash
node scripts/check.mjs --production
firebase deploy --project portal-depatri-6da3c --only functions:depatri-casos,firestore,storage,hosting
```

O código de funções continua identificado como `depatri-casos` para preservar a configuração anterior; agora contém dez funções. A verificação de produção checa arquivos e configuração, não substitui testes nos serviços reais.

Esse comando publica os dois módulos desta pasta. Em projeto existente, conferir as regras Firestore/Storage em uso antes de aplicar as incluídas aqui: elas recusam acesso direto do navegador, pois os dados passam pelas funções autorizadas.

No Firebase Hosting, adicionar `portaldepatri.com.br` e aplicar no Registro.br os registros exatos apresentados pelo Firebase. Ainda não foram obtidos registros DNS de validação. O acesso ao GitHub não concede acesso ao Firebase ou ao Registro.br.

Referências oficiais: [configuração Web](https://firebase.google.com/docs/web/setup), [funções callable](https://firebase.google.com/docs/functions/callable), [transações Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions), [domínio próprio](https://firebase.google.com/docs/hosting/custom-domain).
