# The committed streaker
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

### Developping

```sh
npm run dev
```

### Running

```sh
npm start
```

### Testing
While I've begun to add some unit tests, I'm still working out
the best ways to code an express app for testability.

### Docker
You can also run the docker version:

```sh
docker run --rm -it -p 80:3030 -e "GITHUB_CLIENT_ID=YOURHEXCODE" -e "GITHUB_CLIENT_SECRET=YOURHEXCODE" -e "GITHUB_STREAKER_ROOT=http://yourdomain.example.com" millette/committed-streaker:0.1.5
```

## Running for real

### Run it directly
```sh
mkdir for-real
cd for-real
mkdir db # create database directory
npm init -y # create empty package.json
npm install committed-streaker # install it
node_modules/.bin/committed-streaker # run it
```

### Build it with Docker and run it
Put the following in a file called ```Dockerfile```:

```
FROM iron/node

WORKDIR /app
ADD . /app

EXPOSE 3030
ENTRYPOINT ["node", "node_modules/.bin/committed-streaker"]
```

Then run the following, replacing USERNAME/REPOSITORYNAME:TAG with
actual values (for example, a simple "mytest" would work):

```sh
mkdir for-real
cd for-real
mkdir db # create database directory
npm init -y # create empty package.json
npm install committed-streaker # install it
docker build -t USERNAME/REPOSITORYNAME:TAG .
docker run -d -it -p 3030:3030 -e "GITHUB_CLIENT_ID=YOURHEXCODE" -e "GITHUB_CLIENT_SECRET=YOURHEXCODE" -e "GITHUB_STREAKER_ROOT=http://yourdomain.example.com" mytest # run it
```
