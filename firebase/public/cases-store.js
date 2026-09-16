export const key = value => String(value ?? '').normalize('NFKC').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toUpperCase();

export class CasesStore {
  constructor(call, uuid = () => crypto.randomUUID()) {
    this.call = call; this.uuid = uuid; this.listeners = new Set();
    this.epoch = 0; this.version = 0; this.busy = false; this.pending = null;
    this.state = {casos: [], tipos: [], podeCadastrar: false, sessionCleared: false};
  }
  snapshot() { return structuredClone(this.state); }
  emit() { for (const listener of this.listeners) listener(this.snapshot()); }
  subscribe(listener) { this.listeners.add(listener); listener(this.snapshot()); return () => this.listeners.delete(listener); }
  reset() {
    this.epoch++; this.version++; this.pending = null;
    this.state = {casos: [], tipos: [], podeCadastrar: false, sessionCleared: true}; this.emit();
  }
  async refresh() {
    const epoch = this.epoch, version = ++this.version, cases = new Map(), seen = new Set();
    let cursor = null, page;
    do {
      page = await this.call('obterBootstrapCasosPrioritarios', {cursor});
      if (epoch !== this.epoch || version !== this.version) return this.snapshot();
      for (const c of page.casos) cases.set(c.id, c);
      cursor = page.proximaPagina;
      if (cursor) {
        const token = JSON.stringify(cursor);
        if (seen.has(token)) throw new Error('Não foi possível atualizar a lista completa.');
        seen.add(token);
      }
    } while (cursor);
    this.state = {casos: [...cases.values()].sort((a, b) => a.nomeCaso.localeCompare(b.nomeCaso, 'pt-BR')),
      tipos: page.tipos, podeCadastrar: page.podeCadastrar === true, sessionCleared: false};
    this.emit(); return this.snapshot();
  }
  async create(input) {
    if (!this.state.podeCadastrar) throw new Error('Seu perfil permite apenas consultar casos.');
    if (this.busy) throw new Error('Aguarde a conclusão do cadastro.');
    const payload = {nomeCaso: input.nomeCaso.trim(), tipoCrime: input.tipoCrime, subtipoCrime: input.subtipoCrime || ''};
    const signature = JSON.stringify([key(payload.nomeCaso), key(payload.tipoCrime), key(payload.subtipoCrime)]);
    if (this.pending?.signature !== signature) this.pending = {signature, id: this.uuid()};
    const epoch = this.epoch;
    this.busy = true;
    try {
      const saved = await this.call('salvarCasoPrioritarioSemEventos', {...payload, solicitacaoId: this.pending.id});
      if (epoch !== this.epoch) throw new Error('A sessão mudou. Entre novamente para consultar o cadastro.');
      this.pending = null; this.version++;
      // A gravação confirmada alimenta todos os seletores imediatamente.
      this.state.casos = [...this.state.casos.filter(c => c.id !== saved.id), saved]
        .sort((a, b) => a.nomeCaso.localeCompare(b.nomeCaso, 'pt-BR'));
      this.emit();
      let listaAtualizada = true;
      try { await this.refresh(); } catch { listaAtualizada = false; }
      if (epoch !== this.epoch) throw new Error('A sessão mudou. Entre novamente para consultar o cadastro.');
      return {...saved, listaAtualizada};
    } finally { this.busy = false; }
  }
  async demands(casoId, cursor = null) {
    const epoch = this.epoch;
    const result = await this.call('listarDemandasCasoPrioritario', {casoId, cursor});
    if (epoch !== this.epoch) throw new Error('Sessão encerrada.');
    return result;
  }
  async bindDemand(demandaId, casoId) {
    const epoch = this.epoch;
    const result = await this.call('vincularCasoDemanda', {demandaId, casoId});
    if (epoch !== this.epoch) throw new Error('Sessão encerrada.');
    return result;
  }
}
