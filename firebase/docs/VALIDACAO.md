# Validação — 15/09/2026

## Executado

- Instalação das dependências Firebase e geração do package-lock das funções.
- Instalação das dependências dos testes e geração do package-lock principal.
- 25 testes Node.js aprovados: validação do catálogo, duplicidade, sessão e perfil, gravação atômica simulada, idempotência, paginação, acesso por unidade, vínculos históricos, atualizações assíncronas e comportamento DOM do formulário.
- Teste DOM completo de cadastrar FURTO DE HILUX / FURTO / FURTO DE VEICULO e verificar sua presença nos três seletores: casos, fenômeno do formulário e fenômeno da busca.
- Teste de conteúdo HTML como texto, limpeza de seletores no logout e descarte de resposta de demandas do caso anteriormente selecionado.
- Carregamento das quatro callable functions usando os SDKs Firebase instalados; cada uma recusou chamada sem sessão com `unauthenticated`.
- Verificação de sintaxe JavaScript e JSON.

## Limites reais

- Os testes de serviço usam um banco simulado com transações atômicas. Não comprovam índices, regras e concorrência no Firestore real.
- O emulador Firebase foi tentado, mas não iniciou: a versão instalada exige Java 21 ou superior e o ambiente dispõe de versão anterior. Nenhum teste com emulador foi anunciado como aprovado.
- O navegador remoto recusou a URL localhost com `ERR_BLOCKED_BY_CLIENT`. A validação do DOM foi realizada com jsdom; não houve inspeção visual em navegador, teste de layout móvel nem captura de tela.
- Não houve execução contra projeto Firebase real, deploy, alteração DNS ou importação de dados.
- Após o reenvio, os cinco anexos originais foram recuperados e corrigidos em `../../apps-script`, com 15 testes próprios aprovados. A integração deste módulo Firebase no portal completo e a conversão dos demais serviços continuam pendentes. Esses 15 testes não usam Firestore e não devem ser confundidos com os 25 testes desta implementação Firebase.
- O repositório de destino foi definido como `Jonathanpcce/Portal-Depatri` e o projeto como `portal-depatri-6da3c`. O envio ao GitHub registra o código; não substitui os testes no ambiente Firebase nem publica no domínio.

Antes da publicação final, validar no projeto de teste: cadastro por dois operadores, consulta por delegacia, retomada após perda de conexão, índices Firestore, regras de acesso, autenticação e vínculo ao salvar uma demanda completa.
