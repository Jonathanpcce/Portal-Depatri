# Portal DEPATRI — cadastro de casos no Firebase

Implementação da primeira etapa solicitada: cadastro de casos prioritários com nome, tipo de crime e subtipo; catálogo compartilhado com os seletores de Fenômeno Criminal. Preparada em 15/09/2026.

## Situação da entrega

O módulo e o adaptador estão implementados e testados localmente. Este pacote **ainda não é a migração completa do Portal DEPATRI**. Os arquivos completos do Apps Script, corrigidos nesta entrega, estão em `../apps-script`. Sua conversão para Firebase continua pendente. Nenhuma alteração foi publicada em portaldepatri.com.br, nenhum dado da planilha foi modificado e nenhum repositório existente foi sobrescrito.

Os cinco originais foram reenviados, recuperados e corrigidos. O cadastro simplificado, as remoções de interface e o vínculo com Demandas Ativas foram aplicados à versão Apps Script. O adaptador desta pasta é uma implementação separada para Firebase: ainda não foi conectado à versão completa nem converte os demais serviços do sistema.

## O que funciona neste pacote

- Formulário de caso com exatamente três campos visíveis.
- Nove tipos e 25 subtipos, conforme a tabela fornecida. OUTROS permite subtipo vazio porque não há subtipo cadastrado.
- Validação também no servidor e bloqueio transacional de nomes duplicados, desconsiderando caixa, acentos e espaços repetidos.
- Repetir a mesma solicitação após falha de conexão não gera outro caso.
- Atualização de todos os seletores inscritos no mesmo catálogo após confirmação da gravação.
- Consulta das demandas vinculadas por identificador estável, com paginação e acesso por unidade.
- Login Firebase Authentication; perfil autorizado lido de documento protegido no Firestore.
- API para alterar o caso de uma demanda já existente, mantendo os outros dados da demanda.
- Planejador de migração que aponta ambiguidades e não grava, apaga ou funde registros.

A nova interface não contém mapa, eventos, configurações Gemini/MapTiler ou Assistente IA. A remoção desses elementos também foi aplicada aos arquivos completos em `../apps-script`; a implantação em uso ainda não foi atualizada. Os mapas do SIRP e as funcionalidades de relatório fora desse escopo não devem ser removidos.

## Executar os testes

Requer Node.js 22. A execução nesta sessão usou Node.js 24.19.0; as funções estão configuradas para o runtime 22 do Firebase.

```bash
npm ci
npm ci --prefix functions
npm test
npm run check
```

Resultado da sessão: 25 testes aprovados. As quatro funções callable também foram carregadas com o SDK Firebase instalado e rejeitaram chamadas sem sessão. Veja [VALIDACAO.md](docs/VALIDACAO.md) para os limites da verificação.

## Conferir a interface sem gravar dados

```bash
npm run preview
```

Abra `http://localhost:4173/test/preview.html`. Essa página usa dados apenas em memória e mostra os seletores de integração. Ela não é o formulário completo de Demandas Ativas, não usa dados policiais e não se comunica com o Firebase. Recarregar a página apaga somente os casos criados nessa demonstração. A pasta `test` está fora da pasta publicada pelo Hosting.

## Configurar Firebase

1. O destino já está definido como `portal-depatri-6da3c` em `.firebaserc`. Confirme ou registre um aplicativo Web nesse projeto. Com Firebase CLI autenticada, execute `node scripts/configure-project.mjs` nesta pasta, ou `npm run firebase:configure` na raiz do repositório. Se houver mais de um aplicativo Web, informe o appId como argumento. Esse comando lê e salva somente a configuração pública em `public/firebase-config.json`; não cria serviços nem publica. Também é possível copiar a configuração pública do console usando `config/firebase-config.example.json` como referência.
2. Habilitar Cloud Firestore e Firebase Authentication com e-mail e senha. Criar os usuários autorizados e os documentos `usuarios/{uid}` descritos em [MODELO_DE_DADOS.md](docs/MODELO_DE_DADOS.md). As senhas e perfis locais antigos não são automaticamente aceitos como autenticação.
3. Instalar Firebase CLI e autenticar o operador autorizado no projeto. Confirmar as condições de faturamento do projeto antes de ativar os serviços pagos. O uso de Cloud Functions depende da configuração de faturamento aplicável ao projeto.
4. Criar o catálogo com `node scripts/seed-catalog.cjs ID_DO_PROJETO --apply` em um ambiente com Application Default Credentials autorizado. O comando usa `create` e recusa sobrescrever um catálogo existente.
5. Conferir os vínculos históricos antes de importar casos ou demandas. Há nomes duplicados e nomes genéricos na origem; este pacote não os resolve automaticamente.
6. Validar em ambiente de teste com Auth, Functions e Firestore. Para o emulador atual é necessário Java 21 ou superior. Usar projeto `demo-depatri-casos` e configuração de teste com `useEmulators: true`, apenas em localhost.

## Publicação pendente

Dentro da pasta `firebase`, depois de configurar e validar o destino:

```bash
node scripts/check.mjs --production
firebase deploy --project portal-depatri-6da3c --only functions:depatri-casos,firestore,hosting
```

Esse comando publica **somente o módulo incluído neste pacote**. Não deve substituir o portal completo em uso antes da integração dos demais módulos. As regras Firestore incluídas negam acesso direto do cliente e são próprias desta arquitetura; em um projeto existente, devem ser conciliadas com as regras em uso, sem sobrescrevê-las indiscriminadamente.

No Firebase Hosting, adicionar portaldepatri.com.br e seguir os registros DNS exatos apresentados para esse domínio. Não foram presumidos endereços IP ou registros de validação. O acesso ao GitHub não concede acesso ao projeto Firebase nem ao painel Registro.br.

Referências oficiais: [configuração Web](https://firebase.google.com/docs/web/setup), [funções callable](https://firebase.google.com/docs/functions/callable), [transações Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions), [domínio próprio](https://firebase.google.com/docs/hosting/custom-domain).
