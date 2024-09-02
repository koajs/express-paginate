const test = require('ava');
const paginate = require('..');

test('exports functions', (t) => {
  t.true(typeof paginate === 'object');
  t.true(typeof paginate.href === 'function');
  t.true(typeof paginate.hasNextPages === 'function');
  t.true(typeof paginate.middleware === 'function');
});

test('href', (t) => {
  const ctx = {
    query: {
      foo: 'bar',
      baz: 'boop',
      limit: 1,
      page: 2
    },
    href: 'https://example.com/some/page?foo=bar&limit=1&page=2'
  };

  const prev = paginate.href(ctx)(true);
  t.is(prev, 'https://example.com/some/page?foo=bar&baz=boop&limit=1&page=1');

  const next = paginate.href(ctx)();
  t.is(next, 'https://example.com/some/page?foo=bar&baz=boop&limit=1&page=3');
});
