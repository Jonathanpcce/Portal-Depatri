# Validação dos arquivos originais corrigidos — 15/09/2026

## Resultado

15 testes passaram com `npm test`, utilizando as funções dos arquivos completos entregues, sem uma segunda implementação do formulário ou das regras de cadastro.

| Grupo | Verificações |
|---|---|
| Integridade | Sintaxe dos dois backends combinados e scripts de frontend; conferência dos hashes de entrega; DASHBOARD_JS permanece byte a byte igual ao original |
| Remoções | Ausência de referências MapTiler, mapa de casos, Plotar eventos e Assistente IA na interface; manutenção de Leaflet para o SIRP |
| Cadastro | Mesmo catálogo nos dois módulos; validação de campos e subtipo; OUTROS sem subtipo; repetição da solicitação sem duplicar caso |
| Acesso | Recusa de criação por perfis de consulta; demandas consultadas conforme a unidade |
| Histórico | Preservação das linhas anteriores e de nomes sem correspondência; casos homônimos não misturam demandas |
| Demanda | Salvamento com ID e nome confirmado no servidor; edição; busca por caso e por tipo de crime |
| Interface | Formulário real com três campos; caso recém-criado nos três seletores; payload com ID e filtros separados; descarte de respostas de sessão anterior |

## Comparação de escopo

Após normalizar somente quebras de linha, 400 funções existentes de `MAESTRO.gs` e 396 de `JAVASCRIPT.html` permaneceram idênticas. No backend, seis funções existentes foram ajustadas e dez foram acrescentadas. Na preparação para o GitHub público, as referências internas de MAESTRO e DASHBOARD foram substituídas por consultas às propriedades do projeto. Os hashes de origem e entrega estão em `ARQUIVOS.json`. DASHBOARD_JS permanece byte a byte igual ao original.

Os testes exercitam a interface extraída de `JAVASCRIPT.html` sobre o DOM de `INDEX.html`, com chamadas `google.script.run` encaminhadas às funções de `MAESTRO.gs`. A planilha, o bloqueio e os serviços do Apps Script são simulados em memória; os dados de teste são fictícios.

## Limites

Não houve execução na implantação real do Apps Script, captura de tela em navegador ou validação visual móvel. É necessário conferir a versão de teste no projeto de destino antes de atualizar a implantação em uso.

Nenhum teste desta pasta demonstra uma migração para Firebase: o sistema corrigido continua usando os serviços do Apps Script. A pasta `firebase` contém testes e limitações próprios do módulo preparado para a próxima etapa.

O catálogo dos testes usa uma amostra representativa da estrutura de `DB_CONFIG`; a versão Apps Script lê todos os tipos e subtipos da planilha configurada. A validação não alterou a planilha do usuário, suas contas, arquivos no Drive ou domínio.

## Preparação para GitHub e Firebase — 16/09/2026

O repositório indicado é público. Os identificadores internos de recursos em MAESTRO/DASHBOARD foram externalizados, e os testes utilizam somente valores fictícios para essas propriedades. O projeto de destino está definido em `firebase/.firebaserc`.

Em 17/09/2026, a configuração Web pública enviada pelo usuário para `portal-depatri-6da3c` foi aplicada. A verificação `node firebase/scripts/check.mjs --production` passou: campos exigidos presentes, sintaxe/JSON válidos e projeto do aplicativo igual ao destino. Isso não autentica o operador, não verifica serviços remotos e não publica o Portal.

Na mesma etapa, o módulo Firebase passou a incluir cadastro, edição e pesquisa de Demandas Ativas, com testes próprios. Os cinco arquivos Apps Script não foram reescritos nesta etapa. Consulte `firebase/docs/VALIDACAO.md`.
