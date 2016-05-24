'use strict'

// core
const path = require('path')

// npm
const sort = require('lodash.sortby')
const debug = require('debug')('app')

module.exports = (services, udb) => {
  const strategist = (accessToken, refreshToken, profile, cb) => {
    debug('strategist')
    udb.get(profile.username, (notFound, user) => {
      const updatedAt = !notFound && user && user.app && user.app.updated_at
      debug(`USER ${profile.username} IN DB? ${notFound ? 'NO' : 'YES'} (${updatedAt})`)
      if (updatedAt && ((Date.now() - Date.parse(updatedAt)) < 86400000)) { return cb(null, user) }
      services.streak(profile.username).then((response) => {
        const output = []
        if (response.streaks.length) {
          const latest = sort(response.streaks, 'begin').reverse()[0]
          output.push(`Longest streak in a year: ${response.streaks[0].commits.length} days (${response.streaks[0].commits.reduce((p, c) => p + c)} commits), started ${response.streaks[0].begin}.`)
          if (response.streaks[0].overlaps) {
            output.push('Note that the streak may be longer since it started at least 365 days ago.')
          }
          if (latest.begin !== response.streaks[0].begin) {
            output.push(`Latest streak: ${latest.commits.length} days (${latest.commits.reduce((p, c) => p + c)} commits), started ${latest.begin}.`)
          }
        } else {
          output.push('No commits in last 365 days.')
        }
        profile.app = { updated_at: new Date().toISOString(), response: response, output: output.map((o) => `<p>${o}</p>`).join('\n') }
        udb.put(profile.username, profile)
        cb(null, profile)
      })
    })
  }

  services.passport.use(new services.Strategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    // FIXME: should really use url.resolve
    // and suffix a / if missing
    callbackURL: path.join(process.env.GITHUB_STREAKER_ROOT, 'login/github/callback').replace(':/', '://')
  }, strategist))

  services.passport.serializeUser((user, cb) => cb(null, user.username))
  services.passport.deserializeUser((obj, cb) => udb.get(obj, (err, user) => cb(err, user)))

  debug('PASSPORT READY')
  return services.passport
}