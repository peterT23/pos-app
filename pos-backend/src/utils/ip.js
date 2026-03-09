function getClientIp(req) {
  const header = req.headers['x-forwarded-for'];
  if (header) {
    const ips = header.split(',').map((item) => item.trim()).filter(Boolean);
    if (ips.length > 0) return ips[0];
  }
  const addr = req.socket?.remoteAddress || '';
  return addr.replace(/^::ffff:/, '');
}

module.exports = {
  getClientIp,
};
