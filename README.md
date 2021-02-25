# @lucets/client

Browser client for [@lucets/luce](http://github.com/lucets/luce), a
versatile WebSocket framework for node.js.

# Install

```
npm i @lucets/client
```

## Browserify

Use in combination with [Browserify](http://browserify.org/).

## Example

This example shows how to add message hooks and connect
to the server.

```ts
'use strict'

import Application from './index'

const app = new Application()

app.useMessage(async (message, ctx, next) => {
  console.log(`[message]: ${JSON.stringify(message)}`)
  return next()
})

app.connect('ws://localhost:3003').then(ctx => {
  console.log(`[open]: connected to ${ctx.url.toString()}`)

  let interval: any = setInterval(() => {
    ctx.send({ cmd: 'ping' })
  }, 2500)

  app.once('disconnect', () => clearInterval(interval))
}).catch((err: Error) => {
  console.error('error', err)
})
```

## License

Copyright 2021 [Michiel van der Velde](https://michielvdvelde.nl).

This software is licensed under [the MIT License](LICENSE).
