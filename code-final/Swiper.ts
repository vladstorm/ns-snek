import * as ecs from '@8thwall/ecs'

let startTouch = null

const addEventListeners = (world, component) => {
  const onTouchStart = (e) => {
    startTouch = e.data.position
  }

  const onTouchMove = (e) => {
    if (!startTouch) return

    // get touch move direction
    const {x, y} = e.data.position
    const dx = x - startTouch.x
    const dy = y - startTouch.y
    if (Math.abs(dx) > Math.abs(dy)) {
      component.schema.touchDirection = dx > 0 ? 'right' : 'left'
    } else {
      component.schema.touchDirection = dy > 0 ? 'down' : 'up'
    }

    const schema = component.schemaAttribute.cursor(component.eid)
    schema.touchDirection = component.schema.touchDirection
  }

  const onTouchEnd = (e) => {
    startTouch = null
  }

  world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouchStart)
  world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, onTouchMove)
  world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouchEnd)
}

const removeEventListeners = (world, component) => {
  world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, component.touchStartListener)
  world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, component.touchMoveListener)
  world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, component.touchEndListener)
}

// Swiper allows you to track touch swipe direction
const Swiper = ecs.registerComponent({
  name: 'swiper',
  schema: {
    touchDirection: ecs.string,
  },
  schemaDefaults: {
    touchDirection: 'up',
  },
  add: (world, component) => {
    addEventListeners(world, component)
  },
  tick: (world, component) => {
  },
  remove: (world, component) => {
    removeEventListeners(world, component)
  },
})

export {Swiper}
