# DEPATRI – Assistente (MVP)

Plugin de habilidades para ChatGPT/Codex com dois fluxos iniciais:

- Assistente de Ocorrências
- Ofícios DEPATRI

A versão 0.1.0 é skills-only: aproveita as ferramentas/conectores já disponíveis ao modelo, sem servidor MCP próprio.

## Quebra-gelos
- Gerar Relatório Técnico
- Criar/Abrir pasta de imagens
- Analisar imagem
- Adicionar diligência
- Consultar caso
- Preparar ofício

## Regra do RT
- A fonte oficial do número é `PLANILHA PORTAL DEPATRI > INTEL_NUMERADOR`.
- `ULTIMO_NUMERO` representa o último número já utilizado; um novo RT usa `ULTIMO_NUMERO + 1`.
- A pasta do novo RT deve ser criada dentro de `RT - DESENVOLVIMENTO`, folder ID `1X6JiyPbZR9Tz7pHih09jm2degIpdcFDi`.
- O QR Code deve apontar para a subpasta específica do RT.
- O número não deve ser inferido pelo nome das pastas existentes.

## Próxima fase
Adicionar MCP próprio para operações específicas do Portal que não estejam cobertas pelos conectores existentes, com bloqueio transacional para a numeração e, quando necessário, UI de prévia do RT.


## Executor RT implementado
Arquivo:
`plugins/depatri-assistente/apps-script/RT_EXECUTOR.gs`

Ações:
- `RT_CONFIGURAR`
- `RT_STATUS`
- `RT_PREPARAR`
- `RT_PREVIA`
- `RT_ADICIONAR_IMAGEM`
- `RT_ATUALIZAR_IMAGEM`
- `RT_FINALIZAR`

O executor:
- reserva o próximo RT com `LockService`;
- usa `INTEL_NUMERADOR` como fonte oficial;
- cria a pasta diretamente na pasta-mãe configurada;
- reutiliza número/pasta quando o caso já estiver preparado;
- salva imagens originais no Drive;
- controla `INCLUIR_NO_RT` e `POSICAO_RT`;
- copia o Google Docs-modelo do RT;
- monta texto + imagens por evolução;
- insere legendas e QR Code;
- exporta PDF;
- grava links DOC/PDF/pasta novamente na demanda.

### Ativação
O arquivo precisa ser incluído no mesmo projeto Apps Script do Portal.
Depois, configurar a propriedade de script `DEPATRI_RT_PASTA_MAE_ID`.
O template padrão já possui fallback para o modelo atual; pode ser substituído por `DEPATRI_RT_TEMPLATE_ID`.

Antes do primeiro RT real, executar `pluginDepatriExecutar('RT_STATUS', {})`.
O diagnóstico não consome número.
