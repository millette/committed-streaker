/*eslint arrow-parens: [2, "as-needed"]*/
'use strict'
import test from 'ava'
import fn from '../../routes/index'

test('index route, no user', t => {
  t.plan(3)

  const router = {
    get: (path, cb) => {
      const res = {
        render: (tpl, vals) => {
          t.is(path, '/')
          t.is(tpl, 'home')
          t.falsy(vals && vals.user)
        }
      }
      cb(false, res)
    }
  }
  fn({ router: router })
})

test('index route, with user', t => {
  t.plan(3)

  const router = {
    get: (path, cb) => {
      const req = { user: 'bob' }
      const res = {
        render: (tpl, vals) => {
          t.is(path, '/')
          t.is(tpl, 'home')
          t.truthy(vals.user)
        }
      }
      cb(req, res)
    }
  }
  fn({ router: router })
})
