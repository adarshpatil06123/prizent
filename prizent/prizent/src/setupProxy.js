const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Route ALL /api requests through the API Gateway (port 8083)
  // IMPORTANT: Use pathFilter instead of Express mount path to preserve the /api prefix.
  // Express mount path (app.use('/api', proxy)) strips the /api prefix before forwarding,
  // but the API Gateway routes expect paths like /api/auth/**, /api/admin/**, etc.
  app.use(
    createProxyMiddleware({
      target: 'http://localhost:8083',
      pathFilter: '/api',
      changeOrigin: true,
      secure: false,
      ws: true,
      logger: console,
      on: {
        proxyReq: function(proxyReq, req, res) {
          console.log('[Proxy] Forwarding:', req.method, req.originalUrl, '-> http://localhost:8083' + req.originalUrl);
        },
        error: function(err, req, res) {
          console.error('[Proxy] Error:', err.message);
          res.writeHead(500, {
            'Content-Type': 'application/json',
          });
          res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
        }
      }
    })
  );
};
