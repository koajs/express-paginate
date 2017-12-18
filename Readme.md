# ctx-paginate

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![MIT License][license-image]][license-url]
[![Slack][slack-image]][slack-url]

> Koa pagination middleware and view helpers.

## Install

```sh
npm install -s koa-ctx-paginate
```

## Usage

> Import every method:

```js
import * as paginate from 'koa-ctx-paginate';
```

> Import selective methods:

```js
import { middleware } from 'koa-ctx-paginate';
```

## API

### paginate.middleware(limit, maxLimit)

This middleware validates and supplies default values to `ctx.paginate.skip` (an alias of `ctx.paginate.offset`, which can be used to skip or offset a number of records for pagination, e.g. with Mongoose you would do `Model.find().skip(ctx.paginate.skip)`), `ctx.query.limit`, `ctx.query.page`, `ctx.state.paginate`, `ctx.state.hasPreviousPages`, and `ctx.state.hasNextPages`.

#### Arguments

-   `limit` a Number to limit results returned per page (defaults to `10`)
-   `maxLimit` a Number to restrict the number of results returned to per page (defaults to `50`) – through this, users will not be able to override this limit (e.g. they can't pass `?limit=10000` and crash your server)

### paginate.href(ctx)

When you use the `paginate` middleware, it injects a view helper function called `paginate.href` as `ctx.state.paginate`, which you can use in your views for paginated hyperlinks (e.g. as the `href` in `<a>Prev</a>` or `<a>Next</a>`).

By default, the view helper `paginate.href` is already executed with the inherited `ctx` variable, therefore it becomes a function capable of returning a String when executed.

When executed with `ctx`, it will return a function with two optional arguments, `prev` (Boolean) and `params` (String).

The argument `prev` is a Boolean and is completely optional (defaults to `false`).

The argument `params` is an Object and is completely optional.

Pass `true` as the value for `prev` when you want to create a `<button>` or `<a>` that points to the previous page (e.g. it would generate a URL such as the one in the `href` attribute of `<a href="/users?page=1&limit=10">Prev</a>` if `ctx.query.page` is `2`).

Pass an object for the value of `params` when you want to override querystring parameters – such as for filtering and sorting (e.g. it would generate a URL such as the one in the `href` attribute of `<a href="/users?page=1&limit=10&sort=name">Sort By Name</a>` if `params` is equal to `{ sort: 'name' }`.

Note that if you pass only one argument with a type of Object, then it will generate a `href` with the current page and use the first argument as the value for `params`.  This is useful if you only want to do something like change the filter or sort querystring param, but not increase or decrease the page number.

[See the example below for an example of how implementation looks](#example).

#### Arguments

-   `ctx` (**required**) – the request object returned from Koa middleware invocation

#### Returned function arguments when invoked with `ctx`

-   `prev` (optional) – a Boolean to determine whether or not to increment the hyperlink returned by `1` (e.g. for "Next" page links)
-   `params` (optional) – an Object of querystring parameters that will override the current querystring in `ctx.query` (note that this will also override the `page` querystring value if `page` is present as a key in the `params` object) (e.g. if you want to make a link that allows the user to change the current querystring to sort by name, you would have `params` equal to `{ sort: 'name' }`)

### paginate.hasPreviousPages

When you use the `paginate` middleware, it injects a view helper Boolean called `hasPreviousPages` as `ctx.state.hasPreviousPages`, which you can use in your views for generating pagination `<a>`'s or `<button>`'s – this utilizes `ctx.query.page > 1` to determine the Boolean's resulting value (representing if the query has a previous page of results)

### paginate.hasNextPages(ctx)

When you use the `paginate` middleware, it injects a view helper function called `hasNextPages` as `ctx.state.hasPreviousPages`, which you can use in your views for generating pagination `<a>`'s or `<button>`'s – if the function is executed, it returns a Boolean value (representing if the query has another page of results)

By default, the view helper `paginate.hasNextPages` is already executed with the inherited `ctx` variable, therefore it becomes a function capable of returning a Boolean when executed.

When executed with `ctx`, it will return a function that accepts two required arguments called `pageCount` and `resultsCount`.

#### Arguments

-   `ctx` (**required**) – the request object returned from Koa middleware invocation

#### Returned function arguments when invoked with `ctx`

-   `pageCount` (**required**) – a Number representing the total number of pages for the given query executed on the page

### paginate.getArrayPages(ctx)

Get all the page urls with limit.
![petronas contest 2015-10-29 12-35-52](https://cloud.githubusercontent.com/assets/3213579/10810997/a5b0b190-7e39-11e5-9cca-fb00a2142640.png)

#### Arguments

-   `ctx` (**required**) – the request object returned from Koa middleware invocation

#### Returned function arguments when invoked with `ctx`

-   `limit` (**optional**) – Default: 3, a Number representing the total number of pages for the given query executed on the page.
-   `pageCount` (**required**) – a Number representing the total number of pages for the given query executed on the page.
-   `currentPage` (**required**) – a Number representing the current page.

## Example

```js
// # app.js

import koa from 'koa';
import Router from 'koa-router';
import * as paginate from 'koa-ctx-paginate';

// e.g. `Users` is a database model created with Mongoose
import { Users } from '../models';

const app = koa();
const router = new Router();

// keep this before all routes that will use pagination
app.use(paginate.middleware(10, 50));

// let's get paginated list of users
router.get('/users', async function (ctx, next) {

  try {

    const [ results, itemCount ] = await Promise.all([
      Users.find({}).limit(ctx.query.limit).skip(ctx.paginate.skip).lean().exec(),
      Users.count({})
    ]);

    const pageCount = Math.ceil(itemCount / ctx.query.limit);

    if (ctx.is('json')) {
      // inspired by Stripe's API response for list objects
      ctx.body = {
        object: 'list',
        has_more: paginate.hasNextPages(ctx)(pageCount),
        data: results
      };
    } else {
      ctx.render('users', {
        users: results,
        pageCount,
        itemCount,
        pages: paginate.getArrayPages(ctx)(3, pageCount, ctx.query.page)
      });
    }

  } catch (err) {
    ctx.throw(err);
  }

});

app.use(router.routes());

app.listen(3000);
```

```pug
//- users.pug

h1 Users

//- this will simply generate a link to sort by name
//- note how we only have to pass the querystring param
//- that we want to modify here, not the entire querystring
a(href=paginate.href({ sort: 'name' })) Sort by name

//- this assumes you have `?age=1` or `?age=-1` in the querystring
//- so this will basically negate the value and give you
//- the opposite sorting order (desc with -1 or asc with 1)
a(href=paginate.href({ sort: req.query.age === '1' ? -1 : 1 })) Sort by age

ul
  each user in users
    li= user.email

include _paginate
```

> Bootstrap 4.x (used by [Lad][]):

```pug
//- _paginate.pug

//- Lad
//- <https://lad.js.org>
//-
//- This examples makes use of Bootstrap 4.x pagination classes and is from Lad
//-
if pageCount && pageCount > 0
  nav(aria-label="Page navigation").d-flex.justify-content-center
    ul.pagination
      if paginate.hasPreviousPages
        li.page-item
          a.page-link(href=paginate.href(true), aria-label=t('Previous'))
            span(aria-hidden="true")
              i.fa.fa-angle-double-left
            span.sr-only= t('Previous')
      else
        li.page-item.disabled
          span.page-link(aria-label=t('Previous'))
            span(aria-hidden="true")
              i.fa.fa-angle-double-left
            span.sr-only= t('Previous')
      if pages
        each page in pages
          if page.number === 1 && pageCount === 1
            li.page-item.disabled
              span.page-link= page.number
          else
            if page.number === ctx.query.page
              li.page-item.active
                a.page-link(href=page.url)= page.number
            else
              li.page-item
                a.page-link(href=page.url)= page.number
      if paginate.hasNextPages(pageCount)
        li.page-item
          a.page-link(href=paginate.href({ page: ctx.query.page + 1 }), aria-label=t('Next'))
            span(aria-hidden="true")
              i.fa.fa-angle-double-right
            span.sr-only= t('Next')
      else
        li.page-item.disabled
          span.page-link(aria-label=t('Next'))
            span(aria-hidden="true")
              i.fa.fa-angle-double-right
            span.sr-only= t('Next')
```

> Bootstrap 3.x:

```pug
//- _paginate.pug

//- This examples makes use of Bootstrap 3.x pagination classes

if paginate.hasPreviousPages || paginate.hasNextPages(pageCount)
  .navigation.well-sm#pagination
    ul.pager
      if paginate.hasPreviousPages
        li.previous
          a(href=paginate.href(true)).prev
            i.fa.fa-arrow-circle-left
            |  Previous
      if pages
        each page in pages
          a.btn.btn-default(href=page.url)= page.number
      if paginate.hasNextPages(pageCount)
        li.next
          a(href=paginate.href()).next
            | Next&nbsp;
            i.fa.fa-arrow-circle-right
```

## License

[MIT][license-url]

[npm-image]: https://img.shields.io/npm/v/koa-ctx-paginate.svg?style=flat

[npm-url]: https://npmjs.org/package/koa-ctx-paginate

[downloads-image]: http://img.shields.io/npm/dm/koa-ctx-paginate.svg?style=flat

[downloads-url]: https://npmjs.org/package/koa-ctx-paginate

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat

[license-url]: LICENSE

[slack-url]: http://slack.crocodilejs.com/

[slack-image]: http://slack.crocodilejs.com/badge.svg

[lad]: https://lad.js.org
