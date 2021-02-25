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
