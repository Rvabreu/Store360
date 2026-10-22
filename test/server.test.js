'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');
const { SESSION_COOKIE } = require('../src/demo-auth');

let server;
let baseUrl;

test.before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function signIn(userId = 'ana-demo') {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ userId }),
  });
  return response;
}

test('login page explains demo authentication and offers fixed demo users only', async () => {
  const response = await fetch(`${baseUrl}/login`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /autenticação são apenas ilustrativas/);
  assert.match(html, /Ana Exemplo/);
  assert.match(html, /Bruno Exemplo/);
  assert.doesNotMatch(html, /password|senha/i);
});

test('orders require session; successful login creates local-demo session cookie', async () => {
  const blocked = await fetch(`${baseUrl}/orders`, { redirect: 'manual' });
  assert.equal(blocked.status, 303);
  assert.equal(blocked.headers.get('location'), '/login');

  const response = await signIn();
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/orders');
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=[a-f0-9]+; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600$`));
  assert.doesNotMatch(cookie, /Secure/); // Local HTTP demo; README explains this is not a production cookie.

  const listing = await fetch(`${baseUrl}/orders`, { headers: { Cookie: cookie.split(';')[0] } });
  const html = await listing.text();
  assert.equal(listing.status, 200);
  assert.match(html, /DEMO-1001/);
  assert.match(html, /DEMO-1002/);
  assert.doesNotMatch(html, /DEMO-2001/);
});

test('detail shows current status and chronological timeline only to owner', async () => {
  const login = await signIn();
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const response = await fetch(`${baseUrl}/orders/DEMO-1001`, { headers: { Cookie: cookie } });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Status atual: <strong>Enviado/);
  const timeline = html.slice(html.indexOf('<ol class="timeline">'));
  assert.ok(timeline.indexOf('Confirmado') < timeline.indexOf('Em preparação'));
  assert.ok(timeline.indexOf('Em preparação') < timeline.indexOf('Enviado'));
  assert.match(html, /mais antigo primeiro/);

  const foreign = await fetch(`${baseUrl}/orders/DEMO-2001`, { headers: { Cookie: cookie } });
  const missing = await fetch(`${baseUrl}/orders/DOES-NOT-EXIST`, { headers: { Cookie: cookie } });
  const malformed = await fetch(`${baseUrl}/orders/%E0%A4%A`, { headers: { Cookie: cookie } });
  assert.equal(foreign.status, 404);
  assert.equal(missing.status, 404);
  assert.equal(malformed.status, 404);
  assert.match(await foreign.text(), /Não foi possível localizar esse pedido/);
  assert.match(await missing.text(), /Não foi possível localizar esse pedido/);
});

test('invalid demo user gets understandable error; logout invalidates session', async () => {
  const invalid = await signIn('not-a-demo-user');
  assert.equal(invalid.status, 400);
  assert.match(await invalid.text(), /Selecione um perfil de demonstração válido/);

  const login = await signIn('bruno-demo');
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const logout = await fetch(`${baseUrl}/logout`, { method: 'POST', headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  const afterLogout = await fetch(`${baseUrl}/orders`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(afterLogout.status, 303);
  assert.equal(afterLogout.headers.get('location'), '/login');
});

test('oversized login form receives a clear 413 response without dropping the connection', async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `userId=ana-demo&extra=${'a'.repeat(5000)}`,
  });
  assert.equal(response.status, 413);
  assert.match(await response.text(), /excede o tamanho permitido/);
});

test('unknown pages and read-only mutation attempts have clear errors', async () => {
  const notFound = await fetch(`${baseUrl}/missing`);
  assert.equal(notFound.status, 404);
  assert.match(await notFound.text(), /O endereço solicitado não existe/);
  const login = await signIn();
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const mutation = await fetch(`${baseUrl}/orders`, { method: 'POST', headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(mutation.status, 405);
  assert.match(await mutation.text(), /somente para leitura/);
});
