{
  "server": {
    "app": {
      "siteTitle": "Committed Streaker"
    },
    "load": { "sampleInterval": 1000 }
  },
  "connections": [{ "port": 3060 }],
  "registrations": [
    { "plugin": "hapi-context-credentials" },
    { "plugin": "hapi-auth-cookie" },
    { "plugin": "bell" },
    { "plugin": "hapi-context-app" },
    { "plugin": "./plugins/login" },
    { "plugin": "inert" },
    { "plugin": "vision" },
    { "plugin": "lout" },
    {
      "plugin": {
        "register": "visionary",
        "options": {
          "engines": { "ejs": "ejs" },
          "path": "views",
          "isCached": false
        }
      }
    },
    {
      "plugin": {
        "register": "hapi-favicon",
        "options": {
          "path": "./favicon.ico"
        }
      }
    },
    {
      "plugin": {
        "register": "good",
        "options": {
          "reporters": {
            "console": [
              {
                "module": "good-squeeze",
                "name": "Squeeze",
                "args": [{
                  "response": "*",
                  "log": "*"
                }]
              },
              { "module": "good-console" },
              "stdout"
            ]
          }
        }
      }
    }
  ]
}
