'use strict'

import EventEmitter3 from 'eventemitter3'
import MessageHooks, { MessageHook } from '@lucets/message-hooks'

export interface DefaultMessage {
  [key: string]: any
}

export interface DefaultState {
  [key: string]: any
}

export interface DefaultContext<TMessage, TState> {
  app: Application<TMessage, TState>,
  url: URL,
  state: TState,
  socket?: WebSocket,
  send?: (message: TMessage) => Promise<void>,
  close?: (code?: number, reason?: string) => Promise<void>
}

export default class Application<
  TMessage extends DefaultMessage = DefaultMessage,
  TState extends DefaultState = DefaultState
> extends EventEmitter3 {
  private context?: DefaultContext<TMessage, TState>
  private readonly messageHooks: MessageHooks<TMessage, DefaultContext<TMessage, TState>> = new MessageHooks()

  public useMessage (...hooks: MessageHook<TMessage, DefaultContext<TMessage, TState>>[]): this {
    if (!hooks.length) {
      throw new TypeError('useMessage() expects at least one hook')
    }

    for (const hook of hooks) {
      this.messageHooks.add(hook)
    }

    return this
  }

  public async connect (url: string, protocols?: string | string[]): Promise<DefaultContext<TMessage, TState>> {
    if (this.context) {
      throw new Error('Context already created')
    }

    return new Promise<DefaultContext<TMessage, TState>>((resolve, reject) => {
      const removeListeners = () => {
        socket.removeEventListener('open', onResolve)
        socket.removeEventListener('error', onReject)
        socket.removeEventListener('close', onReject)
      }

      const onResolve = () => {
        removeListeners()
        const ctx =  this.context = this.createContext(socket, url)
        resolve(ctx)
        this.handleOpen()
        this.emit('open', ctx)
      }

      const onReject = (ev?: ErrorEvent) => {
        removeListeners()
        reject(ev?.error ?? new Error('Socket closed'))
      }

      const socket = new WebSocket(url, protocols)
      socket.addEventListener('open', onResolve)
      socket.addEventListener('error', onReject)
      socket.addEventListener('close', onReject)
    })
  }

  private createContext (socket: WebSocket, url: string): DefaultContext<TMessage, TState> {
    return {
      app: this,
      url: new URL(url),
      socket,
      state: <any>{},
      send: async message => {
        if (socket.readyState !== WebSocket.OPEN) {
          throw new Error('Socket not open')
        }

        socket.send(JSON.stringify(message))
      },
      close: async (code, reason) => {
        if (socket.readyState !== WebSocket.OPEN) {
          throw new Error('Socket not open')
        }

        socket.close(code, reason)
      }
    }
  }

  private handleOpen (): void {
    const { socket } = this.context

    const removeListeners = () => {
      socket.removeEventListener('error', onError)
      socket.removeEventListener('message', onMessage)
      socket.removeEventListener('close', onClose)
    }

    const onError = (ev: ErrorEvent) => {
      this.emit('error', ev.error)
    }

    const onClose = (ev: CloseEvent) => {
      removeListeners()

      delete this.context.socket
      delete this.context.send
      delete this.context.close
      delete this.context

      this.emit('close', ev.code, ev.reason)
    }

    const onMessage = async (ev: MessageEvent<string>) => {
      let message: TMessage

      try {
        message = JSON.parse(ev.data)
      } catch (e) {
        // Unable to parse message
        return socket.close(4400, 'Bad Request')
      }

      try {
        await this.messageHooks.run(message, this.context)
      } catch (e) {
        // Error in message hooks
        socket.close(e.code ?? 4500, e.message ?? 'Internal Client Error')
      }
    }

    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('close', onClose)
  }
}
