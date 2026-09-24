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
Ao executar o comando "Gerar RT":
1. Ler a linha de `INTEL_NUMERADOR` em que `TIPO_DOC = RELATORIO TECNICO` e `ANO = ano corrente`.
2. Tratar `ULTIMO_NUMERO` como o último número já utilizado.
3. Calcular `NOVO_NUMERO = ULTIMO_NUMERO + 1`.
4. Reservar o novo número atualizando `ULTIMO_NUMERO` para `NOVO_NUMERO`.
5. Confirmar por leitura que o valor gravado é o novo número antes de criar a pasta.
6. Se a gravação falhar, não criar pasta nem finalizar RT.
7. Não reutilizar um número já reservado.

Exemplo: se `ULTIMO_NUMERO = 98`, o novo RT é `99/2026` e a célula passa a registrar `99`.

## Nome da pasta
Usar:
`RT <NOVO_NUMERO>.<ANO> - IMAGENS - <IDENTIFICADOR_DA_OCORRENCIA>`

Exemplo:
`RT 99.2026 - IMAGENS - B.O Nº 115 - 2125 2026`

Sanitizar somente caracteres incompatíveis com nomes de pasta, preservando o identificador da ocorrência de forma reconhecível.

## QR Code
O QR Code do relatório deve apontar para a URL da subpasta criada para aquele RT, e não para a pasta-mãe.
