# Configuração de Ofícios DEPATRI

## Planilha principal
- Nome: PLANILHA PORTAL DEPATRI
- Spreadsheet ID: `1QBSBp8-Xo5chJgDY0723XUMOZnAHALd9L3A2JM2Tyxw`

## Catálogo de modelos
- Aba: `DB_TEXTOS_DOCS`
- Campos: `NOME`, `IDENTIFICADOR`, `ASSUNTO`, `TEXTO_BASE`, `MODELO_DOC_ID`.

O plugin deve consultar a aba em tempo de execução, para permitir que novos modelos sejam adicionados sem alterar a lógica principal.

## Modelos atualmente cadastrados
- OFICIO DE IMAGENS
- OFICIO IFOOD
- OFICIO LOCADORA PELA PLACA
- OFICIO LOCADORA PELO ENDEREÇO
- OFICIO PROVEDOR DE INTERNET
- OFICIO EMPRESA DE TELEFONIA
- MANDADO DE INTIMAÇÃO

## Regra do Google Docs-modelo
1. Identificar o tipo solicitado.
2. Localizar a linha correspondente em `DB_TEXTOS_DOCS`.
3. Ler `MODELO_DOC_ID`.
4. Copiar o Google Docs inteiro.
5. Preservar cabeçalho, logos, tabelas, margens, rodapé, estilos e imagens incorporadas, inclusive assinatura.
6. Substituir apenas tags/campos variáveis.
7. Exportar a cópia final em PDF e manter o Google Docs quando aplicável.

## Numeração
- Aba: `INTEL_NUMERADOR`.
- A numeração deve ser reservada antes da geração final.
- Nunca inferir número pelo nome de arquivos existentes.

## Registro do documento
- Aba: `INTEL_OFICIOS`.
- O registro do ofício continua sendo a fonte documental/administrativa do documento gerado.

## Controle de pendências
Criar uma aba exclusiva chamada `PENDENCIAS_OFICIOS`.
Não reutilizar `CONTROLE_ENVIOS`, pois essa aba já é destinada ao controle de envio de produtividade.

### Colunas recomendadas
`ID_PENDENCIA`
`ID_OFICIO`
`NUM_OFICIO`
`TIPO_DOCUMENTO`
`DATA_PEDIDO`
`EQUIPE`
`TIPO_PROCEDIMENTO`
`NUMERO_PROCEDIMENTO`
`DESTINATARIO`
`EMAIL_DESTINATARIO`
`STATUS_ENVIO`
`DATA_ENVIO`
`STATUS_RESPOSTA`
`DATA_RESPOSTA`
`GMAIL_MESSAGE_ID_ENVIO`
`GMAIL_THREAD_ID`
`GMAIL_MESSAGE_ID_RESPOSTA`
`LINK_DOC`
`LINK_PDF`
`OBSERVACAO`

### Estados
Ao criar ofício:
- STATUS_ENVIO = PENDENTE
- STATUS_RESPOSTA = AGUARDANDO_ENVIO

Após envio:
- STATUS_ENVIO = ENVIADO
- STATUS_RESPOSTA = AGUARDANDO_RESPOSTA

Após resposta:
- STATUS_ENVIO = ENVIADO
- STATUS_RESPOSTA = RESPONDIDO

`DATA_PEDIDO`, `EQUIPE`, `TIPO_PROCEDIMENTO` e `NUMERO_PROCEDIMENTO` são campos históricos e não devem ser apagados ou substituídos nas transições de estado.
