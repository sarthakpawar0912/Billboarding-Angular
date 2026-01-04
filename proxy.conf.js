const PROXY_CONFIG = {
  "/api": {
    target: "http://localhost:8080",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    onProxyReq: (proxyReq, req, res) => {
      // Remove the origin header to prevent CORS issues
      proxyReq.removeHeader('origin');
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log proxy responses for debugging
      console.log('[Proxy]', req.method, req.url, '->', proxyRes.statusCode);
    }
  },
  "/uploads": {
    target: "http://localhost:8080",
    secure: false,
    changeOrigin: true,
    logLevel: "debug"
  }
};

module.exports = PROXY_CONFIG;
