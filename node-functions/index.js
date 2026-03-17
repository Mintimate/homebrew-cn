import { renderPage } from './templates/layout.js';

// EdgeOne Pages Node Functions 入口
// 对应路由: /
export function onRequest(context) {
  const html = renderPage();

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
