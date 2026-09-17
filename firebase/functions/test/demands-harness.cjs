'use strict';
const {createHash, randomUUID} = require('node:crypto');
const {FakeDB} = require('./fake-db.cjs');
const {createCasesService} = require('../src/cases-service.cjs');
const {createDemandsService} = require('../src/demands-service.cjs');
const {createAttachmentsService, MAX_PDF_BYTES} = require('../src/attachments-service.cjs');
const {tipos} = require('../../config/crimes.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const menus = {status: ['EM ANDAMENTO', 'CONCLUÍDA'], unidade: ['UNIDADE A', 'UNIDADE B'], equipe: ['EQUIPE TESTE'], tipoOcorrencia: ['B.O', 'INQUERITO POLICIAL']};
const data = extra => ({dataOcorrencia: '2026-09-15', status: 'EM ANDAMENTO', unidade: 'UNIDADE A', tipoOcorrencia: 'B.O', numOcorrencia: '123/2026', crimeTipo: 'FURTO DE VEICULO', ...extra});
function setup(extra = {}) {
  const db = new FakeDB({
    'usuarios/editor': {ativo: true, perfil: 'NUIP'}, 'usuarios/editor2': {ativo: true, perfil: 'ADMIN'},
    'usuarios/direcao': {ativo: true, perfil: 'DIRECAO'}, 'usuarios/unidade': {ativo: true, perfil: 'DELEGACIA', lotacao: 'unidade a'},
    'usuarios/inativo': {ativo: false, perfil: 'ADMIN'}, 'configuracoes/crimes': {tipos}, 'configuracoes/demandas': menus, ...extra
  });
  const common = {db, hash, now: () => 'timestamp-test', documentId: () => '__name__'}, cases = createCasesService(common), objects = new Map();
  const attachments = createAttachmentsService({...common, getAccess: cases.getAccess, files: {write: async (p, b) => objects.set(p, b), read: async p => objects.get(p)}});
  const demands = createDemandsService({...common, cases, attachments});
  const request = (data = {}, uid = 'editor') => ({data, auth: uid ? {uid} : null});
  const save = (values = {}, extra = {}, uid = 'editor') => demands.save(request({dados: data(values), solicitacaoId: randomUUID(), ...extra}, uid));
  return {db, objects, cases, demands, attachments, request, save};
}
module.exports = {setup, data};
