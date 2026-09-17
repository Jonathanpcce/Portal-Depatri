# Validação — atualização de 17/09/2026

## Executado

- 47 testes Node.js aprovados: 25 já existentes de casos, catálogo e seletores; 14 novos de serviços de demandas/configuração/PDFs; 8 novos de interface de Demandas Ativas.
- Os testes de interface chamam os serviços de casos, demandas e anexos sobre o banco e Storage simulados, incluindo cadastrar FURTO DE HILUX, conferir os três seletores, gravar a demanda com esse ID, pesquisar por caso/tipo e consultar a demanda no caso.
- Cadastro/edição de todos os grupos de campos, contadores e detalhes; bloqueio de procedimento repetido; troca do número sem prender o índice antigo; perda de resposta sem duplicar demanda ou PDF; preservação de históricos e detecção de edição concorrente.
- Acesso por unidade também nas consultas por ID e nos downloads. Referências de PDFs de outro operador, arquivos incompatíveis, arquivos acima de 10 MB e novos links externos são recusados.
- Importação dos menus de DB_CONFIG verificada com dados fictícios, incluindo EQUIPE por VALOR_EXTRA e categorias com acentos. Não houve leitura de dados reais.
- Respostas atrasadas após abertura de novo formulário ou encerramento de sessão não reintroduzem dados anteriores. Nomes semelhantes a HTML permanecem texto.
- As dez callable functions foram carregadas com os SDKs Firebase instalados e seus handlers recusaram chamadas sem sessão. Esse teste não é uma chamada HTTP autenticada ao Firebase.
- Configuração pública Web do projeto `portal-depatri-6da3c` aplicada. Sintaxe, JSON e correspondência entre aplicativo e destino verificadas com `node scripts/check.mjs --production`.

## Limites

- Banco e transações são simulados. Não houve execução em Firestore/Auth/Storage reais nem teste com dois navegadores conectados ao projeto.
- A tentativa anterior de emulador não iniciou por exigir Java 21 ou superior. Nenhuma execução de emulador foi declarada aprovada.
- A validação de interface usa jsdom. Não houve inspeção visual em navegador nem conferência do layout móvel; a tentativa anterior de acesso remoto à prévia local foi bloqueada.
- O formulário preserva os campos dos veículos, mas a consulta automática externa de modelos/valores ainda não foi convertida.
- A importação real deve criar também os índices de unicidade dos procedimentos e casos e mapear todos os campos. O planejador existente não executa essa importação.
- PDFs sem vínculo podem permanecer após uma tentativa de salvar interrompida. Não há tarefa automática de limpeza e nenhum histórico é apagado por esta etapa.
- A configuração Web não comprova que os serviços foram habilitados ou que o operador dispõe de acesso para publicar. Não houve deploy, importação de dados ou alteração DNS.

Os 15 testes separados dos originais em `../../tests` usam Apps Script/Sheets simulados. Somados aos 47 desta implementação, são 62 testes locais; isso não demonstra a migração dos demais módulos do Portal.

Antes de publicar, validar no destino os perfis reais, menus, índices, regras em conjunto com os serviços já existentes, dois operadores editando simultaneamente, envio/consulta de PDFs e perda de conexão. Manter a versão completa em uso até concluir a migração dos demais módulos.
