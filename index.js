const querystring = require('node:querystring');

// <https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore?tab=readme-ov-file#_isplainobject>
function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false;

  if (Object.prototype.toString.call(value) !== '[object Object]') return false;

  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;

  const Ctor =
    Object.prototype.hasOwnProperty.call(proto, 'constructor') &&
    proto.constructor;
  return (
    typeof Ctor === 'function' &&
    Ctor instanceof Ctor &&
    Function.prototype.call(Ctor) === Function.prototype.call(value)
  );
}

function href(ctx) {
  return function (prev, params) {
    const query = structuredClone(ctx.query);

    // allow overriding querystring params
    // (useful for sorting and filtering)
    if (isPlainObject(prev)) {
      params = prev;
      prev = false;
    } else {
      prev = typeof prev === 'boolean' ? prev : false;
      query.page = prev ? (query.page -= 1) : (query.page += 1);
      query.page = query.page < 1 ? 1 : query.page;
    }

    if (isPlainObject(params)) Object.assign(query, params);

    const url = new URL(ctx.href);
    // NOTE: we don't support existing `url.searchParams` right now
    url.search = `?${querystring.stringify(query)}`;
    return url.toString();
  };
}

function hasNextPages(ctx) {
  return function (pageCount) {
    if (typeof pageCount !== 'number' || pageCount < 0)
      throw new Error('koa-ctx-paginate: `pageCount` is not a number >= 0');
    return ctx.query.page < pageCount;
  };
}

function getArrayPages(ctx) {
  return function (limit, pageCount, currentPage) {
    // limit default is 3
    limit = limit || 3;

    if (typeof limit !== 'number' || limit < 0)
      throw new Error('koa-ctx-paginate: `limit` is not a number >= 0');

    if (typeof pageCount !== 'number' || pageCount < 0)
      throw new Error('koa-ctx-paginate: `pageCount` is not a number >= 0');

    if (typeof currentPage !== 'number' || currentPage < 0)
      throw new Error('koa-ctx-paginate: `currentPage` is not a number >= 0');

    if (limit > 0) {
      const end = Math.min(
        Math.max(currentPage + Math.floor(limit / 2), limit),
        pageCount
      );
      const start = Math.max(1, currentPage < limit - 1 ? 1 : end - limit + 1);
      const pages = [];
      for (let i = start; i <= end; i++) {
        pages.push({
          number: i,
          url: href(ctx)().replace(`page=${currentPage + 1}`, `page=${i}`)
        });
      }

      return pages;
    }
  };
}

function middleware(limit, maxLimit) {
  const _limit = typeof limit === 'number' ? Number.parseInt(limit, 10) : 10;

  const _maxLimit =
    typeof maxLimit === 'number' ? Number.parseInt(maxLimit, 10) : 50;

  return function (ctx, next) {
    ctx.query.page =
      typeof ctx.query.page === 'string'
        ? Number.parseInt(ctx.query.page, 10) || 1
        : typeof ctx.query.page === 'number' &&
            Number.isFinite(ctx.query.page) &&
            ctx.query.page >= 1
          ? ctx.query.page
          : 1;

    ctx.query.limit =
      typeof ctx.query.limit === 'string'
        ? Number.parseInt(ctx.query.limit, 10) ||
          (typeof ctx.query.limit === 'number' &&
            Number.isFinite(ctx.query.limit) &&
            ctx.query.limit >= 0)
          ? ctx.query.limit
          : 0
        : _limit;

    if (ctx.query.limit > _maxLimit) ctx.query.limit = _maxLimit;

    if (ctx.query.page < 1) ctx.query.page = 1;

    if (ctx.query.limit < 0) ctx.query.limit = 0;

    const skip = ctx.query.page * ctx.query.limit - ctx.query.limit;

    ctx.paginate = {
      skip,
      offset: skip
    };

    ctx.state.paginate = {};
    ctx.state.paginate.page = ctx.query.page;
    ctx.state.paginate.limit = ctx.query.limit;
    ctx.state.paginate.href = href(ctx);
    ctx.state.paginate.hasPreviousPages = ctx.query.page > 1;
    ctx.state.paginate.hasNextPages = hasNextPages(ctx);
    ctx.state.paginate.getArrayPages = getArrayPages(ctx);

    return next();
  };
}

module.exports = {
  href,
  hasNextPages,
  getArrayPages,
  middleware
};
