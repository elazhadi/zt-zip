const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

function secret() {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

function signToken(user, sessionKey) {
  return jwt.sign(
    {
      sub:         user.id,
      role:        user.role,
      site_id:     user.site_id,
      tenant_id:   user.tenant_id,
      nom:         user.nom,
      email:       user.email,
      session_key: sessionKey,
    },
    secret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, secret());
}

function generateSessionKey() {
  return randomUUID();
}

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { signToken, verifyToken, generateSessionKey, hashPassword, checkPassword };
