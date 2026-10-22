'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createDemoAuth, expiredSessionCookie, sessionCookie } = require('./demo-auth');
const { currentStatus, getOrderForUser, getOrdersForUser, loadData } = require('./orders');
const { errorPage, loginPage, orderPage, ordersPage } = require('./views');

const data = loadData();
const auth = createDemoAuth(data.users);
const CSS_PATH = path.join(__dirname, '..', 'public', 'styles.css');
const MAX_FORM_BYTES = 4096;

function sendHtml(response, statusCode, html, headers = {}) {
  response.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  response.end(html);
}

function sendError(response, statusCode, title, message) {
  const page = errorPage(title, message, statusCode);
  sendHtml(response, statusCode, page.html);
}

function readForm(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    request.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > MAX_FORM_BYTES) {
        tooLarge = true;
        body = '';
      }
    });
    request.on('end', () => {
      if (tooLarge) {
        const error = new Error('Formulário muito grande');
        error.statusCode = 413;
        reject(error);
        return;
      }
      resolve(new URLSearchParams(body));
    });
    request.on('error', reject);
  });
}

function createServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const user = auth.getUserFromCookieHeader(request.headers.cookie);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/login')) {
      return sendHtml(response, 200, loginPage(data.users));
    }
    if (request.method === 'POST' && url.pathname === '/login') {
      try {
        const form = await readForm(request);
        const token = auth.createSession(form.get('userId'));
        if (!token) return sendHtml(response, 400, loginPage(data.users, 'Selecione um perfil de demonstração válido.'));
        response.writeHead(303, { Location: '/orders', 'Set-Cookie': sessionCookie(token) });
        return response.end();
      } catch (error) {
        if (error.statusCode === 413) {
          return sendError(response, 413, 'Formulário muito grande', 'O formulário excede o tamanho permitido. Volte e tente novamente.');
        }
        return sendError(response, 400, 'Não foi possível continuar', 'O formulário não pôde ser lido. Volte e tente novamente.');
      }
    }
    if (request.method === 'POST' && url.pathname === '/logout') {
      auth.destroySession(request.headers.cookie);
      response.writeHead(303, { Location: '/login', 'Set-Cookie': expiredSessionCookie() });
      return response.end();
    }
    if (request.method === 'GET' && url.pathname === '/styles.css') {
      try {
        response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
        return response.end(fs.readFileSync(CSS_PATH));
      } catch {
        return sendError(response, 500, 'Página indisponível', 'O estilo da demonstração não pôde ser carregado.');
      }
    }
    if (url.pathname === '/orders' || url.pathname.startsWith('/orders/')) {
      if (!user) {
        response.writeHead(303, { Location: '/login' });
        return response.end();
      }
      if (request.method !== 'GET') return sendError(response, 405, 'Método não permitido', 'Esta demonstração é somente para leitura.');
      if (url.pathname === '/orders') return sendHtml(response, 200, ordersPage(user, getOrdersForUser(data, user.id), currentStatus));
      let orderId;
      try {
        orderId = decodeURIComponent(url.pathname.slice('/orders/'.length));
      } catch {
        return sendError(response, 404, 'Pedido não encontrado', 'Não foi possível localizar esse pedido.');
      }
      const order = getOrderForUser(data, user.id, orderId);
      if (!order) return sendError(response, 404, 'Pedido não encontrado', 'Não foi possível localizar esse pedido.');
      return sendHtml(response, 200, orderPage(user, order, currentStatus));
    }
    return sendError(response, 404, 'Página não encontrada', 'O endereço solicitado não existe nesta demonstração.');
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  createServer().listen(port, host, () => {
    console.log(`Store 360 demo disponível em http://${host}:${port}`);
    console.log('Aviso: autenticação e dados são ilustrativos; não usar em produção.');
  });
}

module.exports = { createServer };
