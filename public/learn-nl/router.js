function assetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/learn') {
      return Response.redirect(`${url.origin}/learn/`, 308);
    }

    if (path === '/' || path === '/index.html') {
      return env.ASSETS.fetch(assetRequest(request, '/home.html'));
    }

    if (path === '/learn/' || path === '/learn/index.html') {
      return env.ASSETS.fetch(assetRequest(request, '/index.html'));
    }

    if (path.startsWith('/learn/')) {
      const assetPath = path.slice('/learn'.length) || '/index.html';
      return env.ASSETS.fetch(assetRequest(request, assetPath));
    }

    return env.ASSETS.fetch(request);
  }
};
