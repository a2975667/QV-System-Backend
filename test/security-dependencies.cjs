const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const root = path.resolve(__dirname, '..');
const lock = require('../package-lock.json');

// Exercise every locked copy, including nested build-tool dependencies.
for (const entry of Object.keys(lock.packages)) {
  if (entry.endsWith('/proxy-addr')) {
    const proxyaddr = require(path.join(root, entry));
    test(`${entry}: rejects spoofed forwarded IPs across address families`, () => {
      for (const subnet of ['::ffff:10.0.0.0/8', '::/1']) {
        const trust = proxyaddr.compile(subnet);
        for (const address of ['203.0.113.10', '::ffff:203.0.113.10']) {
          assert.equal(trust(address), false);
          assert.equal(proxyaddr({
            socket: { remoteAddress: address },
            headers: { 'x-forwarded-for': '192.0.2.50' },
          }, trust), address);
        }
      }
    });
    test(`${entry}: preserves valid IPv4, mapped IPv4 and IPv6 proxy trust`, () => {
      for (const subnet of ['10.0.0.0/8', '::ffff:10.0.0.0/104']) {
        const trust = proxyaddr.compile(subnet);
        assert.equal(trust('10.1.2.3'), true);
        assert.equal(trust('::ffff:10.1.2.3'), true);
        assert.equal(trust('203.0.113.10'), false);
        assert.equal(proxyaddr({
          socket: { remoteAddress: '10.1.2.3' },
          headers: { 'x-forwarded-for': '192.0.2.50' },
        }, trust), '192.0.2.50');
      }
      assert.equal(proxyaddr.compile('2001:db8::/32')('2001:db8::1'), true);
      assert.equal(proxyaddr.compile(['::/1', '2001:db8::/32'])('203.0.113.10'), false);
    });
  }
  if (entry.endsWith('/brace-expansion')) {
    test(`${entry}: preserves normal expansion and bounds hostile patterns`, () => {
      // A subprocess timeout and heap limit keep a dependency regression bounded.
      const result = spawnSync(process.execPath, ['--max-old-space-size=128', '-e', `
        const assert = require('node:assert/strict');
        const expand = require(process.argv[1]);
        assert.deepEqual(expand('file{a,b}{1..2}'), ['filea1', 'filea2', 'fileb1', 'fileb2']);
        assert.deepEqual(expand('literal\\\\{a,b\\\\}'), ['literal{a,b}']);
        assert.deepEqual(expand('{1..1000000000}', {max: 10}), ['1','2','3','4','5','6','7','8','9','10']);
        const output = expand('{a,b}'.repeat(100), {max: 100, maxLength: 1000});
        assert.ok(output.reduce((sum, value) => sum + value.length, 0) <= 1000);
        assert.doesNotThrow(() => expand('{'.repeat(12000) + 'a,b' + '}'.repeat(12000)));
        assert.doesNotThrow(() => expand('{' + '{a},'.repeat(12000) + 'z}', {max: 10}));
        const rewrite = '{a}' + '}'.repeat(2000) + ',z}';
        assert.equal(expand(rewrite, {maxRewrites: 4}).length, 1);
      `, path.join(root, entry)], { timeout: 10000, encoding: 'utf8' });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr || result.stdout);
    });
  }
}
