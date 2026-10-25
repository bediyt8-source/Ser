// Servidor multiplayer WebSocket do Battle World. Rodar: npm install && node server.js
// O servidor é a autoridade das POSIÇÕES: limita área do mapa e velocidade (anti-trapaça).
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const players = new Map(), MAXSP = 9, BOUND = 72;
const send = (ws, o) => ws.readyState === 1 && ws.send(JSON.stringify(o));
const broadcast = o => players.forEach(p => send(p.ws, o));
wss.on('connection', ws => {
  let id = null;
  ws.on('message', raw => {
    let d; try { d = JSON.parse(raw); } catch { return; }
    if (d.t === 'join') {
      id = String(d.id).slice(0, 12);
      players.set(id, { id, name: String(d.name || 'Ranger').slice(0, 12), x: 0, z: 0, y: 0, ry: 0, ch: -1, m: 0, ws, last: Date.now() });
    }
    const p = players.get(id); if (!p) return;
    if (d.t === 'pos') {
      const now = Date.now(), dt = Math.max(now - p.last, 50) / 1000; p.last = now;
      const nx = Math.max(-BOUND, Math.min(BOUND, +d.x || 0)), nz = Math.max(-BOUND, Math.min(BOUND, +d.z || 0));
      if (Math.hypot(nx - p.x, nz - p.z) > MAXSP * dt * 1.8 + 10) send(ws, { t: 'kick' }); // teleporte/velocidade inválida: ignora
      else { p.x = nx; p.z = nz; }
      p.y = Math.max(0, Math.min(4, +d.y || 0)); p.ry = +d.ry || 0; p.ch = d.ch | 0; p.m = d.m ? 1 : 0;
    }
    if (d.t === 'fx') broadcast({ t: 'fx', id });
    if (d.t === 'chat') broadcast({ t: 'chat', name: p.name, text: String(d.text).slice(0, 80) });
  });
  ws.on('close', () => players.delete(id));
});
setInterval(() => { // 10 atualizações por segundo
  const arr = [...players.values()].map(({ id, name, x, z, y, ry, ch, m }) => ({ id, name, x, z, y, ry, ch, m }));
  broadcast({ t: 'state', p: arr });
}, 100);
console.log('Servidor Battle World na porta', process.env.PORT || 8080);
