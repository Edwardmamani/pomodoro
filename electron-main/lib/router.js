class IpcRouter {
  constructor() {
    this.routes = []
  }

  handle(channel, handler) {
    this.routes.push({ type: 'handle', channel, handler })
    return this
  }

  on(channel, handler) {
    this.routes.push({ type: 'on', channel, handler })
    return this
  }

  use(router) {
    this.routes.push(...router.routes)
    return this
  }
}

function Router() {
  return new IpcRouter()
}

module.exports = { Router }
