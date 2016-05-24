/*eslint arrow-parens: [2, "as-needed"]*/
'use strict'
import test from 'ava'
import fn from '../../routes/index'

test('index route, no user', t => {
  t.plan(9)

  const router = {
    get: (path, cb) => {
      let res
      switch (path) {
        case '/':
          res = {
            render: (tpl, vals) => {
              t.is(path, '/')
              t.is(tpl, 'home')
              t.falsy(vals && vals.user)
            }
          }
          break

        case '/a-propos':
          res = {
            render: (tpl, vals) => {
              t.is(path, '/a-propos')
              t.is(tpl, 'a-propos')
              t.falsy(vals && vals.user)
            }
          }
          break

        case '/about':
          res = {
            render: (tpl, vals) => {
              t.is(path, '/about')
              t.is(tpl, 'about')
              t.falsy(vals && vals.user)
            }
          }
          break

        default:
          t.falsy('should never reach here')
      }
      cb(false, res)
    }
  }
  fn({ router: router })
})

test('index route, no user', t => {
  t.plan(9)

  const router = {
    get: (path, cb) => {
      let res
      const req = { user: 'bob' }
      switch (path) {
        case '/':
          res = {
            render: (tpl, vals) => {
              t.is(path, '/', 'ONE')
              t.is(tpl, 'home')
              t.truthy(vals.user)
            }
          }
          break

        case '/a-propos':
          res = {
            render: (tpl, vals) => {
              t.is(path, '/a-propos', 'TWO')
              t.is(tpl, 'a-propos')
              t.truthy(vals.user)
            }
          }
          break

        case '/about':
          res = {
            render: (tpl, vals) => {
              t.is(path, '/about', 'THREE')
              t.is(tpl, 'about')
              t.truthy(vals.user)
            }
          }
          break

        default:
          t.falsy('should never reach here')
      }
      cb(req, res)
    }
  }
  fn({ router: router })
})
