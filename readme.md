# The committed streaker
> Bringing the streakers back since 2016
[![Build Status](https://travis-ci.org/millette/committed-streaker.svg?branch=master)](https://travis-ci.org/millette/committed-streaker)
[![Coverage Status](https://coveralls.io/repos/github/millette/committed-streaker/badge.svg?branch=master)](https://coveralls.io/github/millette/committed-streaker?branch=master)
[![Dependency Status](https://gemnasium.com/badges/github.com/millette/committed-streaker.svg)](https://gemnasium.com/github.com/millette/committed-streaker)

## Required environment variables
See <https://github.com/settings/developers>

### GITHUB_CLIENT_ID

### GITHUB_CLIENT_SECRET

### GITHUB_STREAKER_ROOT
The root URL of your application, for example:

* <https://an.example.com>
* <https://an.example.com/bob>
* <https://an.example.com/bob/>

The last two are equivalent, a slash is automatically suffixed.

The full callback URL ends with ```/login/github/callback```. In our examples:

* <https://an.example.com/login/github/callback>
* <https://an.example.com/bob/login/github/callback>

## Messing around

### Install
```sh
git clone ...
cd ...
npm install
bower install
```

### Running

```sh
npm start
```
