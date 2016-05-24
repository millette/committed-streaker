/*eslint arrow-parens: [2, "as-needed"]*/
'use strict'
import test from 'ava'
import fn from '../../routes/profile'

test('profile route', t => {
  t.plan(15)

  const router = {
    get: (path, fn, cb) => {
      let res
      let req

      switch (path) {
        case '/':
          res = {
            render: (tpl, vals) => {
              t.is(tpl, 'profile')
              t.truthy(vals && vals.output)
              t.truthy(vals && vals.data)
              t.truthy(vals && vals.user)
            }
          }

          req = {
            user: {
              app: {
                output: 'output',
                response: 'response'
              }
            }
          }
          break

        case '/as-github':
          res = {
            render: (tpl, vals) => {
              t.is(tpl, 'as-github')
              t.truthy(vals && vals.output)
              t.truthy(vals && vals.data)
              t.truthy(vals && vals.user)
            }
          }

          req = {
            user: {
              app: {
                output: 'output',
                response: 'response'
              }
            }
          }
          break

        case '/streaks':
          res = {
            render: (tpl, vals) => {
              t.is(tpl, 'streaks')
              t.truthy(vals && vals.data)
              t.truthy(vals && vals.user)
              t.truthy(vals && !vals.output)
            }
          }

          req = {
            user: {
              app: {
                output: 'output',
                response: 'response'
              }
            }
          }
          break

        default:
          t.falsy('should never reach here')
      }

      cb(req, res)
    }
  }

  const ensureLogin = {
    ensureLoggedIn: () => {
      t.truthy('ensureLoggedIn() called')
    }
  }

  fn({ router: router, ensureLogin: ensureLogin })
})
