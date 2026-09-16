'use strict';
// Test double: transações atômicas e consultas determinísticas, sem acesso externo.
class FakeDB {
  constructor(seed = {}) { this.rows = structuredClone(seed); this.seq = 0; this.tail = Promise.resolve(); }
  snapshot(path) { const value = this.rows[path]; return {id: path.split('/').at(-1), exists: value !== undefined, data: () => structuredClone(value)}; }
  collection(name) { return new Query(this, name); }
  runTransaction(callback) {
    const run = this.tail.then(async () => {
      const operations = []; let wrote = false;
      const tx = {
        get: async ref => { if (wrote) throw new Error('Leitura depois de escrita na transação'); return ref.get(); },
        create: (ref, data) => { wrote = true; operations.push(['create', ref.path, data]); },
        update: (ref, data) => { wrote = true; operations.push(['update', ref.path, data]); }
      };
      const result = await callback(tx), next = structuredClone(this.rows);
      for (const [op, path, data] of operations) {
        if (op === 'create' && next[path]) throw new Error('Documento já existe');
        if (op === 'update' && !next[path]) throw new Error('Documento ausente');
        next[path] = {...(op === 'update' ? next[path] : {}), ...structuredClone(data)};
      }
      this.rows = next; return result;
    });
    this.tail = run.catch(() => {}); return run;
  }
}
class Query {
  constructor(db, name, filter = [], order = [], size = Infinity, cursor = null) {
    Object.assign(this, {db, name, filter, order, size, cursor});
  }
  clone(changes) { return Object.assign(new Query(this.db, this.name, this.filter, this.order, this.size, this.cursor), changes); }
  doc(value = `auto-${++this.db.seq}`) { const path = this.name + '/' + value; return {path, id: value, get: async () => this.db.snapshot(path)}; }
  where(field, op, value) { if (op !== '==') throw new Error('Operador de teste desconhecido'); return this.clone({filter: [...this.filter, [field, value]]}); }
  orderBy(field) { return this.clone({order: [...this.order, field]}); }
  limit(size) { return this.clone({size}); }
  startAfter(...cursor) { return this.clone({cursor}); }
  async get() {
    const val = (doc, field) => field === '__name__' ? doc.id : doc.data()[field];
    const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
    const lex = (a, b) => { for (let i = 0; i < a.length; i++) { const cmp = compare(a[i], b[i]); if (cmp) return cmp; } return 0; };
    let docs = Object.keys(this.db.rows).filter(path => path.startsWith(this.name + '/') && path.split('/').length === 2)
      .map(path => this.db.snapshot(path)).filter(doc => this.filter.every(([f, v]) => doc.data()[f] === v));
    docs.sort((a, b) => lex(this.order.map(f => val(a, f)), this.order.map(f => val(b, f))));
    if (this.cursor) docs = docs.filter(doc => lex(this.order.map(f => val(doc, f)), this.cursor) > 0);
    return {docs: docs.slice(0, this.size)};
  }
}
module.exports = {FakeDB};
