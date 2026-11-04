/**
 * =====================================================================
 *  Make 10 の Service Worker（サービスワーカー）
 *  ---------------------------------------------------------------------
 *  ブラウザの裏側でこっそり動く小さなプログラム。
 *  一度開いたページ（HTML・CSS・JS・フォントなど）を端末に保存しておき、
 *  ネットがつながっていないときでも、保存したものを使って画面を表示する。
 *  → これで「オフラインでも遊べる」＋「ホーム画面に追加してアプリのように使える」ようになる。
 *
 *  ※ このファイルは index.html と同じフォルダに置くこと。
 * =====================================================================
 */

// 保存先の名前。ファイルの内容を大きく変えて、古い保存を消したいときは v2, v3... と数字を上げる
const CACHE_NAME = 'make10-v1';

// 自分のサイトのファイル（最初に保存しておく）
const LOCAL_FILES = ['./', './index.html', './index.css', './index.js', './favicon.jpg'];

// 外部サイト（CDN）から読み込んでいるもの。オフラインでも画面が崩れないよう、これも保存しておく
// ※ index.html に書いてあるURLと、同じものにしておくこと
const CDN_FILES = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&family=Outfit:wght@600;800;900&display=swap'
];

// (1) インストール時: ファイルを保存する。1つ失敗しても全体が止まらないように、1つずつ保存する
self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(LOCAL_FILES.map((url) => cache.add(url).catch(() => { /* 無いファイルがあっても続行 */ })));
        await Promise.all(CDN_FILES.map(async (url) => {
            try {
                // 他のサイトのファイルは no-cors で取る（中身は見えないが、保存して再利用はできる）
                const res = await fetch(new Request(url, { mode: 'no-cors' }));
                await cache.put(url, res);
            } catch (e) { /* 取得できなくても続行 */ }
        }));
        await self.skipWaiting(); // 待たずにすぐ新しいバージョンに切り替える
    })());
});

// (2) 有効になったとき: 古いバージョンの保存を削除する
self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
        await self.clients.claim();
    })());
});

// (3) ページがファイルを要求するたびに呼ばれる: どこから返すかを決める
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // 取得以外（送信など）は、何もしない

    const url = new URL(req.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    if (url.origin === self.location.origin) {
        // 自分のサイトのファイル: まずネットから最新を取る。つながらなければ、保存したものを返す
        // （ファイルを更新したとき、すぐ反映されるようにするため）
        event.respondWith(networkFirst(req));
    } else {
        // 外部サイト（CDN・フォントなど）のファイル: 保存したものがあればすぐ返し、裏で最新に更新する
        event.respondWith(staleWhileRevalidate(req));
    }
});

// 保存してよいレスポンスか（成功したもの、または中身の見えない他サイトの応答）
function isCacheable(res) {
    return res && (res.ok || res.type === 'opaque');
}

async function networkFirst(req) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const res = await fetch(req);
        if (isCacheable(res)) cache.put(req, res.clone());
        return res;
    } catch (e) {
        // ネットにつながらない → 保存したものを返す
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        // ページ自体(index.html)を開こうとしているなら、保存した index.html を返す
        if (req.mode === 'navigate') {
            const page = (await cache.match('./index.html')) || (await cache.match('./'));
            if (page) return page;
        }
        return Response.error();
    }
}

async function staleWhileRevalidate(req) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const network = fetch(req)
        .then((res) => {
            if (isCacheable(res)) cache.put(req, res.clone());
            return res;
        })
        .catch(() => null);
    // 保存したものがあればそれをすぐ返す。なければネットの結果を待つ
    return cached || (await network) || Response.error();
}
