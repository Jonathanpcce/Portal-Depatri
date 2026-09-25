# Configuração operacional do RT

## Pasta-mãe de mídias/RT
- Nome funcional: RT - DESENVOLVIMENTO
- Google Drive folder ID: `1X6JiyPbZR9Tz7pHih09jm2degIpdcFDi`
- URL: `https://drive.google.com/drive/folders/1X6JiyPbZR9Tz7pHih09jm2degIpdcFDi`

Toda pasta criada para um novo Relatório Técnico deve ser criada diretamente dentro dessa pasta-mãe.

## Fonte oficial da numeração
- Planilha: PLANILHA PORTAL DEPATRI
- Spreadsheet ID: `1QBSBp8-Xo5chJgDY0723XUMOZnAHALd9L3A2JM2Tyxw`
- Aba: `INTEL_NUMERADOR`
- Chave do documento: `RELATORIO TECNICO`
- Colunas esperadas: `TIPO_DOC`, `ANO`, `ULTIMO_NUMERO`

A numeração NÃO deve ser inferida pelos nomes das pastas do Drive. A aba `INTEL_NUMERADOR` é a fonte oficial.

## Regra de incremento
Não alterar o numerador durante cadastro do caso, inclusão de evoluções, upload de imagens, preparação ou prévia.

Somente quando o usuário mandar **"Gerar RT"** ou autorizar a geração final:
1. Ler naquele instante a linha de `INTEL_NUMERADOR` em que `TIPO_DOC = RELATORIO TECNICO` e `ANO = ano corrente`.
2. Tratar `ULTIMO_NUMERO` como o último número já utilizado.
3. Calcular `NOVO_NUMERO = ULTIMO_NUMERO + 1`.
4. **Incrementar a planilha**, gravando `NOVO_NUMERO` na própria célula `ULTIMO_NUMERO`.
5. Confirmar por nova leitura que a célula passou a registrar `NOVO_NUMERO`.
6. Somente depois dessa confirmação usar `NOVO_NUMERO/ANO` como número oficial do RT e concluir a geração.
7. Se a gravação ou confirmação falhar, interromper a geração.

Exemplo: se, no exato momento da geração, `ULTIMO_NUMERO = 99`, o novo RT será `100/2026` e `INTEL_NUMERADOR.ULTIMO_NUMERO` ficará gravado como `100`.

## Nome da pasta
Usar:
`RT <NOVO_NUMERO>.<ANO> - IMAGENS - <IDENTIFICADOR_DA_OCORRENCIA>`

Exemplo:
`RT 99.2026 - IMAGENS - B.O Nº 115 - 2125 2026`

Sanitizar somente caracteres incompatíveis com nomes de pasta, preservando o identificador da ocorrência de forma reconhecível.

## QR Code
O QR Code do relatório deve apontar para a URL da subpasta criada para aquele RT, e não para a pasta-mãe.
