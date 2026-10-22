'use strict';

const crypto = require('node:crypto');

const SESSION_COOKIE = 'store360_demo_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60;

function createDemoAuth(users) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const sessions = new Map();

  function createSession(userId) {
    if (!usersById.has(userId)) return null;
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { userId, createdAt: Date.now() });
    return token;
  }

  function getUserFromCookieHeader(cookieHeader = '') {
    const pair = cookieHeader.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    if (!pair) return null;
    const token = pair.slice(SESSION_COOKIE.length + 1);
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() - session.createdAt > SESSION_MAX_AGE_SECONDS * 1000) {
      sessions.delete(token);
      return null;
    }
    return usersById.get(session.userId) || null;
  }

  function destroySession(cookieHeader = '') {
    const pair = cookieHeader.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    if (pair) sessions.delete(pair.slice(SESSION_COOKIE.length + 1));
  }

  return { createSession, getUserFromCookieHeader, destroySession };
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

module.exports = {
  SESSION_COOKIE,
  createDemoAuth,
  expiredSessionCookie,
  sessionCookie,
};
