'use strict';

const STATUS_LABELS = {
  confirmed: 'Confirmado',
  processing: 'Em preparação',
  shipped: 'Enviado',
  delivered: 'Entregue',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function layout(title, content, user = null) {
  const signedIn = user ? `<span>Demo: ${escapeHtml(user.name)}</span><form method="post" action="/logout"><button type="submit">Sair</button></form>` : '';
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} · Store 360</title><link rel="stylesheet" href="/styles.css"></head>
<body>
  <header class="site-header"><a class="brand" href="/">Store 360</a>${signedIn}</header>
  <main>
    <aside class="demo-warning" role="note"><strong>Demonstração fictícia:</strong> seleção de usuário e autenticação são apenas ilustrativas, sem credenciais reais. Sessões ficam somente na memória; este app não é seguro para produção.</aside>
    ${content}
  </main>
  <footer>Dados de exemplo, somente leitura. Nenhum pedido real ou atualização é realizado.</footer>
</body>
</html>`;
}

function loginPage(users, error = '') {
  const options = users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)}</option>`).join('');
  const alert = error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : '';
  return layout('Entrar na demonstração', `<section class="panel"><h1>Meus pedidos</h1><p>Escolha um perfil fictício para visualizar seus pedidos de exemplo.</p>${alert}<form method="post" action="/login"><label for="userId">Usuário de demonstração</label><select id="userId" name="userId" required>${options}</select><button type="submit">Continuar</button></form></section>`);
}

function ordersPage(user, orders, currentStatus) {
  const rows = orders.map((order) => `<li><a href="/orders/${encodeURIComponent(order.id)}"><span class="order-id">${escapeHtml(order.id)}</span><span>Pedido de ${escapeHtml(formatDate(order.placedAt))}</span><span class="status">${escapeHtml(STATUS_LABELS[currentStatus(order)] || currentStatus(order))}</span></a></li>`).join('');
  const body = `<section><h1>Meus pedidos</h1><p>Olá, ${escapeHtml(user.name)}. Estes registros são fictícios e somente para demonstração.</p>${rows ? `<ul class="order-list">${rows}</ul>` : '<p>Não há pedidos de demonstração para este perfil.</p>'}</section>`;
  return layout('Meus pedidos', body, user);
}

function orderPage(user, order, currentStatus) {
  const status = currentStatus(order);
  const items = order.items.map((item) => `<li>${escapeHtml(item.name)} <span>× ${escapeHtml(item.quantity)}</span></li>`).join('');
  const events = order.events.map((event) => `<li><time datetime="${escapeHtml(event.at)}">${escapeHtml(formatDateTime(event.at))}</time><strong>${escapeHtml(STATUS_LABELS[event.status] || event.status)}</strong><span>${escapeHtml(event.description)}</span></li>`).join('');
  const body = `<p><a href="/orders">← Voltar aos meus pedidos</a></p><section><h1>Pedido ${escapeHtml(order.id)}</h1><p>Pedido realizado em ${escapeHtml(formatDateTime(order.placedAt))}</p><p class="current-status">Status atual: <strong>${escapeHtml(STATUS_LABELS[status] || status)}</strong></p><h2>Itens</h2><ul>${items}</ul><h2>Linha do tempo (mais antigo primeiro)</h2><ol class="timeline">${events}</ol></section>`;
  return layout(`Pedido ${order.id}`, body, user);
}

function errorPage(title, message, statusCode = 400) {
  const body = `<section class="panel"><h1>${escapeHtml(title)}</h1><p class="error" role="alert">${escapeHtml(message)}</p><p><a href="/">Voltar ao início</a></p></section>`;
  return { statusCode, html: layout(title, body) };
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC';
}

module.exports = { errorPage, escapeHtml, loginPage, orderPage, ordersPage };
