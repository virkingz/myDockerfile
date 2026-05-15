const express = require('express');
const app = express();

// ==================== 日志工具 ====================
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'; // debug, info, warn, error
function log(level, module, ...args) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if (levels[level] >= levels[LOG_LEVEL]) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] [${module}]`, ...args);
  }
}

// ==================== 配置 ====================
const STR = "/";
const LAST_VISIT_COOKIE = "__PROXY_VISITEDSITE__";
const PASSWORD_COOKIE = "__PROXY_PWD__";
const HINT_COOKIE = "__PROXY_HINT__";
const REPLACE_URL_OBJ = "__location__yproxy__";

const PASSWORD = process.env.PROXY_PASSWORD || "123";
const SHOW_PASSWORD_PAGE = process.env.SHOW_PASSWORD_PAGE !== "false";

log('info', 'CONFIG', `Password: ${PASSWORD ? 'SET' : 'NOT SET'}, ShowPasswordPage: ${SHOW_PASSWORD_PAGE}`);

// ==================== 注入脚本（保持原样） ====================

// 提示使用代理的横幅
const PROXY_HINT_INJECTION = `

function toEntities(str) {
return str.split("").map(ch => \`&#\${ch.charCodeAt(0)};\`).join("");
}

setTimeout(() => {
var hint = \`
Warning: You are currently using a web proxy, so do not log in to any website. Click to close this hint. For further details, please visit the link below.
警告：您当前正在使用网络代理，请勿登录任何网站。单击关闭此提示。详情请见以下链接。
\`;

if (document.readyState === 'complete' || document.readyState === 'interactive') {
document.body.insertAdjacentHTML(
  'afterbegin',
  \`<div style="position:fixed;left:0px;top:0px;width:100%;margin:0px;padding:0px;display:block;z-index:99999999999999999999999;user-select:none;cursor:pointer;" id="__PROXY_HINT_DIV__" onclick="document.getElementById('__PROXY_HINT_DIV__').remove();">
    <span style="position:relative;display:block;width:calc(100% - 20px);min-height:30px;font-size:14px;color:yellow;background:rgb(180,0,0);text-align:center;border-radius:5px;padding-left:10px;padding-right:10px;padding-top:1px;padding-bottom:1px;">
      \${toEntities(hint)}
      <br>
      <a href="https://github.com/1234567Yang/cf-proxy-ex/" style="color:rgb(250,250,180);">https://github.com/1234567Yang/cf-proxy-ex/</a>
    </span>
  </div>
  \`
);
}else{
alert(hint + "https://github.com/1234567Yang/cf-proxy-ex");
}
}, 5000);

`;

// 核心注入脚本（包含所有路径重写逻辑）
const HTTP_REQUEST_INJECTION = `

var nowURL = new URL(window.location.href);
var proxy_host = nowURL.host;
var proxy_protocol = nowURL.protocol;
var proxy_host_with_schema = proxy_protocol + "//" + proxy_host + "/";

Object.defineProperty(window, 'original_website_url_str', {
    get: function() {
        return window.location.href.substring(proxy_host_with_schema.length);
    }
});

Object.defineProperty(window, 'original_website_url', {
    get: function() {
        return new URL(original_website_url_str);
    }
});

Object.defineProperty(window, 'original_website_host', {
    get: function() {
        var h = original_website_url_str.substring(original_website_url_str.indexOf("://") + "://".length);
        return h.split('/')[0];
    }
});

Object.defineProperty(window, 'original_website_host_with_schema', {
    get: function() {
        return original_website_url_str.substring(0, original_website_url_str.indexOf("://")) + "://" + original_website_host + "/";
    }
});

function changeURL(relativePath) {
    if (relativePath == null) return null;
    let relativePath_str = "";
    if (relativePath instanceof URL) {
        relativePath_str = relativePath.href;
    } else {
        relativePath_str = relativePath.toString();
    }
    try {
        if (relativePath_str.startsWith("data:") || relativePath_str.startsWith("mailto:") || relativePath_str.startsWith("javascript:") || relativePath_str.startsWith("chrome") || relativePath_str.startsWith("edge")) return relativePath_str;
    } catch {
        return relativePath_str;
    }
    var pathAfterAdd = "";
    if (relativePath_str.startsWith("blob:")) {
        pathAfterAdd = "blob:";
        relativePath_str = relativePath_str.substring("blob:".length);
    }
    try {
        let startWithLs = [proxy_host_with_schema, proxy_host + "/", proxy_host]
        startWithLs.forEach(x => {
            if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length);
        });
        startWithLs.forEach(x => {
            x = "/" + x;
            if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length);
        });
        let enhancedStartRm = [original_website_host_with_schema.substring(0, original_website_host_with_schema.length - 1), original_website_host]
        enhancedStartRm.forEach(x => {
            x = "/" + x;
            if (relativePath_str.startsWith(x)) relativePath_str = relativePath_str.substring(x.length);
        });
    } catch {}
    try {
        var absolutePath = new URL(relativePath_str, original_website_url_str).href;
        absolutePath = absolutePath.replaceAll(window.location.href, original_website_url_str);
        absolutePath = absolutePath.replaceAll(encodeURI(window.location.href), encodeURI(original_website_url_str));
        absolutePath = absolutePath.replaceAll(encodeURIComponent(window.location.href), encodeURIComponent(original_website_url_str));
        absolutePath = absolutePath.replaceAll(proxy_host, original_website_host);
        absolutePath = absolutePath.replaceAll(encodeURI(proxy_host), encodeURI(original_website_host));
        absolutePath = absolutePath.replaceAll(encodeURIComponent(proxy_host), encodeURIComponent(original_website_host));
        absolutePath = proxy_host_with_schema + absolutePath;
        absolutePath = pathAfterAdd + absolutePath;
        return absolutePath;
    } catch (e) {
        return relativePath_str;
    }
}

function getOriginalUrl(url) {
    if (url == null) return null;
    if (url.startsWith(proxy_host_with_schema)) return url.substring(proxy_host_with_schema.length);
    return url;
}

function networkInject() {
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalFetch = window.fetch;
    XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
        arguments[1] = changeURL(url);
        return originalOpen.apply(this, arguments);
    };
    window.fetch = function (input, init) {
        var url;
        if (typeof input === 'string') {
            url = input;
        } else if (input instanceof Request) {
            url = input.url;
        } else {
            url = input;
        }
        url = changeURL(url);
        if (typeof input === 'string') {
            return originalFetch(url, init);
        } else {
            const newRequest = new Request(url, input);
            return originalFetch(newRequest, init);
        }
    };
}

function windowOpenInject() {
    const originalOpen = window.open;
    window.open = function (url, name, specs) {
        let modifiedUrl = changeURL(url);
        return originalOpen.call(window, modifiedUrl, name, specs);
    };
}

function appendChildInject() {
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (child) {
        try {
            if (child.src) { child.src = changeURL(child.src); }
            if (child.href) { child.href = changeURL(child.href); }
        } catch {}
        return originalAppendChild.call(this, child);
    };
}

function elementPropertyInject() {
    const originalSetAttribute = HTMLElement.prototype.setAttribute;
    HTMLElement.prototype.setAttribute = function (name, value) {
        if (name == "src" || name == "href" || name == "action") {
            value = changeURL(value);
        }
        originalSetAttribute.call(this, name, value);
    };
    const originalGetAttribute = HTMLElement.prototype.getAttribute;
    HTMLElement.prototype.getAttribute = function (name) {
        const val = originalGetAttribute.call(this, name);
        if (name == "src" || name == "href" || name == "action") {
            return getOriginalUrl(val);
        }
        return val;
    };
    const setList = [
        [HTMLAnchorElement, "href"],
        [HTMLScriptElement, "src"],
        [HTMLImageElement, "src"],
        [HTMLLinkElement, "href"],
        [HTMLIFrameElement, "src"],
        [HTMLVideoElement, "src"],
        [HTMLAudioElement, "src"],
        [HTMLSourceElement, "src"],
        [HTMLObjectElement, "data"],
        [HTMLFormElement, "action"],
    ];
    for (const [whichElement, whichProperty] of setList) {
        if (!whichElement || !whichElement.prototype) continue;
        const descriptor = Object.getOwnPropertyDescriptor(whichElement.prototype, whichProperty);
        if (!descriptor) continue;
        Object.defineProperty(whichElement.prototype, whichProperty, {
            get: function () {
                const real = descriptor.get.call(this);
                return getOriginalUrl(real);
            },
            set: function (val) {
                descriptor.set.call(this, changeURL(val));
            },
            configurable: true,
        });
    }
}

class ProxyLocation {
    constructor(originalLocation) {
        this.originalLocation = originalLocation;
    }
    reload(forcedReload) { this.originalLocation.reload(forcedReload); }
    replace(url) { this.originalLocation.replace(changeURL(url)); }
    assign(url) { this.originalLocation.assign(changeURL(url)); }
    get href() { return original_website_url_str; }
    set href(url) { this.originalLocation.href = changeURL(url); }
    get protocol() { return original_website_url.protocol; }
    set protocol(value) { original_website_url.protocol = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get host() { return original_website_url.host; }
    set host(value) { original_website_url.host = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get hostname() { return original_website_url.hostname; }
    set hostname(value) { original_website_url.hostname = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get port() { return original_website_url.port; }
    set port(value) { original_website_url.port = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get pathname() { return original_website_url.pathname; }
    set pathname(value) { original_website_url.pathname = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get search() { return original_website_url.search; }
    set search(value) { original_website_url.search = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get hash() { return original_website_url.hash; }
    set hash(value) { original_website_url.hash = value; this.originalLocation.href = proxy_host_with_schema + original_website_url.href; }
    get origin() { return original_website_url.origin; }
    toString() { return this.originalLocation.href; }
}

function documentLocationInject() {
    Object.defineProperty(document, 'URL', {
        get: function () { return original_website_url_str; },
        set: function (url) { document.URL = changeURL(url); }
    });
    Object.defineProperty(document, '${REPLACE_URL_OBJ}', {
        get: function () { return new ProxyLocation(window.location); },
        set: function (url) { window.location.href = changeURL(url); }
    });
}

function windowLocationInject() {
    Object.defineProperty(window, '${REPLACE_URL_OBJ}', {
        get: function () { return new ProxyLocation(window.location); },
        set: function (url) { window.location.href = changeURL(url); }
    });
}

function historyInject() {
    const originalPushState = History.prototype.pushState;
    const originalReplaceState = History.prototype.replaceState;
    History.prototype.pushState = function (state, title, url) {
        if (!url) return;
        if (url.startsWith("/" + original_website_url.href)) url = url.substring(("/" + original_website_url.href).length);
        if (url.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url = url.substring(("/" + original_website_url.href).length - 1);
        var u = changeURL(url);
        return originalPushState.apply(this, [state, title, u]);
    };
    History.prototype.replaceState = function (state, title, url) {
        if (!url) return;
        let url_str = url.toString();
        if (url_str.startsWith("/" + original_website_url.href)) url_str = url_str.substring(("/" + original_website_url.href).length);
        if (url_str.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1))) url_str = url_str.substring(("/" + original_website_url.href).length - 1);
        if (url_str.startsWith("/" + original_website_url.href.replace("://", ":/"))) url_str = url_str.substring(("/" + original_website_url.href.replace("://", ":/")).length);
        if (url_str.startsWith("/" + original_website_url.href.substring(0, original_website_url.href.length - 1).replace("://", ":/"))) url_str = url_str.substring(("/" + original_website_url.href).replace("://", ":/").length - 1);
        var u = changeURL(url_str);
        return originalReplaceState.apply(this, [state, title, u]);
    };
}

function obsPage() {
    var yProxyObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            traverseAndConvert(mutation);
        });
    });
    var config = { attributes: true, childList: true, subtree: true };
    yProxyObserver.observe(document.body, config);
}

function traverseAndConvert(node) {
    if (node instanceof HTMLElement) {
        removeIntegrityAttributesFromElement(node);
        covToAbs(node);
        node.querySelectorAll('*').forEach(function (child) {
            removeIntegrityAttributesFromElement(child);
            covToAbs(child);
        });
    }
}

function covToAbs(element) {
    if (!(element instanceof HTMLElement)) return;
    if (element.hasAttribute("href")) {
        try { element.setAttribute("href", changeURL(element.getAttribute("href"))); } catch (e) {}
    }
    if (element.hasAttribute("src")) {
        try { element.setAttribute("src", changeURL(element.getAttribute("src"))); } catch (e) {}
    }
    if (element.tagName === "FORM" && element.hasAttribute("action")) {
        try { element.setAttribute("action", changeURL(element.getAttribute("action"))); } catch (e) {}
    }
    if (element.tagName === "SOURCE" && element.hasAttribute("srcset")) {
        try { element.setAttribute("srcset", changeURL(element.getAttribute("srcset"))); } catch (e) {}
    }
    if ((element.tagName === "VIDEO" || element.tagName === "AUDIO") && element.hasAttribute("poster")) {
        try { element.setAttribute("poster", changeURL(element.getAttribute("poster"))); } catch (e) {}
    }
    if (element.tagName === "OBJECT" && element.hasAttribute("data")) {
        try { element.setAttribute("data", changeURL(element.getAttribute("data"))); } catch (e) {}
    }
}

function removeIntegrityAttributesFromElement(element) {
    if (element.hasAttribute('integrity')) {
        element.removeAttribute('integrity');
    }
}

function loopAndConvertToAbs() {
    for (var ele of document.querySelectorAll('*')) {
        removeIntegrityAttributesFromElement(ele);
        covToAbs(ele);
    }
}

function covScript() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        covToAbs(scripts[i]);
    }
    setTimeout(covScript, 3000);
}

networkInject();
windowOpenInject();
elementPropertyInject();
appendChildInject();
documentLocationInject();
windowLocationInject();
historyInject();

window.addEventListener('load', () => {
    loopAndConvertToAbs();
    obsPage();
    covScript();
});

window.addEventListener('error', event => {
    var element = event.target || event.srcElement;
    if (element.tagName === 'SCRIPT') {
        if (element.alreadyChanged) { return; }
        removeIntegrityAttributesFromElement(element);
        covToAbs(element);
        var newScript = document.createElement("script");
        newScript.src = element.src;
        newScript.async = element.async;
        newScript.defer = element.defer;
        newScript.alreadyChanged = true;
        document.head.appendChild(newScript);
    }
}, true);

`;

const HTML_COV_PATH_INJECT = `
function parseAndInsertDoc(htmlString) {
  const parser = new DOMParser();
  const tempDoc = parser.parseFromString(htmlString, 'text/html');
  const allElements = tempDoc.querySelectorAll('*');
  allElements.forEach(element => {
    covToAbs(element);
    removeIntegrityAttributesFromElement(element);
    if (element.tagName === 'SCRIPT') {
      if (element.textContent && !element.src) {
          element.textContent = replaceContentPaths(element.textContent);
      }
    }
    if (element.tagName === 'STYLE') {
      if (element.textContent) {
          element.textContent = replaceContentPaths(element.textContent);
      }
    }
  });
  let modifiedHtml = tempDoc.documentElement.outerHTML;
  let charset = modifiedHtml.match(/content="text\\/html;\\s*charset=[^"]*"/);
  if(charset != null && charset.length !== 0){
    modifiedHtml = modifiedHtml.replace(charset[0], "content='text/html;charset=utf-8'");
  }
  document.open();
  document.write('<!DOCTYPE html>' + modifiedHtml);
  document.close();
}

function replaceContentPaths(content){
  // 修复：在 Node.js 传输时，用 String.raw 避免转义问题
  var regex = /(https?:\\/\\/[^\\s"']+)/g;
  content = content.replace(regex, function(match) {
    if (match.indexOf("http://www.w3.org/") === 0 || match.indexOf("https://www.w3.org/") === 0) return match;
    if (match.indexOf("http") === 0) {
      return proxy_host_with_schema + match;
    } else {
      return proxy_host + "/" + match;
    }
  });
  return content;
}
`;

// HTML 路径转换函数（用于首次加载）

// ==================== 页面模板 ====================

const MAIN_PAGE = `
<html>
<head>
    <meta charset="utf-8">
    <title>Cf-proxy-ex</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { min-height: 100%; font-family: Arial, sans-serif; background-color: #f0f8ff; }
        body { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 30px; }
        .container { background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); width: 100%; max-width: 400px; text-align: center; margin: 20px 0; }
        h1 { font-size: 22px; margin-bottom: 15px; }
        input[type="text"] { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px; }
        button { padding: 10px 20px; background-color: #008cba; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
        button:hover { background-color: #005f5f; }
        ul { margin-top: 20px; list-style-type: none; font-size: 14px; text-align: left; width: 100%; max-width: 600px; }
        li { margin-bottom: 10px; }
        a { color: #008cba; text-decoration: none; cursor:pointer; }
        a:hover { text-decoration: underline; }
        @media (max-width: 600px) {
            body { justify-content: flex-start; }
            h1 { font-size: 18px; }
            button { font-size: 14px; }
            .container { padding: 15px; margin-top: 10px; }
        }
    </style>
</head>
<body>
<div class="container">
<form id="urlForm" onsubmit="redirectToProxy(event)">
    <h1>Cf-proxy-ex</h1>
    <label for="targetUrl">
        <input type="text" id="targetUrl" placeholder="Enter the target website here...">
    </label>
    <button type="submit" id="jump"> Jump! </button>
</form>
</div>
<ul>
  <li>如何使用 / How to use<br>
      1. 在上方输入框输入要访问的网址<br>
      2. 在代理网址后输入您要访问的网址<br>
  </li>
  <li>若显示 400 Bad Request 错误，请清本网站Cookie</li>
  <li>由于部分网站有代码混淆，不能保证所有网页的功能或渲染正常</li>
  <li><strong>强烈不建议在镜像页面中登录账号</strong></li>
  <li style="text-align:center;font-size: calc(100% + 2px);">
      <br>
      <a onclick="fillUrl('https://wikipedia.com/')">Wikipedia</a> |
      <a onclick="fillUrl('https://github.com/')">GitHub</a> |
      <a onclick="fillUrl('https://duckduckgo.com/')">DuckDuckGo</a>
  </li>
</ul>
<script>
  function redirectToProxy(event) {
      event.preventDefault();
      const targetUrl = document.getElementById('targetUrl').value.trim().toLowerCase();
      const currentOrigin = window.location.origin;
      window.open(currentOrigin + '/' + targetUrl, '_blank');
  }
  function fillUrl(url) {
    document.getElementById('targetUrl').value = url;
    document.getElementById('jump').click();
  }
</script>
</body>
</html>
`;

const PWD_PAGE = `
<!DOCTYPE html>
<html><head>
<script>
    function setPassword() {
        try {
            var cookieDomain = window.location.hostname;
            var password = document.getElementById('password').value;
            var oneWeekLater = new Date();
            oneWeekLater.setTime(oneWeekLater.getTime() + (7 * 24 * 60 * 60 * 1000));
            document.cookie = "${PASSWORD_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + cookieDomain;
            document.cookie = "${PASSWORD_COOKIE}=" + password + "; expires=" + oneWeekLater.toUTCString() + "; path=/; domain=" + cookieDomain;
        } catch(e) { alert(e.message); }
        location.reload();
    }
</script>
</head>
<body>
<div>
    <input id="password" type="password" placeholder="Password">
    <button onclick="setPassword()">Submit</button>
</div>
</body></html>
`;

const REDIRECT_ERROR = `
<html><head></head><body><h2>Error while redirecting: the website you want to access to may contain wrong redirect information, and we can not parse the info</h2></body></html>
`;

// ==================== 工具函数 ====================
function getCook(cookiename, cookieStr) {
  if (!cookieStr) return null;
  const match = RegExp(cookiename + "=([^;]+)").exec(cookieStr);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return null;
}

// ==================== Express 中间件 ====================
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// 信任代理（如果在反向代理后面）
app.set('trust proxy', true);

// ==================== 主代理路由 ====================
app.all('*', async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const proxyProtocol = req.protocol;
  const proxyHost = req.get('host');
  const proxyUrlBase = `${proxyProtocol}://${proxyHost}/`;
  const proxyHostOnly = proxyHost.split(':')[0];

  log('info', 'REQUEST', `[${requestId}] ${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  log('debug', 'REQUEST', `[${requestId}] Headers:`, JSON.stringify(req.headers));
  log('debug', 'REQUEST', `[${requestId}] Cookies:`, req.headers.cookie || '(none)');

  // ========== UA 检查 ==========
  const ua = req.headers['user-agent'] || '';
  if (ua.includes('Bytespider')) {
    log('warn', 'UA_BLOCK', `[${requestId}] Blocked Bytespider`);
    return res.status(200).type('text/html').send("好不要脸...污染内容...");
  }

  // ========== 密码验证 ==========
  if (PASSWORD !== "") {
    const cookies = req.headers.cookie || '';
    const pwd = getCook(PASSWORD_COOKIE, cookies);
    log('debug', 'AUTH', `[${requestId}] Cookie password: ${pwd ? pwd : '(empty)'}, Expected: ${PASSWORD}`);

    if (!pwd || pwd !== PASSWORD) {
      log('warn', 'AUTH', `[${requestId}] AUTH FAILED - Password mismatch or missing. Cookie: ${cookies.substring(0, 100)}`);

      if (SHOW_PASSWORD_PAGE) {
        log('info', 'AUTH', `[${requestId}] Showing password page`);
        return res.status(403).type('text/html; charset=utf-8').send(PWD_PAGE);
      } else {
        log('info', 'AUTH', `[${requestId}] Returning 403 Forbidden`);
        return res.status(403).type('text/html; charset=utf-8').send("<h1>403 Forbidden</h1><br>You do not have access to view this webpage.");
      }
    }
    log('info', 'AUTH', `[${requestId}] AUTH OK`);
  }

  // ========== 特殊路径处理 ==========
  if (req.path === '/favicon.ico') {
    log('debug', 'SPECIAL', `[${requestId}] favicon.ico requested`);
    return res.status(204).end();
  }
  if (req.path === '/robots.txt') {
    log('debug', 'SPECIAL', `[${requestId}] robots.txt requested`);
    return res.type('text/plain').send("User-agent: *\nDisallow: /");
  }

  // ========== 提取目标 URL ==========
  let actualUrlStr = decodeURIComponent(req.path.substring(STR.length) + req.url.substring(req.path.length));
  // 去掉开头的 /
  if (actualUrlStr.startsWith('/')) {
    actualUrlStr = actualUrlStr.substring(1);
  }

  log('debug', 'TARGET', `[${requestId}] Extracted path: "${actualUrlStr}"`);

  // 如果是空路径，显示主页
  if (!actualUrlStr || actualUrlStr === '/') {
    log('info', 'TARGET', `[${requestId}] Empty target, showing main page`);
    return res.type('text/html; charset=utf-8').send(MAIN_PAGE);
  }

  // 没有协议前缀时，尝试从 Cookie 恢复上一次访问的站点
  if (!/^https?:\/\//i.test(actualUrlStr)) {
    const cookies = req.headers.cookie || '';
    const lastVisit = getCook(LAST_VISIT_COOKIE, cookies);
    log('debug', 'TARGET', `[${requestId}] No protocol, lastVisit: ${lastVisit}`);

    if (lastVisit) {
      // 检查是否可能是搜索参数等形式
      if (actualUrlStr.startsWith('?') || actualUrlStr.startsWith('#')) {
        actualUrlStr = lastVisit + '/' + actualUrlStr;
        log('info', 'TARGET', `[${requestId}] Appending to lastVisit: ${actualUrlStr}`);
      } else {
        actualUrlStr = 'https://' + actualUrlStr;
        log('info', 'TARGET', `[${requestId}] Adding https://: ${actualUrlStr}`);
      }
    } else {
      actualUrlStr = 'https://' + actualUrlStr;
      log('info', 'TARGET', `[${requestId}] Adding https:// (no lastVisit): ${actualUrlStr}`);
    }
  }

  // ========== 验证目标 URL ==========
  let actualUrl;
  try {
    actualUrl = new URL(actualUrlStr);
    log('info', 'TARGET', `[${requestId}] Parsed target: ${actualUrl.href}`);
  } catch (e) {
    log('error', 'TARGET', `[${requestId}] Invalid URL: "${actualUrlStr}" - ${e.message}`);

    // 从 Cookie 恢复
    const cookies = req.headers.cookie || '';
    const lastVisit = getCook(LAST_VISIT_COOKIE, cookies);
    if (lastVisit) {
      const redirectUrl = proxyUrlBase + lastVisit + '/' + actualUrlStr;
      log('info', 'TARGET', `[${requestId}] Redirecting with lastVisit: ${redirectUrl}`);
      return res.redirect(302, redirectUrl);
    }
    log('error', 'TARGET', `[${requestId}] Cannot resolve target URL`);
    return res.status(400).type('text/html').send(`<h1>400 Bad Request</h1><p>Cannot parse target URL: ${actualUrlStr}</p>`);
  }

  // 修正大小写
  if (actualUrlStr !== actualUrl.href) {
    log('debug', 'TARGET', `[${requestId}] URL case mismatch, redirecting to ${actualUrl.href}`);
    return res.redirect(301, proxyUrlBase + actualUrl.href);
  }

  // ========== 修改请求头 ==========
  const clientHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key === 'host' || key === 'connection' || key === 'transfer-encoding') continue;
    let newValue = value;
    if (typeof newValue === 'string') {
      newValue = newValue.replaceAll(proxyUrlBase, `${actualUrl.protocol}//${actualUrl.hostname}/`);
      newValue = newValue.replaceAll(proxyUrlBase.substring(0, proxyUrlBase.length - 1), `${actualUrl.protocol}//${actualUrl.hostname}`);
      newValue = newValue.replaceAll(proxyHostOnly, actualUrl.hostname);
    }
    clientHeaders[key] = newValue;
  }
  clientHeaders['host'] = actualUrl.host;
  log('debug', 'UPSTREAM', `[${requestId}] Upstream headers set, host: ${actualUrl.host}`);

  // ========== 修改请求体 ==========
  let bodyToSend = req.body;
  if (req.body && req.body.length > 0) {
    try {
      const bodyStr = req.body.toString('utf8');
      if (bodyStr.includes(proxyUrlBase) || bodyStr.includes(proxyHostOnly)) {
        let newBody = bodyStr.replaceAll(proxyUrlBase, actualUrlStr);
        newBody = newBody.replaceAll(proxyHostOnly, actualUrl.hostname);
        bodyToSend = Buffer.from(newBody, 'utf8');
        log('debug', 'UPSTREAM', `[${requestId}] Modified request body (length: ${bodyToSend.length})`);
      }
    } catch (e) {
      log('debug', 'UPSTREAM', `[${requestId}] Binary body, not modified`);
    }
  }

  // ========== 发起上游请求 ==========
  log('info', 'UPSTREAM', `[${requestId}] Fetching ${actualUrlStr}`);
  let upstreamResponse;
  try {
    upstreamResponse = await fetch(actualUrlStr, {
      method: req.method,
      headers: clientHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' && bodyToSend && bodyToSend.length > 0 ? bodyToSend : undefined,
      redirect: 'manual',
    });
    log('info', 'UPSTREAM', `[${requestId}] Response: ${upstreamResponse.status} ${upstreamResponse.statusText}`);
  } catch (err) {
    log('error', 'UPSTREAM', `[${requestId}] Fetch error: ${err.message}`);
    return res.status(502).type('text/html').send(`<h1>502 Bad Gateway</h1><p>Upstream error: ${err.message}</p>`);
  }

  // ========== 处理重定向 ==========
  if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
    const location = upstreamResponse.headers.get('location');
    log('info', 'REDIRECT', `[${requestId}] Redirect ${upstreamResponse.status} to: ${location}`);

    if (location) {
      try {
        const redirectUrl = proxyUrlBase + new URL(location, actualUrlStr).href;
        log('info', 'REDIRECT', `[${requestId}] Modified redirect: ${redirectUrl}`);

        // 转发 Cookie
        const setCookies = upstreamResponse.headers.getSetCookie ? upstreamResponse.headers.getSetCookie() : [];
        if (setCookies.length > 0) {
          setCookies.forEach(c => {
            log('debug', 'COOKIE', `[${requestId}] Upstream Set-Cookie: ${c.substring(0, 80)}`);
          });
          const modifiedCookies = handleCookieHeader(setCookies, false, upstreamResponse.status, actualUrlStr, actualUrl, proxyHostOnly);
          res.setHeader('Set-Cookie', modifiedCookies);
          log('debug', 'COOKIE', `[${requestId}] Modified Cookies: ${modifiedCookies.join('; ').substring(0, 100)}`);
        }

        return res.redirect(upstreamResponse.status, redirectUrl);
      } catch (e) {
        log('error', 'REDIRECT', `[${requestId}] Redirect parse error: ${e.message}`);
        return res.type('text/html').send(REDIRECT_ERROR + `<br>URL: ${location}`);
      }
    }
  }

  // ========== 读取响应 ==========
  const rawBytes = Buffer.from(await upstreamResponse.arrayBuffer());
  const contentType = upstreamResponse.headers.get('Content-Type') || '';
  log('debug', 'RESPONSE', `[${requestId}] Content-Type: ${contentType}, Size: ${rawBytes.length}`);

  let isHTML = contentType.includes('text/html') && rawBytes.length > 0;
  let bodyToSendStr;

  const isText = /text\/|application\/json|application\/javascript/.test(contentType);

  if (isText && rawBytes.length > 0) {
    // 解码
    let encoding = 'utf-8';
    const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
    if (charsetMatch) {
      encoding = charsetMatch[1];
      log('debug', 'RESPONSE', `[${requestId}] Charset from header: ${encoding}`);
    } else if (contentType.includes('text/html')) {
      const preview = new TextDecoder('utf-8').decode(rawBytes.slice(0, 2048));
      const metaMatch = preview.match(/charset\s*=\s*["']?\s*([^\s"';>]+)/i);
      if (metaMatch) {
        encoding = metaMatch[1];
        log('debug', 'RESPONSE', `[${requestId}] Charset from meta: ${encoding}`);
      }
    }

    try {
      bodyToSendStr = new TextDecoder(encoding).decode(rawBytes);
    } catch (e) {
      log('warn', 'RESPONSE', `[${requestId}] Decode with ${encoding} failed, falling back to utf-8`);
      bodyToSendStr = new TextDecoder('utf-8').decode(rawBytes);
    }

    // 替换 location
    if (contentType.includes('html') || contentType.includes('javascript')) {
      const beforeReplace = bodyToSendStr.includes('window.location') || bodyToSendStr.includes('document.location');
      bodyToSendStr = bodyToSendStr.replaceAll('window.location', `window.${REPLACE_URL_OBJ}`);
      bodyToSendStr = bodyToSendStr.replaceAll('document.location', `document.${REPLACE_URL_OBJ}`);
      if (beforeReplace) {
        log('debug', 'INJECT', `[${requestId}] Replaced location references`);
      }
    }

    // HTML: 注入客户端代理脚本
    if (isHTML) {
      const hasBOM = bodyToSendStr.charCodeAt(0) === 0xFEFF;
      if (hasBOM) {
        bodyToSendStr = bodyToSendStr.substring(1);
        log('debug', 'INJECT', `[${requestId}] Detected BOM`);
      }
      const cookies = req.headers.cookie || '';
      const hasHintCookie = getCook(HINT_COOKIE, cookies) !== null;

      // 将原始 HTML 编码为 base64
      const encodedHTML = Buffer.from(bodyToSendStr, 'utf-8').toString('base64');
      log('debug', 'INJECT', `[${requestId}] Original HTML encoded, length: ${encodedHTML.length}`);

      const injectedScript = `
<script>
(function() {
  ${!hasHintCookie ? PROXY_HINT_INJECTION : '// hint already shown'}
})();
(function() {
  ${HTTP_REQUEST_INJECTION}
  ${HTML_COV_PATH_INJECT}
  const originalBodyEncoded = "${encodedHTML}";
  const bytes = Uint8Array.from(atob(originalBodyEncoded), c => c.charCodeAt(0));
  parseAndInsertDoc(new TextDecoder().decode(bytes));
})();
</script>`;

      bodyToSendStr = (hasBOM ? '\uFEFF' : '') + injectedScript;
      log('info', 'INJECT', `[${requestId}] Injected proxy scripts into HTML`);
    } else {
      // 非 HTML 文本：替换绝对 URL
      const regex = /(https?:\/\/[^\s"']+)/g;
      const matches = bodyToSendStr.match(regex);
      bodyToSendStr = bodyToSendStr.replace(regex, (match) => {
        if (match.startsWith('http://www.w3.org/') || match.startsWith('https://www.w3.org/')) return match;
        return proxyUrlBase + match;
      });
      if (matches) {
        log('debug', 'INJECT', `[${requestId}] Replaced ${matches.length} absolute URLs in non-HTML content`);
      }
    }
  }

  // ========== 设置响应头 ==========
  const responseHeaders = {};
  upstreamResponse.headers.forEach((value, key) => {
    const lk = key.toLowerCase();
    if (['content-security-policy', 'content-security-policy-report-only',
         'permissions-policy', 'cross-origin-embedder-policy',
         'cross-origin-resource-policy', 'x-frame-options'].includes(lk)) {
      log('debug', 'HEADERS', `[${requestId}] Removed header: ${key}`);
      return;
    }
    responseHeaders[key] = value;
  });

  responseHeaders['Access-Control-Allow-Origin'] = '*';
  responseHeaders['X-Frame-Options'] = 'ALLOWALL';

  // 缓存控制
  const cookies = req.headers.cookie || '';
  const hasHintCookie = getCook(HINT_COOKIE, cookies) !== null;
  if (!hasHintCookie) {
    responseHeaders['Cache-Control'] = 'max-age=0';
    log('debug', 'HEADERS', `[${requestId}] Set Cache-Control: max-age=0 (no hint cookie)`);
  }

  // 处理 Cookie
  const setCookies = upstreamResponse.headers.getSetCookie ? upstreamResponse.headers.getSetCookie() : [];
  if (setCookies.length > 0) {
    setCookies.forEach(c => log('debug', 'COOKIE', `[${requestId}] Upstream Set-Cookie: ${c.substring(0, 80)}`));
  }
  const modifiedCookies = handleCookieHeader(setCookies, isHTML, upstreamResponse.status, actualUrlStr, actualUrl, proxyHostOnly);
  if (modifiedCookies.length > 0) {
    res.setHeader('Set-Cookie', modifiedCookies);
    log('debug', 'COOKIE', `[${requestId}] Set modified cookies: ${modifiedCookies.join('; ').substring(0, 150)}`);
  }

  // 写入响应头
  for (const [key, value] of Object.entries(responseHeaders)) {
    if (key.toLowerCase() === 'set-cookie') continue;
    res.setHeader(key, value);
  }

  // ========== 发送响应 ==========
  res.status(upstreamResponse.status);

  if (isText && bodyToSendStr) {
    // ⚠️ 文本内容已被修改，不再是原始压缩数据，必须删除 Content-Encoding
    if (responseHeaders['content-encoding']) {
      delete responseHeaders['content-encoding'];
      log('info', 'RESPONSE', `[${requestId}] Removed Content-Encoding (text was modified)`);
    }
    if (responseHeaders['Content-Encoding']) {
      delete responseHeaders['Content-Encoding'];
    }
    // 同时删除 Transfer-Encoding，因为我们是直接发送完整内容
    if (responseHeaders['transfer-encoding']) {
      delete responseHeaders['transfer-encoding'];
      log('info', 'RESPONSE', `[${requestId}] Removed Transfer-Encoding`);
    }

    responseHeaders['Content-Type'] = contentType.replace(/charset=([^\s;]+)/i, 'charset=utf-8');
  }

  // 写入响应头
  for (const [key, value] of Object.entries(responseHeaders)) {
    if (key.toLowerCase() === 'set-cookie') continue;
    res.setHeader(key, value);
  }

  res.removeHeader('Content-Encoding');
  // 发送响应体
  if (isText && bodyToSendStr) {
    const buf = Buffer.from(bodyToSendStr, 'utf-8');
    log('info', 'RESPONSE', `[${requestId}] Sending modified text, length: ${buf.length}`);
    res.send(buf);
  } else if (rawBytes.length > 0) {
    log('info', 'RESPONSE', `[${requestId}] Sending binary, length: ${rawBytes.length}`);
    res.send(rawBytes);
  } else {
    log('info', 'RESPONSE', `[${requestId}] Sending empty`);
    res.end();
  }

});

// ==================== Cookie 处理函数 ====================
function handleCookieHeader(setCookies, isHTML, status, actualUrlStr, actualUrl, proxyHost) {
  const modified = [];

  for (const sc of setCookies) {
    let parts = sc.split(';').map(s => s.trim());

    // 修改 Path
    let pathIdx = parts.findIndex(p => p.toLowerCase().startsWith('path='));
    let originalPath = pathIdx !== -1 ? parts[pathIdx].substring(5) : '/';
    try {
      let absolutePath = '/' + new URL(originalPath, actualUrlStr).href;
      if (pathIdx !== -1) {
        parts[pathIdx] = `Path=${absolutePath}`;
      } else {
        parts.push(`Path=${absolutePath}`);
      }
    } catch (e) {
      log('warn', 'COOKIE', `Failed to modify cookie path: ${e.message}`);
    }

    // 修改 Domain
    let domainIdx = parts.findIndex(p => p.toLowerCase().startsWith('domain='));
    if (domainIdx !== -1) {
      parts[domainIdx] = `domain=${proxyHost}`;
    } else {
      parts.push(`domain=${proxyHost}`);
    }

    modified.push(parts.join('; '));
  }

  // 添加 lastVisit Cookie
  if (isHTML && status === 200 && actualUrl) {
    const lastVisitCookie = `${LAST_VISIT_COOKIE}=${actualUrl.origin}; Path=/; Domain=${proxyHost}`;
    if (!modified.some(c => c.startsWith(LAST_VISIT_COOKIE))) {
      modified.push(lastVisitCookie);
      log('debug', 'COOKIE', `Added lastVisit cookie: ${lastVisitCookie}`);
    }
  }

  return modified;
}

// ==================== 启动服务 ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('  Web Proxy Server (cf-proxy-ex)');
  console.log('='.repeat(60));
  console.log(`  Port: ${PORT}`);
  console.log(`  Password: ${PASSWORD || '(disabled)'}`);
  console.log(`  Show Password Page: ${SHOW_PASSWORD_PAGE}`);
  console.log(`  Log Level: ${LOG_LEVEL}`);
  console.log('='.repeat(60));
});
