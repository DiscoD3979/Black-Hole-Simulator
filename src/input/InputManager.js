const KEY_CODES = {
  KeyW: 'forward',
  KeyA: 'left',
  KeyS: 'back',
  KeyD: 'right',
  KeyQ: 'down',
  KeyE: 'up',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
  KeyR: 'reset',
  ArrowUp: 'forward',
  ArrowDown: 'back',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

export class InputManager {
  constructor() {
    this._canvas = null
    this._listenersAttached = false

    this._keys = Object.create(null)
    for (const name of ['forward', 'left', 'back', 'right', 'down', 'up', 'boost', 'reset']) {
      this._keys[name] = false
    }

    this._mouseDX = 0
    this._mouseDY = 0
    this._wheelDelta = 0
    this._pointerLocked = false

    this._handlers = {
      keydown: (e) => this._onKeyDown(e),
      keyup: (e) => this._onKeyUp(e),
      mousemove: (e) => this._onMouseMove(e),
      wheel: (e) => this._onWheel(e),
      click: () => this._onClick(),
      pointerlockchange: () => this._onPointerLockChange(),
    }
  }

  attach(canvas) {
    if (this._listenersAttached) return
    if (!canvas) throw new Error('InputManager.attach: canvas is required')

    this._canvas = canvas
    window.addEventListener('keydown', this._handlers.keydown, { passive: false })
    window.addEventListener('keyup', this._handlers.keyup, { passive: false })
    canvas.addEventListener('mousemove', this._handlers.mousemove, { passive: true })
    canvas.addEventListener('wheel', this._handlers.wheel, { passive: false })
    canvas.addEventListener('click', this._handlers.click)
    document.addEventListener('pointerlockchange', this._handlers.pointerlockchange)
    this._listenersAttached = true
  }

  detach() {
    if (!this._listenersAttached) return
    const canvas = this._canvas
    window.removeEventListener('keydown', this._handlers.keydown)
    window.removeEventListener('keyup', this._handlers.keyup)
    if (canvas) {
      canvas.removeEventListener('mousemove', this._handlers.mousemove)
      canvas.removeEventListener('wheel', this._handlers.wheel)
      canvas.removeEventListener('click', this._handlers.click)
    }
    document.removeEventListener('pointerlockchange', this._handlers.pointerlockchange)
    this._listenersAttached = false
    this._canvas = null
  }

  isKeyDown(name) {
    return this._keys[name] === true
  }

  getMouseDelta() {
    const dx = this._mouseDX
    const dy = this._mouseDY
    this._mouseDX = 0
    this._mouseDY = 0
    return { dx, dy }
  }

  consumeWheelDelta() {
    const d = this._wheelDelta
    this._wheelDelta = 0
    return d
  }

  isPointerLocked() {
    return this._pointerLocked
  }

  requestPointerLock() {
    if (!this._canvas) return
    if (document.pointerLockElement === this._canvas) return
    const req = this._canvas.requestPointerLock
    if (typeof req === 'function') {
      try {
        req.call(this._canvas)
      } catch (_) {}
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      try { document.exitPointerLock() } catch (_) {}
    }
  }

  _onKeyDown(e) {
    const name = KEY_CODES[e.code]
    if (!name) return
    this._keys[name] = true
    if (e.code === 'KeyR' || e.code === 'KeyW' || e.code === 'KeyA' ||
        e.code === 'KeyS' || e.code === 'KeyD' || e.code === 'KeyQ' || e.code === 'KeyE') {
      e.preventDefault()
    }
  }

  _onKeyUp(e) {
    const name = KEY_CODES[e.code]
    if (!name) return
    this._keys[name] = false
  }

  _onMouseMove(e) {
    if (!this._pointerLocked) return
    this._mouseDX += e.movementX || 0
    this._mouseDY += e.movementY || 0
  }

  _onWheel(e) {
    e.preventDefault()
    let dy = e.deltaY
    if (e.deltaMode === 1) dy *= 16
    else if (e.deltaMode === 2) dy *= window.innerHeight
    this._wheelDelta += dy
  }

  _onClick() {
    if (this._pointerLocked) return
    this.requestPointerLock()
  }

  _onPointerLockChange() {
    this._pointerLocked = document.pointerLockElement === this._canvas
  }
}

export function createInputManager() {
  return new InputManager()
}
