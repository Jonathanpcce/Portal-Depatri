# Modelo de dados e acesso

## Coleções

| Caminho | Conteúdo |
|---|---|
| `usuarios/{uid}` | Perfil autorizado, criado por administrador de confiança |
| `configuracoes/crimes` | `schemaVersion` e `tipos: [{tipo, subtipos}]` |
| `configuracoes/demandas` | `schemaVersion`, `status`, `unidade`, `equipe`, `tipoOcorrencia`; opções importadas de DB_CONFIG |
| `casos/{id}` | Nome, chave normalizada, tipo/subtipo, ativo, solicitacaoId, autoria e datas |
| `nomesCasos/{sha256(nomeChave)}` | Índice de unicidade do caso |
| `demandas/{id}` | Campos de cadastro, contadores/detalhes, casoId, cópias de nome, versão, autoria e datas |
| `procedimentosDemandas/{sha256(chave)}` | Índice de unicidade do tipo e número de ocorrência |
| `solicitacoesDemandas/{sha256(uid:solicitacaoId)}` | Assinatura do pedido e resultado para repetição sem duplicidade |
| `anexosDemandas/{id}` | Nome do PDF, caminho privado, tamanho, hash, proprietário e demandaId |
| `auditoriaEventos/{id}` | Criações, edições e alterações de vínculo, sem copiar os PDFs ou texto integral dos registros |

Exemplo de perfil associado ao UID correto no Firebase Authentication:

```json
{"ativo": true, "perfil": "NUIP", "lotacao": "DEPATRI"}
```

| Perfil | Casos | Demandas e PDFs |
|---|---|---|
| ADMIN, ADMINISTRADOR, CRIADOR, NUIP | Consultar e cadastrar | Consultar e editar todas as unidades |
| DIRECAO, DIRETORIA | Consultar | Consultar todas as unidades |
| DELEGACIA com lotacao preenchida | Consultar | Consultar somente sua unidade |
| Ausente, inativo ou não mapeado | Recusado | Recusado |

Os perfis antigos precisam ser mapeados explicitamente. Um usuário de Authentication sem documento ativo não acessa os dados.

## Demanda

Os campos aceitos e seus rótulos estão em `functions/src/demands-core.cjs` (`fields` e `counters`), enviados ao formulário pelo bootstrap. O servidor recusa chaves extras no objeto de cadastro, valida menus, datas, quantidades e detalhes, e calcula a evolução.

Identificação: `dataOcorrencia` (ISO), `status`, `unidade`, `unidadeOutro`, `equipe`, `tipoOcorrencia`, `numOcorrencia`, `tipoOcorrenciaOutro`, `nomeVitima`, `endereco`, `bairro`, `crimeTipo`, `crimeOutro`, `observacoes`. Procedimento instaurado e razões diversas mantêm os campos equivalentes da origem. Detalhes são arrays posicionais, alinhados aos contadores; posições vazias são conservadas.

Campos derivados: `numeroProcedimento`, `procedimentoConcat`, `unidadeResponsavel`, `unidadeChave`, `statusDemanda`, `relatoriosQtd`. `unidadeChave` usa a mesma normalização da lotação autorizada. Unidade não mapeada corretamente não aparece para perfil DELEGACIA.

Relação: `casoId`, `casoNome`, `casoNomeChave`. O servidor resolve o ID dentro da transação. Na edição, omitir `casoId` mantém uma referência histórica; enviar `null` limpa explicitamente a relação. Casos existentes inativos podem ser conservados no registro, mas não vinculados a um novo cadastro.

Concorrência: `versao` aumenta em cada edição, inclusive pela API de alteração de vínculo. O salvamento exige a versão consultada. Caso outra operação tenha gravado uma versão mais recente, o registro deve ser reaberto. Repetir o mesmo pedido devolve o resultado original e não reaplica os campos sobre uma versão posterior.

O índice de procedimento usa `normalizar(tipoOcorrencia) + "\u0000" + numOcorrenciaSemEspacosEmMaiusculas`, com hash SHA-256. Na importação, esses índices devem ser construídos com a mesma função, antes de liberar novos cadastros. Colisões históricas precisam ser conferidas; não são fundidas automaticamente.

## PDFs

Os arrays `relatorioTecnicoPdfLinks`, `relatorioMissaoPdfLinks` e `relatorioExtracaoPdfLinks` mantêm o nome usado no formulário original, mas novos uploads recebem referências internas `anexo:ID`. O conteúdo vai para `demandas-pdfs/{id}/{sha256}.pdf` no Storage, sem URL pública. O servidor confere o proprietário antes de vincular e a demanda/unidade antes de baixar.

Links HTTPS provenientes da migração podem ser mantidos exatamente no próprio registro. Novos links externos são recusados: o formulário envia o arquivo. A importação de PDFs anteriores do Drive ainda não foi executada; manter um link não copia seu conteúdo para o Storage.

## Regras e consultas

As regras Firestore e Storage negam acesso direto do navegador. Cada função verifica sessão e perfil antes de usar o Admin SDK. Perfis nunca são aceitos do payload do cliente.

A busca filtra unidade/caso no Firestore, percorre até 200 documentos por chamada e devolve até 50 correspondências. Os demais filtros são aplicados no servidor ao lote. O cursor inclui uma assinatura da pesquisa e da unidade autorizada. A ordenação de paginação usa o ID estável; não implica ordem cronológica.

A atualização de uma demanda preserva campos existentes não reconhecidos pelo novo formulário. Não há exclusão de casos/demandas, fusão automática, remoção de eventos antigos ou importação automática dos dados históricos.
