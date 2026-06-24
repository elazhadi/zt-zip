const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function secret() {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, site_id: user.site_id, nom: user.nom, email: user.email },
    secret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "12h" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, secret());
}

function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { signToken, verifyToken, hashPassword, checkPassword };
