# Store 360

Aplicação local e fictícia para demonstrar a experiência **Meus pedidos**. Não representa uma loja real e não consulta sistemas externos.

## Executar

Requer Node.js 18 ou superior; não há dependências para instalar.

```sh
npm start
```

Abra <http://127.0.0.1:3000>. O servidor é vinculado a `127.0.0.1` por padrão. `PORT` e `HOST` podem ser configurados para desenvolvimento local; evite expor esta demonstração na rede.

Escolha Ana Exemplo ou Bruno Exemplo na tela inicial. Não há senha nem credenciais: a seleção fixa cria uma sessão em memória para a demonstração. Use **Sair** para invalidá-la. Os pedidos e itens em `data/orders.json` são inteiramente fictícios e somente leitura.

## Escopo demonstrado

- Lista “Meus pedidos”, detalhe, status atual derivado do último evento válido e linha do tempo mais antiga primeiro.
- Acesso às páginas de pedidos exige uma sessão de demonstração. A listagem e a busca de detalhes filtram a propriedade no servidor; identificadores inexistentes e pedidos de outro perfil retornam a mesma resposta 404.
- `src/orders.js` valida uma pequena sequência de transições **exclusivamente ilustrativa dos fixtures**: `confirmed → processing → shipped → delivered`. Esses nomes e essa sequência não afirmam quais estados ou regras uma loja real usa.
- Não há alteração de pedidos, notificações, rastreamento logístico, persistência de sessão/dados, nem integrações externas.

## Limites de segurança

Esta autenticação e os dados são ilustrativos/demo somente e **não são seguros para produção**. A escolha de perfil não comprova identidade nem usa credenciais. Tokens de sessão aleatórios ficam apenas na memória do processo, expiram após uma hora e desaparecem ao reiniciar o servidor. O cookie usa `HttpOnly` e `SameSite=Lax`; não usa `Secure` porque a demo serve HTTP local sem TLS. Isso não torna o app seguro para exposição pública. Não use dados reais, segredos, nem publique o servidor como serviço.

## Testes

```sh
npm test
```

Os testes usam somente `node:test` e cobrem ordenação/status/transições, propriedade, rotas protegidas, sessão/login/logout, respostas não-disclosure e páginas de erro.
