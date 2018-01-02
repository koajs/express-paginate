
//     koa-ctx-paginate
//     Copyright (c) 2016- Nick Baugh <niftylettuce@gmail.com> (http://niftylettuce.com)
//     MIT Licensed

// Koa pagination middleware and view helpers.

// * Author: [@niftylettuce](https://twitter.com/#!/niftylettuce)
// * Source: <https://github.com/koajs/ctx-paginate>

import querystring from 'querystring';
import url from 'url';
import assign from 'lodash.assign';
import clone from 'lodash.clone';
import isObject from 'lodash.isobject';

export function href(ctx) {

  return function (prev, params) {

    let query = clone(ctx.query);

    if (typeof prev === 'object') {
      params = prev;
      prev = false;
    } else {
      prev = (typeof prev === 'boolean') ? prev : false;
      query.page = prev ? query.page -= 1 : query.page += 1;
      query.page = (query.page < 1) ? 1 : query.page;
    }

    // allow overriding querystring params
    // (useful for sorting and filtering)
    // another alias for `_.assign` is `_.extend`
    if (isObject(params))
      query = assign(query, params);

    return `${url.parse(ctx.originalUrl).pathname}?${querystring.stringify(query)}`;

  };

}

export function hasNextPages(ctx) {
  return function (pageCount) {
    if (typeof pageCount !== 'number' || pageCount < 0)
      throw new Error('koa-ctx-paginate: `pageCount` is not a number >= 0');
    return ctx.query.page < pageCount;
  };
}

export function getArrayPages(ctx) {
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
      const end = Math.min(Math.max(currentPage + Math.floor(limit / 2), limit), pageCount);
      const start = Math.max(1, (currentPage < (limit - 1)) ? 1 : (end - limit) + 1);
      const pages = [];
      for (let i = start; i <= end; i++) {
        pages.push({
          number: i,
          url: exports.href(ctx)().replace(`page=${(currentPage + 1)}`, `page=${i}`)
        });
      }
      return pages;
    }

  };

}

export function middleware(limit, maxLimit) {

  const _limit = (typeof limit === 'number') ? parseInt(limit, 10) : 10;

  const _maxLimit = (typeof maxLimit === 'number') ? parseInt(maxLimit, 10) : 50;

  return function _middleware(ctx, next) {

    ctx.query.page = (typeof ctx.query.page === 'string') ?
      parseInt(ctx.query.page, 10) || 1 : 1;

    ctx.query.limit = (typeof ctx.query.limit === 'string') ?
      parseInt(ctx.query.limit, 10) || 0 : _limit;

    if (ctx.query.limit > _maxLimit)
      ctx.query.limit = _maxLimit;

    if (ctx.query.page < 1)
      ctx.query.page = 1;

    if (ctx.query.limit < 0)
      ctx.query.limit = 0;

    const skip = (ctx.query.page * ctx.query.limit) - ctx.query.limit;

    ctx.paginate = {
      skip,
      offset: skip
    };

    ctx.state.paginate = {};
    ctx.state.paginate.page = ctx.query.page;
    ctx.state.paginate.limit = ctx.query.limit;
    ctx.state.paginate.href = exports.href(ctx);
    ctx.state.paginate.hasPreviousPages = ctx.query.page > 1;
    ctx.state.paginate.hasNextPages = exports.hasNextPages(ctx);
    ctx.state.paginate.getArrayPages = exports.getArrayPages(ctx);

    return next();

  };

}
