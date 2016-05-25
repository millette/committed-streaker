/*eslint arrow-parens: [2, "as-needed"]*/
'use strict'
import test from 'ava'
import fn from '../../routes/login'

test('login route', t => {
  t.plan(9)

  const router = {
    get: (path, fn, cb) => {
      if (!cb && typeof fn === 'function') { cb = fn }
      const res = {
        render: (tpl, vals) => {
          t.is(path, '/')
          t.is(tpl, 'login')
          t.falsy(vals && vals.user)
        },
        redirect: path => {
          t.truthy('redirect called')
          t.is(path, '/profile/as-github')
        }
      }
      if (cb) { cb(null, res) }
    }
  }

  const passport = {
    authenticate: (a, b) => {
      t.is(a, 'github')
      t.truthy(!b || b.failureRedirect === '/')
    }
  }

  fn({ router: router, passport: passport })
})
