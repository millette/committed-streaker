/*eslint arrow-parens: [2, "as-needed"]*/
'use strict'
import test from 'ava'
import fn from '../lib/passport'

test('passport lib', t => {
  t.plan(11)

  const cb = (err, u) => {
    // console.log('CB:', err, u)
    if (u === 'bob') {
      t.falsy(err, 'ERR1') // FIXME (and lots more...)
    } else {
      t.truthy(err, 'ERR1a') // FIXME (and lots more...)
      t.is(u, 'bob666', 'CB1a')
    }
  }

  const passport = {
    serializeUser: fn => {
      // console.log('serializeUser')
      t.is(typeof fn, 'function', 'FN1')
      fn({ username: 'bob' }, cb)
    },
    deserializeUser: fn => {
      // console.log('DEserializeUser')
      t.is(typeof fn, 'function', 'FN2')
      fn({ fe: 'fi' }, cb)
    },
    use: (a, b, c, d) => {
      // console.log('USE')
      t.truthy(a instanceof Strategy, 'USE1')
      // console.log('PASSPORT-USE:', a, typeof a, b, typeof b, c, d)
    }
  }

  const Strategy = (a, b, c, d) => {
    // console.log('SSTT')
    t.is(typeof a, 'object', 'SSTT1')
    t.is(typeof b, 'function', 'SSTT2')
    b('accessToken', 'refreshToken', { gg: 'profile' }, (err, u) => {
      t.truthy('CALLED STRATEGY')
      t.falsy(err, 'STRATEGY-ERR')
      // console.log('ELCB:', err, u)
    })
  }

  const userDb = {
    put: (a, b, c, d) => {
      // console.log('USERDB-put:', a, b.toString().slice(0, 20), c, d)
      t.truthy('CALLED USER-PUH')
    },
    get: (a, b, c, d) => {
      // console.log('USERDB-get:', a, b.toString().slice(0, 20))
      // console.log('USERDB-get')
      // t.is(typeof a, 'object', 'GET1')
      t.is(typeof b, 'function', 'GET2')
      b(true, 'bob666')
      // b(null, { very: 'much' })
    }
  }

  const streak = bla => {
    // console.log('STREAK:', bla)
    t.truthy('STREAK CALLED', 'STREAKING')
    return Promise.resolve({ streaks: [] })
  }

  fn({ streak: streak, Strategy: Strategy, passport: passport }, userDb)
})
