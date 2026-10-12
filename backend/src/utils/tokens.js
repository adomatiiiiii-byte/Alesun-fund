const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const { normalizeRole } = require("../services/backofficeAuth.service");

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: normalizeRole(user.role),
      rawRole: user.role,
      fullName: user.fullName,
      linkedEntityId: user.linkedEntityId || null
    },
    jwtSecret,
    { expiresIn: "15m" }
  );
}

module.exports = { signToken };
