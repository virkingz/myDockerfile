const express = require('express');
const app = express();

// 首页 HTML（与你提供的完全一致）
const ROOT_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css" rel="stylesheet">
  <title>Proxy Everything</title>
  <link rel="icon" type="image/png" href="https://img.icons8.com/color/1000/kawaii-bread-1.png">
  <meta name="Description" content="Proxy Everything with CF Workers.">
  <meta property="og:description" content="Proxy Everything with CF Workers.">
  <meta property="og:image" content="https://img.icons8.com/color/1000/kawaii-bread-1.png">
  <meta name="robots" content="index, follow">
  <meta http-equiv="Content-Language" content="zh-CN">
  <meta name="copyright" content="Copyright © ymyuuu">
  <meta name="author" content="ymyuuu">
  <link rel="apple-touch-icon-precomposed" sizes="120x120" href="https://img.icons8.com/color/1000/kawaii-bread-1.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">
  <style>
      body, html { height: 100%; margin: 0; }
      .background {
          background-image: url('https://imgapi.cn/bing.php');
          background-size: cover;
          background-position: center;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
      }
      .card {
          background-color: rgba(255, 255, 255, 0.8);
          transition: background-color 0.3s ease, box-shadow 0.3s ease;
      }
      .card:hover {
          background-color: rgba(255, 255, 255, 1);
          box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.3);
      }
      .input-field input[type=text] { color: #2c3e50; }
      .input-field input[type=text]:focus+label { color: #2c3e50 !important; }
      .input-field input[type=text]:focus {
          border-bottom: 1px solid #2c3e50 !important;
          box-shadow: 0 1px 0 0 #2c3e50 !important;
      }
  </style>
</head>
<body>
  <div class="background">
      <div class="container">
          <div class="row">
              <div class="col s12 m8 offset-m2 l6 offset-l3">
                  <div class="card">
                      <div class="card-content">
                          <span class="card-title center-align"><i class="material-icons left">link</i>Proxy Everything</span>
                          <form id="urlForm" onsubmit="redirectToProxy(event)">
                              <div class="input-field">
                                  <input type="text" id="targetUrl" placeholder="在此输入目标地址" required>
                                  <label for="targetUrl">目标地址</label>
                              </div>
                              <button type="submit" class="btn waves-effect waves-light teal darken-2 full-width">跳转</button>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
  <script>
      function redirectToProxy(event) {
          event.preventDefault();
          const targetUrl = document.getElementById('targetUrl').value.trim();
          const currentOrigin = window.location.origin;
          window.open(currentOrigin + '/' + encodeURIComponent(targetUrl), '_blank');
      }
  </script>
</body>
</html>`;

// 工具函数：补全协议
function ensureProtocol(url, defaultProtocol = 'https:') {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return defaultProtocol + '//' + url;
}

// 过滤请求头（排除以 cf- 开头的）
function filterHeaders(headers, filterFunc) {
  const newHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    if (filterFunc(key)) {
      newHeaders[key] = value;
    }
  }
  return newHeaders;
}

// 替换 HTML 中的相对路径（以 / 开头的 href、src、action）
function replaceRelativePaths(text, protocol, host, origin) {
  const regex = /((href|src|action)\s*=\s*["'])\/(?!\/)/gi;
  return text.replace(regex, `$1${protocol}//${host}/${origin}/`);
}

app.use(express.raw({ type: '*/*', limit: '50mb' }));
app.set('trust proxy', true);

app.all('*', async (req, res) => {
  try {
    const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);

    // 根路径返回首页
    if (url.pathname === '/') {
      return res.type('text/html').send(ROOT_HTML);
    }

    // 从路径提取目标 URL
    let actualUrlStr = decodeURIComponent(url.pathname.substring(1));
    actualUrlStr = ensureProtocol(actualUrlStr, url.protocol);
    actualUrlStr += url.search;  // 保留查询参数

    // 过滤请求头
    const reqHeaders = filterHeaders(req.headers, name => !name.startsWith('cf-'));

    // 发起上游请求
    const upstream = await fetch(actualUrlStr, {
      method: req.method,
      headers: reqHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'manual'
    });

    // 处理重定向
    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      const location = upstream.headers.get('location');
      if (location) {
        const newLocation = '/' + encodeURIComponent(new URL(location, actualUrlStr).href);
        // 复制响应头（排除安全头）
        const respHeaders = {};
        upstream.headers.forEach((value, key) => {
          if (['content-security-policy', 'x-frame-options'].includes(key.toLowerCase())) return;
          respHeaders[key] = value;
        });
        respHeaders['location'] = newLocation;
        res.set(respHeaders);
        res.status(upstream.status);
        return res.send(await upstream.arrayBuffer());
      }
    }

    // 处理响应体
    let body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || '';
    const isHTML = contentType.includes('text/html');

    if (isHTML) {
      // 解码 HTML
      let text;
      try {
        text = new TextDecoder(contentType.includes('charset=') ? contentType.split('charset=')[1].split(';')[0] : 'utf-8').decode(body);
      } catch {
        text = new TextDecoder('utf-8').decode(body);
      }
      // 替换相对路径
      const targetOrigin = new URL(actualUrlStr).origin;
      text = replaceRelativePaths(text, url.protocol, url.host, targetOrigin);
      body = Buffer.from(text, 'utf-8');
    }

    // 设置响应头
    const respHeaders = {};
    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (['content-security-policy', 'x-frame-options'].includes(lk)) return;
      respHeaders[key] = value;
    });
    respHeaders['cache-control'] = 'no-store';
    respHeaders['access-control-allow-origin'] = '*';
    respHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE';
    respHeaders['access-control-allow-headers'] = '*';

    // 🔥 关键：如果修改了 HTML，必须移除 Content-Encoding
    if (isHTML) {
      delete respHeaders['content-encoding'];
      delete respHeaders['transfer-encoding'];
    }

    res.status(upstream.status);
    res.set(respHeaders);
    res.send(Buffer.from(body));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Simple proxy running on port ${PORT}`));
