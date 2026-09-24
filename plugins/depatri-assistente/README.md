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
