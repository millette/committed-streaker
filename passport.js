'use strict'

// core
const path = require('path')

// npm
const passport = require('passport')
const Strategy = require('passport-github').Strategy
const sort = require('lodash.sortby')

// rollodeqc
const streak = require('rollodeqc-gh-user-streak')

// FIXME: should really use url.resolve
// and suffix a / if missing
const appRoot = path.join(process.env.GITHUB_STREAKER_ROOT, 'login/github/callback').replace(':/', '://')

module.exports = (udb) => {
  // const strategist = (req, accessToken, refreshToken, profile, cb) => {
  const strategist = (accessToken, refreshToken, profile, cb) => {
    // In this example, the user's Facebook profile is supplied as the user
    // record.  In a production-quality application, the Facebook profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.

    // User.findOrCreate({ githubId: profile.id }, function (err, user) {
      // return cb(err, user)
    // })

    udb.get(profile.username, (a, b, c) => {
      if (a) {
        // not found
        return streak(profile.username)
          .then((response) => {
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

            profile.app = { response: response, output: output.map((o) => `<p>${o}</p>`).join('\n') }
            udb.put(profile.username, profile)
            return cb(null, profile)
          })
      }
      return cb(null, b)
    })
  }

  passport.use(new Strategy({
    // passReqToCallback: true,
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: appRoot
  }, strategist))

  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  In a
  // production-quality application, this would typically be as simple as
  // supplying the user ID when serializing, and querying the user record by ID
  // from the database when deserializing.  However, due to the fact that this
  // example does not have a database, the complete Twitter profile is serialized
  // and deserialized.
  passport.serializeUser((user, cb) => cb(null, user.username))

  passport.deserializeUser((obj, cb) => {
    udb.get(obj, (a, b, c) => {
      if (a) { return cb(a) }
      cb(null, b)
    })
  })

  return passport
}
