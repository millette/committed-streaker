# The committed streaker
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

## Install
```sh
git clone ...
cd ...
npm install
bower install
```

## Developping

```sh
npm run dev
```

## Running

```sh
npm start
```
