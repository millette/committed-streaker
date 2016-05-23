/*eslint arrow-parens: [2, "as-needed"]*/
'use strict'
import test from 'ava'
import fn from '../../routes/logout'

test('logout route', t => {
  t.plan(3)

  const router = {
    get: (path, cb) => {
      const req = {
        logout: () => {
          t.truthy('logout called')
        }
      }

      const res = {
        redirect: path => {
          t.truthy('redirect called')
          t.is(path, '/')
        }
      }
      cb(req, res)
    }
  }
  fn({ router: router })
})
