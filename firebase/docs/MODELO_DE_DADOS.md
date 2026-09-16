# Modelo de dados e acesso

## Coleções

| Caminho | Conteúdo e responsabilidade |
|---|---|
| `usuarios/{uid}` | Perfil autorizado; criado por administrador de confiança, nunca pelo navegador |
| `configuracoes/crimes` | `schemaVersion` e `tipos: [{tipo, subtipos}]` |
| `casos/{id}` | `nomeCaso`, `nomeChave`, `tipoCrime`, `subtipoCrime`, `ativo`, `criadoPor`, `criadoEm`, `atualizadoEm`, `solicitacaoId` |
| `nomesCasos/{sha256(nomeChave)}` | `casoId` e `nomeChave`; índice de unicidade |
| `demandas/{id}` | Demanda migrada, com `casoId`, `casoNome`, `casoNomeChave` e os demais campos |
| `auditoriaEventos/{id}` | Registro de criação do caso e alterações de vínculo |

Perfil de exemplo, a ser associado ao UID correto no Firebase Authentication:

```json
{"ativo": true, "perfil": "NUIP", "lotacao": "DEPATRI"}
```

| Perfil canônico | Casos | Demandas vinculadas |
|---|---|---|
| ADMIN, ADMINISTRADOR, CRIADOR, NUIP | Consultar e cadastrar | Consultar todas as unidades; alterar vínculo |
| DIRECAO, DIRETORIA | Consultar | Consultar todas as unidades |
| DELEGACIA, com lotacao preenchida | Consultar | Somente a unidade correspondente |
| Inativo, ausente ou não mapeado | Recusado | Recusado |

Os perfis antigos devem ser mapeados explicitamente. O módulo não interpreta qualquer rótulo parecido como autorização. Usuários da autenticação sem um documento ativo continuam sem acesso aos dados.

## Campos da demanda usados na consulta

`dataOcorrencia`, `numeroProcedimento`, `unidadeResponsavel`, `unidadeChave`, `status`, `crimeTipo`, `casoId`. `unidadeChave` deve usar a mesma normalização de caixa, acentos e espaços que a lotação do usuário. Demanda sem unidade corretamente normalizada não aparecerá para perfil DELEGACIA. Os demais campos originais precisam ser migrados e preservados pelo módulo completo de demandas.

## Integridade

Todas as operações de cliente passam por callable functions. As regras incluídas recusam leitura e escrita diretas, inclusive alterações de perfil. O Admin SDK opera no servidor; cada função valida a sessão e busca o perfil antes de atender.

Unicidade considera o nome normalizado. Uma transação cria caso, índice e auditoria. A idempotência só aceita repetição com o mesmo usuário, identificador de solicitação, nome e classificação. O catálogo é lido dentro da transação de cadastro.

A API não oferece exclusão de casos, fusão automática ou exclusão dos eventos antigos. Essas operações não fazem parte desta entrega.
