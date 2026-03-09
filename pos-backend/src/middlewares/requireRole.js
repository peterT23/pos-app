function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: 'Không đủ quyền truy cập' });
    }
    return next();
  };
}

module.exports = requireRole;
