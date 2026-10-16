import assert from 'node:assert/strict';
import {isPublicIPv4, isPublicIPv6, isPublicIp, parseIPv6, checkJobUrl, resolvesToPublicAddresses} from '../lib/net-guard.ts';
import {createLimiter} from '../lib/rate-limit.ts';
import {readCappedBody, sameOrigin, clientIp} from '../lib/http.ts';

let checks = 0;
const ok = (v, m) => { checks++; assert.ok(v, m); };
const eq = (a, b, m) => { checks++; assert.deepEqual(a, b, m); };

// --- IPv4
for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '151.101.1.69', '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1', '198.17.0.1', '198.20.0.1', '11.0.0.1'])
  ok(isPublicIPv4(ip), 'public: ' + ip);
for (const ip of ['0.0.0.0', '0.255.255.255', '10.0.0.1', '10.255.255.255', '100.64.0.1', '100.127.255.255', '127.0.0.1', '127.255.255.254', '169.254.169.254', '172.16.0.1', '172.31.255.255',
  '192.0.0.1', '192.0.2.5', '192.88.99.1', '192.168.1.1', '198.18.0.1', '198.19.255.255', '198.51.100.7', '203.0.113.9', '224.0.0.1', '239.255.255.255', '240.0.0.1', '255.255.255.255',
  '256.1.1.1', '1.2.3', '1.2.3.4.5', 'a.b.c.d', '01.2.3.4x', '', '1.2.3.-4'])
  ok(!isPublicIPv4(ip), 'blocked: ' + ip);

// --- IPv6
for (const ip of ['2606:4700:4700::1111', '2001:4860:4860::8888', '2a00:1450:4009:81f::200e', '2607:f8b0:4004:c07::65'])
  ok(isPublicIPv6(ip), 'public: ' + ip);
for (const ip of ['::', '::1', 'fe80::1', 'fe80::1%eth0', 'fc00::1', 'fd12:3456:789a::1', 'fec0::1', 'ff02::1', '2001:db8::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', '2001:2::1', '2001:10::1', '2001:20::1',
  '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:7f00:1', '::ffff:a00:1', '::ffff:169.254.169.254', '::127.0.0.1', '2002:7f00:1::1', '2002:0a00:0001::', '64:ff9b::7f00:1', '100::1', '5f00::1',
  '1:2:3:4:5:6:7:8:9', ':::', '2606:4700::1::1', 'gggg::1', '12345::1', '[::1]'])
  ok(!isPublicIPv6(ip), 'blocked: ' + ip);
ok(isPublicIPv6('::ffff:8.8.8.8'), 'a mapped public address is public');
ok(isPublicIPv6('2002:0808:0808::1'), '6to4 of a public address is public');
eq(parseIPv6('::1'), [0, 0, 0, 0, 0, 0, 0, 1]);
eq(parseIPv6('2001:db8:0:0:0:0:0:1'), [0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]);
eq(parseIPv6('::ffff:1.2.3.4'), [0, 0, 0, 0, 0, 0xffff, 0x0102, 0x0304]);
ok(isPublicIp('8.8.8.8') && !isPublicIp('::1') && !isPublicIp('10.1.1.1'));

// --- URLs
for (const url of ['https://boards.greenhouse.io/acme/jobs/123', 'https://www.example-corp.com/careers/analyst?id=7', 'https://jobs.lever.co/acme/abc', 'https://xn--bcher-kva.example.org/jobs'])
  eq(checkJobUrl(url), null, 'allowed: ' + url);
for (const url of [
  'http://example.com/jobs', 'ftp://example.com/x', 'file:///etc/passwd', 'javascript:alert(1)', 'https://user:pw@example.com/', 'https://example.com:8443/', 'https://example.com:443/'.replace(':443', ':444'),
  'https://localhost/', 'https://printer.local/', 'https://db.internal/', 'https://metadata.google.internal/computeMetadata/v1/', 'https://thing.test/', 'https://a.invalid/', 'https://x.example/', 'https://nas.lan/', 'https://site.home/', 'https://x.corp/', 'https://abcdefg.onion/',
  'https://127.0.0.1/', 'https://2130706433/', 'https://0x7f000001/', 'https://0x7f.0.0.1/', 'https://017700000001/', 'https://127.1/', 'https://10.0.0.1/', 'https://169.254.169.254/latest/meta-data/', 'https://[::1]/', 'https://[::ffff:127.0.0.1]/', 'https://[2001:db8::1]/',
  'https://intranet/', 'https://example.com./', 'not a url', '', 'https://', 'https://-bad-.example.com/', 'https://exa mple.com/',
]) ok(checkJobUrl(url) !== null, 'blocked: ' + JSON.stringify(url));
ok(checkJobUrl('https://' + 'a'.repeat(64) + '.com/') !== null, 'a label over 63 characters is blocked');

// --- DNS answers, with an injected fetch
const dns = (answers) => async (url) => {
  const type = new URL(url).searchParams.get('type');
  const records = (answers[type] ?? []).map((data) => ({type: type === 'A' ? 1 : 28, data}));
  // CNAME records are present in real answers and must be ignored
  return new Response(JSON.stringify({Answer: [{type: 5, data: 'alias.example.net.'}, ...records]}), {status: 200});
};
ok(await resolvesToPublicAddresses('a.com', dns({A: ['93.184.216.34'], AAAA: ['2606:2800:220:1:248:1893:25c8:1946']})));
ok(await resolvesToPublicAddresses('a.com', dns({A: ['93.184.216.34'], AAAA: []})), 'IPv4 only is fine');
ok(await resolvesToPublicAddresses('a.com', dns({A: [], AAAA: ['2606:4700::1111']})), 'IPv6 only is fine');
ok(!(await resolvesToPublicAddresses('a.com', dns({A: [], AAAA: []}))), 'no answers is refused');
ok(!(await resolvesToPublicAddresses('a.com', dns({A: ['93.184.216.34', '10.0.0.5'], AAAA: []}))), 'one private answer among public ones is refused');
ok(!(await resolvesToPublicAddresses('a.com', dns({A: ['93.184.216.34'], AAAA: ['::1']}))), 'a private AAAA record is refused (the old check only asked for A)');
ok(!(await resolvesToPublicAddresses('a.com', dns({A: [], AAAA: ['::ffff:169.254.169.254']}))), 'a mapped metadata address is refused');
ok(!(await resolvesToPublicAddresses('a.com', dns({A: ['not-an-ip'], AAAA: []}))), 'garbage is refused');
let threw = false;
await resolvesToPublicAddresses('a.com', async () => new Response('', {status: 500})).catch(() => { threw = true; });
ok(threw, 'a failing resolver is an error, never a pass');

// --- limiter
{
  const l = createLimiter({windowMs: 1000, max: 3, maxKeys: 4});
  const t = 10_000;
  eq([1, 2, 3].map(() => l.hit('a', t).limited), [false, false, false]);
  const fourth = l.hit('a', t + 1);
  ok(fourth.limited && fourth.retryAfterSeconds >= 1, 'the fourth hit in a window is limited');
  ok(!l.hit('b', t + 2).limited, 'another key is unaffected');
  ok(!l.hit('a', t + 1500).limited, 'the window slides');
  for (let i = 0; i < 50; i++) l.hit('k' + i, t + 2000);
  ok(l.size() <= 4, 'the map is bounded: ' + l.size());
}

// --- body reading and origin
{
  const mk = (body, headers = {}) => new Request('https://app.example/api/x', {method: 'POST', body, headers, duplex: 'half'});
  eq(await readCappedBody(mk('hello'), 100), 'hello');
  eq(await readCappedBody(mk('x'.repeat(101)), 100), null, 'a body over the cap is refused');
  eq(await readCappedBody(mk('x'.repeat(100)), 100), 'x'.repeat(100), 'exactly the cap is allowed');
  eq(await readCappedBody(mk('café ✓'), 100), 'café ✓', 'UTF-8 round-trips');
  const lying = mk('x'.repeat(500), {'content-length': '5'});
  eq(await readCappedBody(lying, 100), null, 'a lying content-length does not bypass the cap');
  eq(await readCappedBody(new Request('https://app.example/', {method: 'POST'}), 10), '', 'no body is an empty string');
  ok(sameOrigin(new Request('https://app.example/api/x')), 'no Origin header is allowed');
  ok(sameOrigin(new Request('https://app.example/api/x', {headers: {origin: 'https://app.example'}})));
  ok(!sameOrigin(new Request('https://app.example/api/x', {headers: {origin: 'https://evil.example'}})));
  ok(!sameOrigin(new Request('https://app.example/api/x', {headers: {origin: 'null'}})), 'the null origin is refused');
  ok(!sameOrigin(new Request('https://app.example/api/x', {headers: {origin: 'https://app.example.evil.com'}})));
  eq(clientIp(new Request('https://a/', {headers: {'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9'}})), '1.2.3.4');
  eq(clientIp(new Request('https://a/', {headers: {'x-forwarded-for': '9.9.9.9, 8.8.8.8'}})), '9.9.9.9');
  eq(clientIp(new Request('https://a/')), 'unknown');
}

console.log(`PASS: ${checks} network guard checks (IPv4, IPv6, URLs, DNS answers, limiter, body cap, origin)`);
