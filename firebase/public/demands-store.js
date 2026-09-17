export class DemandsStore {
  constructor(call, uuid = () => crypto.randomUUID()) {
    this.call = call; this.uuid = uuid; this.epoch = 0; this.pending = null; this.saving = false; this.uploads = new WeakMap();
  }
  reset() { this.epoch++; this.pending = null; this.uploads = new WeakMap(); }
  async request(name, data = {}) {
    const epoch = this.epoch, response = await this.call(name, data);
    if (epoch !== this.epoch) throw new Error('A sessão mudou. Entre novamente para continuar.');
    return response;
  }
  bootstrap() { return this.request('obterBootstrapDemandasAtivas'); }
  get(demandaId) { return this.request('obterDemandaAtiva', {demandaId}); }
  search(filtros, cursor = null) { return this.request('pesquisarDemandasAtivas', {filtros, cursor}); }
  async save(dados, current = null) {
    if (this.saving) throw new Error('Aguarde o salvamento em andamento.');
    const payload = {dados, ...(current ? {demandaId: current.id, versao: current.versao} : {})};
    const signature = JSON.stringify(payload);
    if (this.pending?.signature !== signature) this.pending = {signature, solicitacaoId: this.uuid()};
    this.saving = true;
    try {
      const result = await this.request('salvarDemandaAtiva', {...payload, solicitacaoId: this.pending.solicitacaoId});
      this.pending = null; return result;
    } finally { this.saving = false; }
  }
  async upload(file, readBase64) {
    if (!file || file.size > 10 * 1024 * 1024 || !/\.pdf$/i.test(file.name)) throw new Error('Escolha um PDF de até 10 MB.');
    const epoch = this.epoch;
    if (!this.uploads.has(file)) this.uploads.set(file, {solicitacaoId: this.uuid()});
    const entry = this.uploads.get(file);
    if (entry.saved) return entry.saved;
    const base64 = await readBase64(file);
    if (epoch !== this.epoch) throw new Error('Sessão encerrada.');
    const saved = await this.request('enviarPdfDemanda', {nome: file.name, base64, solicitacaoId: entry.solicitacaoId});
    entry.saved = saved; return saved;
  }
  download(referencia) { return this.request('baixarPdfDemanda', {anexoId: referencia.slice(6)}); }
}
