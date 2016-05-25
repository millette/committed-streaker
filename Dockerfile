FROM iron/node

WORKDIR /app
ADD . /app

EXPOSE 3030
ENTRYPOINT ["node", "node_modules/.bin/committed-streaker"]
