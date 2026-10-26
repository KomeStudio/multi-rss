import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
})

/* ---------- Tiện ích ---------- */

const arr = v => (v == null ? [] : Array.isArray(v) ? v : [v])

// Lấy chuỗi từ node (có thể là string hoặc object có '#text')
const text = v => {
  if (v == null) return ''
  if (Array.isArray(v)) return text(v[0])
  if (typeof v === 'object') return text(v['#text'])
  return String(v).trim()
}

const stripTags = s => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const escXml = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const cdata = s => `<![CDATA[${String(s ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`

const toDate = s => {
  const d = new Date(s)
  return isNaN(d) ? new Date(0) : d
}

/* ---------- Đọc feed (RSS 2.0 + Atom) ---------- */

function parseFeed(xml) {
  const doc = parser.parse(xml)

  if (doc.rss) {
    const ch = doc.rss.channel || {}
    const items = arr(ch.item).map(i => {
      const content = text(i['content:encoded']) || text(i.description)
      return {
        title: text(i.title),
        link: text(i.link),
        id: text(i.guid) || text(i.link),
        isoDate: toDate(text(i.pubDate) || text(i['dc:date'])).toISOString(),
        content,
        creator: text(i['dc:creator']) || text(i.author),
      }
    })
    return { title: text(ch.title), link: text(ch.link), items }
  }

  if (doc.feed) {
    const f = doc.feed
    const pickLink = links => {
      const list = arr(links)
      const alt = list.find(l => !l['@_rel'] || l['@_rel'] === 'alternate') || list[0]
      return alt ? alt['@_href'] || text(alt) : ''
    }
    const items = arr(f.entry).map(e => ({
      title: text(e.title),
      link: pickLink(e.link),
      id: text(e.id) || pickLink(e.link),
      isoDate: toDate(text(e.published) || text(e.updated)).toISOString(),
      content: text(e.content) || text(e.summary),
      creator: text(e.author?.name),
    }))
    return { title: text(f.title), link: pickLink(f.link), items }
  }

  throw new Error('Không nhận diện được định dạng feed')
}

async function fetchAndHydrate(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'KomeRSS/1.0' } })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const feed = parseFeed(await resp.text())
  return feed.items.map(item => ({
    ...item,
    source_title: feed.title,
    source_link: feed.link || url,
  }))
}

/* ---------- Tạo RSS / Atom / HTML ---------- */

function buildRss(items, env) {
  const body = items
    .map(
      i => `    <item>
      <title>${escXml(i.title)}</title>
      <link>${escXml(i.link)}</link>
      <guid isPermaLink="false">${escXml(i.id)}</guid>
      <pubDate>${new Date(i.isoDate).toUTCString()}</pubDate>
      ${i.creator ? `<dc:creator>${escXml(i.creator)}</dc:creator>` : ''}
      <description>${escXml(stripTags(i.content).slice(0, 300))}</description>
      <content:encoded>${cdata(i.content)}</content:encoded>
    </item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(env.TITLE)}</title>
    <link>${escXml(env.CUSTOM_URL)}</link>
    <description>${escXml(env.DESCRIPTION)}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escXml(env.SITE_URL)}/rss" rel="self" type="application/rss+xml"/>
${body}
  </channel>
</rss>`
}

function buildAtom(items, env) {
  const body = items
    .map(
      i => `  <entry>
    <title>${escXml(i.title)}</title>
    <id>${escXml(i.id)}</id>
    <link href="${escXml(i.link)}"/>
    <updated>${i.isoDate}</updated>
    ${i.creator ? `<author><name>${escXml(i.creator)}</name></author>` : ''}
    <summary>${escXml(stripTags(i.content).slice(0, 300))}</summary>
    <content type="html">${escXml(i.content)}</content>
  </entry>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escXml(env.TITLE)}</title>
  <subtitle>${escXml(env.DESCRIPTION)}</subtitle>
  <id>${escXml(env.CUSTOM_URL)}</id>
  <link href="${escXml(env.CUSTOM_URL)}"/>
  <link href="${escXml(env.SITE_URL)}/atom" rel="self"/>
  <updated>${new Date().toISOString()}</updated>
${body}
</feed>`
}

function buildHtml(items, sources, env) {
  const fmt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC' })
  const cards = items
    .map(i => {
      const desc = stripTags(i.content).slice(0, 250)
      return `<article>
  <h2><a href="${escXml(i.link)}">${escXml(i.title)}</a></h2>
  <small>${escXml(i.source_title)} · ${fmt.format(new Date(i.isoDate))}</small>
  <p>${escXml(desc)}${desc ? ' [...]' : ''}</p>
</article>`
    })
    .join('\n')

  const src = sources.map(s => `<a href="${escXml(s.link)}">${escXml(s.name)}</a>`).join(' · ')

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escXml(env.TITLE)}</title>
<meta name="description" content="${escXml(env.DESCRIPTION)}">
<link rel="alternate" type="application/rss+xml" href="/rss">
<style>
:root{color-scheme:light dark}
body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:1rem}
article{padding:1rem 0;border-bottom:1px solid #8884}
h2{margin:0 0 .25rem;font-size:1.15rem}
small{opacity:.7}
footer{margin-top:2rem;opacity:.8}
</style>
</head>
<body>
<h1>${escXml(env.TITLE)}</h1>
<p>${escXml(env.DESCRIPTION)}</p>
${cards}
<footer>Nguồn: ${src}</footer>
</body>
</html>`
}

/* ---------- Cron: gom feed và lưu vào KV ---------- */

async function refresh(env) {
  const urls = env.FEEDS.split(',').map(s => s.trim()).filter(Boolean)
  const results = await Promise.allSettled(urls.map(fetchAndHydrate))

  const content = []
  const sources = []

  results.forEach((r, idx) => {
    if (r.status === 'fulfilled' && r.value.length) {
      const first = r.value[0]
      let name = first.source_title
      if (!name) {
        try { name = new URL(first.source_link).host } catch { name = urls[idx] }
      }
      sources.push({ name, link: first.source_link })
      content.push(...r.value)
    } else {
      console.log(`Lỗi tải ${urls[idx]}:`, r.status === 'rejected' ? r.reason : 'feed rỗng')
    }
  })

  content.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate))
  const items = content.slice(0, Number(env.MAX_SIZE) || 50)

  // Không ghi đè dữ liệu cũ nếu lần này tải hỏng toàn bộ
  if (!items.length) return

  await Promise.all([
    env.RSS_KV.put('rss', buildRss(items, env)),
    env.RSS_KV.put('atom', buildAtom(items, env)),
    env.RSS_KV.put('html', buildHtml(items, sources, env)),
  ])
}

/* ---------- Phục vụ request ---------- */

const ROUTES = {
  '/': ['html', 'text/html;charset=UTF-8'],
  '/rss': ['rss', 'application/rss+xml;charset=UTF-8'],
  '/atom': ['atom', 'application/atom+xml;charset=UTF-8'],
}

async function handleRequest(request, env, ctx) {
  const route = ROUTES[new URL(request.url).pathname]
  if (!route) return new Response('Not found', { status: 404 })

  const cache = caches.default
  const cacheKey = new Request(new URL(request.url).toString())
  const hit = await cache.match(cacheKey)
  if (hit) return hit

  const [key, type] = route
  let content = await env.RSS_KV.get(key)

  // Lần đầu chưa có dữ liệu: chạy gom feed ngay
  if (!content) {
    await refresh(env)
    content = await env.RSS_KV.get(key)
  }
  if (!content) return new Response('Chưa có dữ liệu, thử lại sau.', { status: 503 })

  const response = new Response(content, {
    headers: {
      'content-type': type,
      'Cache-Control': `public, max-age=${env.CACHE_MAX_AGE || 3600}`,
    },
  })
  ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

export default {
  fetch: (request, env, ctx) => handleRequest(request, env, ctx),
  scheduled: (event, env, ctx) => ctx.waitUntil(refresh(env)),
}