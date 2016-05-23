/*eslint arrow-parens: [2, "as-needed"]*/
'use strict'
import test from 'ava'
import fn from '../lib/utils'

test('utils sessionSecret', t => {
  t.plan(4)

  const a1 = fn.sessionSecret('a')
  const a2 = fn.sessionSecret('a')
  const b = fn.sessionSecret('b')

  t.is(a1, a2)
  t.not(a1, b)
  t.is(a1.length, 44)
  t.is(b.length, 44)
})
