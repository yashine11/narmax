import jwt from 'jsonwebtoken';

export function requireKidsSession(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Kids session required' });
  }
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    if (p.scope !== 'kids') {
      return res.status(403).json({ message: 'Invalid kids session' });
    }
    req.kidsSession = true;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired kids session' });
  }
}
