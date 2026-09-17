# Integração com os arquivos originais

Os cinco arquivos originais já foram recuperados e corrigidos em `../../apps-script`. A nova interface, os filtros e o vínculo por ID funcionam na base Apps Script testada. A aplicação em `public` agora reúne Casos Prioritários e Demandas Ativas sobre Firebase. A conversão da base completa e suas demais integrações continua pendente; nenhuma versão foi publicada no domínio.

## Aplicação Firebase desta etapa

`public/firebase-runtime.js` cria uma sessão Firebase, um `CasesStore` compartilhado e um `DemandsStore`. `mountCases` e `mountDemands` são montados no mesmo portal. O formulário de demandas e a busca usam IDs nos valores dos seletores, com `bindCaseSelector`; a fonte da lista é o mesmo catálogo que recebe os novos casos.

O formulário usa os campos e contadores definidos no servidor em `demands-core.cjs`. A gravação chama `salvarDemandaAtiva`, que valida os campos, confirma o caso e grava a demanda/índices/auditoria na mesma transação. Os serviços novos são:

| Função callable | Operação |
|---|---|
| `obterBootstrapDemandasAtivas` | Perfil de edição, campos, contadores e menus de DB_CONFIG |
| `obterDemandaAtiva` | Registro completo após verificar a unidade |
| `salvarDemandaAtiva` | Cadastro/edição, repetição sem duplicar e controle de versão |
| `pesquisarDemandasAtivas` | Filtros combinados e paginação |
| `enviarPdfDemanda` | Upload autorizado de PDF privado |
| `baixarPdfDemanda` | Download após conferir o vínculo e a unidade |

As quatro funções anteriores de casos permanecem. Ao confirmar uma demanda, a consulta do caso selecionado é atualizada. Ao encerrar a sessão, os módulos são desmontados e as respostas antigas são descartadas. A consulta externa automática de valores/modelos de veículos não foi convertida; os campos correspondentes estão disponíveis para preenchimento manual.

## Pontos de integração da versão completa

| Elemento existente | Destino |
|---|---|
| `montarInterfaceMod5` | O formulário Apps Script já foi substituído; na migração, conectar seu cadastro ao serviço Firebase ou montar `mountCases` depois do login Firebase |
| `abrirCasosPrioritariosDepatri(modo)` | Encaminhar novo/visualizar para `integration.setMode` |
| `iniciarWatcherModoCasosDepatri_` | A espera pelo mapa já foi retirada; preservar o ciclo de montagem ao trocar o serviço |
| `aplicarModoCasosPrioritariosDepatri_` | Os modos novo/consulta já controlam o formulário simplificado |
| `dem_caso` | Seletor Fenômeno Criminal do formulário, alimentado pelo catálogo de casos |
| `dem_busca_caso_especifico` | Seletor Fenômeno criminal da busca, alimentado pelo mesmo catálogo |
| `dem_busca_nome_caso` | O filtro já usa tipos de crime e envia `tipoCrime`; preservar esse contrato na migração |
| `preencherMenusDemandas` | Já alimenta os dois seletores pelo catálogo único; a migração deve trocar a fonte desse catálogo |

## Adaptador opcional para a interface legada

O adaptador abaixo é mantido para a futura integração dos demais arquivos originais. A aplicação atual de `public` usa diretamente `mountDemands`, com valores de caso por ID.

```js
import {CasesStore} from './cases-store.js';
import {integratePortalCases} from './portal-integration.js';

// firebaseCall deve usar httpsCallable, no mesmo projeto e na região
// southamerica-east1. A sessão Firebase do usuário precisa existir.
const store = new CasesStore(firebaseCall);
const integration = integratePortalCases({
  store,
  casesRoot: document.getElementById('mod5'),
  demandFormSelect: document.getElementById('dem_caso'),
  demandSearchSelect: document.getElementById('dem_busca_caso_especifico')
});
await integration.refresh();

// No envio da demanda:
const {casoId, casoNome} = integration.getDemandCase();
// Enviar casoId no payload de salvamento. O servidor confirma o nome.
// Na busca: integration.getSearchCase().casoId.
// Ao desmontar os módulos: integration.destroy().
// Ao sair/trocar de usuário: store.reset().
```

O adaptador Firebase conserva nomes como valores e guarda `data-caso-id`. A versão Apps Script corrigida usa IDs diretamente nos valores dos seletores e obtém o nome no catálogo. Portanto, não substitua apenas um desses arquivos: a integração deve usar `integration.getDemandCase()`/`getSearchCase()` nos pontos de envio ou ajustar o adaptador para o contrato por ID. Ambas as versões preservam valores históricos sem correspondência e recusam atribuir um vínculo ambíguo.

Após qualquer reconstrução dos formulários, descartar a integração anterior e ligá-la aos novos elementos. Nenhuma função antiga deve repopular os seletores de fenômenos com listas diferentes. O filtro Tipo de crime deve ter um campo próprio no contrato de pesquisa; não remapear o antigo `nomeCaso` sem alterar e testar o servidor correspondente.

## Salvamento no Firestore

`casoId` é a relação. `casoNome` e `casoNomeChave` são cópias para exibição e consulta. `demands-service.cjs` já usa `service.resolveCaseForDemand(tx, casoId)` dentro da transação, antes de qualquer escrita, junto à autorização do salvamento completo. O nome enviado pelo navegador não é aceito como fonte do vínculo. `vincularCasoDemanda` continua disponível para alterar somente o caso de uma demanda existente e também incrementa sua versão; o formulário completo usa `salvarDemandaAtiva`.

Uma demanda ainda mantida no Google Sheets não passa a existir no Firestore apenas pela substituição do seletor. A migração de dados e do seu serviço de gravação deve acontecer antes de ativar esse fluxo no portal em produção.

## Remoções já aplicadas à versão Apps Script

- O bloco antigo de Casos Prioritários de JAVASCRIPT.html foi substituído pelo cadastro de três campos, seleção e consulta de demandas vinculadas.
- O menu Assistente IA, seu CSS, script inline e chamada no fluxo de entrada foram retirados de INDEX/JAVASCRIPT.
- MapTiler JS/CSS e a interface de mapa/eventos/configurações de casos foram removidos. Leaflet foi mantido para o SIRP.
- Os textos da Home foram atualizados para cadastro de casos e demandas vinculadas.
- Os históricos e os serviços de outros módulos permanecem nos arquivos completos. As funcionalidades de relatório fora desse escopo não foram removidas.

Essas alterações estão nos arquivos entregues, ainda sem atualização da implantação em uso.

## Pendências da origem

As estruturas legadas podem conter casos com o mesmo nome e vínculos sem identificador. Em registros anteriores, `INVEST_CASOS.NOME_CASO` pode representar o subtipo, enquanto `CASO_ESPECIFICO` contém o nome reconhecido pelo usuário. Não renomear, fundir nem excluir esses registros sem resolver os vínculos. A classificação de alguns casos também precisa ser revisada; o planejador usa correspondências exatas e sinaliza as restantes.

O planejador recebe JSON com as abas `INVEST_CASOS`, `CASO_ESPECIFICO` e `DEMANDAS_ATIVAS`, como arrays de objetos ou matrizes com cabeçalho na primeira linha. Ele produz sugestões sem aplicar alterações:

```bash
mkdir -p data migration-output
node scripts/plan-migration.cjs data/origem.json > migration-output/plano.json
```

Manter os dados exportados e os planos fora do GitHub. As pastas correspondentes já estão ignoradas no Git.
