import jwt from 'jsonwebtoken';

const TOKEN_LIFETIME = '30d';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}

/** Requires "Authorization: Bearer <token>"; sets req.userId. */
export function requireAuth(req, res, next) {
  const [type, token] = (req.get('authorization') ?? '').split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}
