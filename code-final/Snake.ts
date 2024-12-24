import * as ecs from '@8thwall/ecs'
import {Swiper} from './Swiper'
import {Serializer} from './Serializer'
const {THREE} = window as any

// Apples Logic -----------------------------------------
const spawnApple = (world, boundary, gridSize) => {
  const appleEid = world.createEntity()
  const maxDimX = boundary.maxX / gridSize
  const maxDimZ = boundary.maxZ / gridSize
  const randomX = (Math.floor(Math.random() * maxDimX * 2) - maxDimX) * gridSize  // Random x within boundaries
  const randomZ = (Math.floor(Math.random() * maxDimZ * 2) - maxDimZ) * gridSize  // Random z within boundaries
  ecs.SphereGeometry.set(world, appleEid, {radius: gridSize * 0.5 * 0.75})
  ecs.Material.set(world, appleEid, {r: 255, g: 0, b: 0, roughness: 0, metalness: 0})
  world.setPosition(appleEid, randomX, 0, randomZ)
  return {eid: appleEid, position: new THREE.Vector3(randomX, 0, randomZ)}
}

const checkAppleCollision = (headPos, applePos, gridSize) => headPos.distanceTo(applePos) < gridSize * 0.5  // Within a radius of grid size

// Snake Logic -----------------------------------------
const checkBoundaryCollision = (headPos, boundary) => (
  headPos.x < boundary.minX ||
  headPos.x > boundary.maxX ||
  headPos.z < boundary.minZ ||
  headPos.z > boundary.maxZ
)

const checkSelfCollision = (positions) => {
  const [head, ...body] = positions
  return body.some(segment => head.equals(segment))
}

// UI Logic -----------------------------------------
let tLastMessage = 0
const showMessage = (world, msgEid, time, text) => {
  ecs.Ui.set(world, msgEid, {text})
  ecs.Disabled.remove(world, msgEid)  // Show UI
  tLastMessage = time
}

const tMessageStayDuration = 4.0
const updateMessage = (world, msgEid, time) => {
  if (time - tLastMessage > tMessageStayDuration) {
    ecs.Ui.set(world, msgEid, {text: ''})
    ecs.Disabled.set(world, msgEid, {})  // Hide UI
  }
}

// Game Reset Logic  -----------------------------
let isGameReseting = false
let isGameReset = false
let tGameResetStart = 0
const tGameResetDurarion = tMessageStayDuration + 4.0
const handleGameReset = (world, msgEid, time) => {
  if (isGameReseting === false) return
  let t = time - tGameResetStart  // time passed since restarting started
  if (t > tMessageStayDuration) {
    t = tGameResetDurarion - t  // time left before reset

    if (t <= 1) {
      isGameReseting = false
      isGameReset = true

      return
    }

    t -= (t % 1.0)
    const text = `Game Restart in ${t} ...`
    ecs.Ui.set(world, msgEid, {text})
  }
}

const startGameReset = (time) => {
  isGameReseting = true
  tGameResetStart = time
}

// Utils -----------------------------------------
const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  if (/mobile|android|iphone|ipad/.test(userAgent)) {
    return 'mobile'
  } else {
    return 'desktop'
  }
}

// Game Start and Reset -------------------------
const resetGame = (world, component) => {
  // Initialize data params
  component.data.direction = 'up'
  component.data.lastDirection = 'up'
  component.data.tStep = 0.33
  component.data.applesAmount = 10
  component.data.speedMult = 0.85
  component.data.tLastMove = world.time.elapsed / 1000
  component.data.gridSize = 0.25
  const boundary = {minX: -3.25, maxX: 3.25, minZ: -6, maxZ: 6}
  component.data.boundary = Serializer.serializeObject(boundary)  // JSON.stringify()
  component.data.gameOver = false

  // Initialize snake segments
  const posArray = []
  const eidArray = []
  const {gridSize} = component.data
  for (let i = 0; i < 3; i++) {
    let eidSegment
    if (i === 0) {
      eidSegment = component.schema.snakeHead
    } else {
      eidSegment = world.createEntity()
      ecs.SphereGeometry.set(world, eidSegment, {radius: gridSize * 0.5})
      ecs.Material.set(world, eidSegment, {r: 0, g: 255, b: 0, roughness: 0, metalness: 0})
    }
    const pos = new THREE.Vector3(0, 0, i * gridSize)
    world.setPosition(eidSegment, pos.x, pos.y, pos.z)
    posArray.push(pos)
    eidArray.push(eidSegment)
  }
  component.data.segmentPositions = Serializer.serializeArrayVec3(posArray)
  component.data.segmentEids = Serializer.serializeArrayBigInt(eidArray)

  // Spawn N apples
  const apples = []
  const appleEids = []
  for (let i = 0; i < component.data.applesAmount; i++) {
    const apple = spawnApple(world, boundary, gridSize)
    apples.push(apple.position)
    appleEids.push(apple.eid)
  }
  component.data.applePositions = Serializer.serializeArrayVec3(apples)
  component.data.appleEids = Serializer.serializeArrayBigInt(appleEids)

  // Show navigation instructions
  const t = world.time.elapsed / 1000
  if (detectPlatform() === 'desktop') {
    showMessage(world, component.schema.msg, t, 'Welcome 👋😊\nUse arrow keys to move')
  } else {
    showMessage(world, component.schema.msg, t, 'Welcome 👋😊\nSwipe direction to move')
  }
}

const cleanUp = (world, component) => {
  // remove apples from the scene
  const appleEids = Serializer.deserializeArrayBigInt(component.data.appleEids)
  for (let i = 0; i <= appleEids.length - 1; i++) {
    world.deleteEntity(appleEids[i])
  }

  // remove snake segments from the scene
  const segmentEids = Serializer.deserializeArrayBigInt(component.data.segmentEids)
  for (let i = 0; i <= segmentEids.length - 1; i++) {
    if (i !== 0) world.deleteEntity(segmentEids[i])
  }

  // remove the message
  updateMessage(world, component.schema.msg, tMessageStayDuration)  // hide message
}

// Main Game Loop Component
ecs.registerComponent({
  name: 'snake',
  schema: {
    snakeHead: ecs.eid,
    msg: ecs.eid,  // message ui
    swiper: ecs.eid,
  },
  data: {
    segmentPositions: ecs.string,  // Snake segment positions (Serialized array of THREE.Vector3)
    segmentEids: ecs.string,       // Snake segment Eids (serialized array of BigInt)
    applePositions: ecs.string,    // Apple positions (serialized array of THREE.Vector3)
    appleEids: ecs.string,         // Apple entity Eids (Serialized array of BigInt)
    applesAmount: ecs.i32,         // Amount of apples
    direction: ecs.string,         // Current movement direction
    lastDirection: ecs.string,     // Last direction, for preventing reversing
    tStep: ecs.f32,                // Duration of a move step (Snake speed)
    speedMult: ecs.f32,            // Move step multiplier (After apple picked up -> Snake goes faster)
    tLastMove: ecs.f32,            // Time of last move
    gridSize: ecs.f32,             // Size of a move step
    boundary: ecs.string,          // boundary size (Serialized object)
    gameOver: ecs.boolean,         // Game Status
  },

  add: (world, component) => {
    resetGame(world, component)
  },

  tick: (world, component) => {
    const {vec3, quat} = ecs.math
    const t = world.time.elapsed / 1000

    // Reset game logic
    if (component.data.gameOver === true) {
      handleGameReset(world, component.schema.msg, t)
      if (isGameReset === true) {
        isGameReset = false
        cleanUp(world, component)
        resetGame(world, component)
      }
      return
    }

    // Handle inputs
    if (detectPlatform() === 'desktop') {
      // Desktop: keyboard input
      if (world.input.getAction('up') && component.data.lastDirection !== 'down') component.data.direction = 'up'
      if (world.input.getAction('down') && component.data.lastDirection !== 'up') component.data.direction = 'down'
      if (world.input.getAction('left') && component.data.lastDirection !== 'right') component.data.direction = 'left'
      if (world.input.getAction('right') && component.data.lastDirection !== 'left') component.data.direction = 'right'
    } else {
      // Mobile: swipe direction input
      const swiperEid = component.schema.swiper
      const swiperData = Swiper.get(world, swiperEid)
      const dir = swiperData.touchDirection
      if (dir === 'up' && component.data.lastDirection !== 'down') component.data.direction = 'up'
      if (dir === 'down' && component.data.lastDirection !== 'up') component.data.direction = 'down'
      if (dir === 'left' && component.data.lastDirection !== 'right') component.data.direction = 'left'
      if (dir === 'right' && component.data.lastDirection !== 'left') component.data.direction = 'right'
    }

    // Hide message after certain duration
    updateMessage(world, component.schema.msg, t)

    // Sequential movement
    if (t - component.data.tLastMove > component.data.tStep) {
      component.data.tLastMove = t
    } else {
      return
    }

    // Deserialize data params
    const segmentPositions = Serializer.deserializeArrayVec3(component.data.segmentPositions)
    const segmentEids = Serializer.deserializeArrayBigInt(component.data.segmentEids)
    const applePositions = Serializer.deserializeArrayVec3(component.data.applePositions)
    const appleEids = Serializer.deserializeArrayBigInt(component.data.appleEids)
    const {gridSize} = component.data
    const boundary = Serializer.deserializeObject(component.data.boundary)  // JSON.parse(component.data.boundary)

    // Move snake, update segment positions
    for (let i = segmentPositions.length - 1; i > 0; i--) {
      segmentPositions[i] = segmentPositions[i - 1]
    }
    const headPos = segmentPositions[0].clone()
    let step = new THREE.Vector3(0, 0, 0)
    switch (component.data.direction) {
      case 'up': step = new THREE.Vector3(0, 0, -1); break
      case 'down': step = new THREE.Vector3(0, 0, 1); break
      case 'left': step = new THREE.Vector3(-1, 0, 0); break
      case 'right': step = new THREE.Vector3(1, 0, 0); break
      default: break
    }
    // Rotate snake head
    const vecLookAt = vec3.xyz(step.x, step.y, step.z).scale(-1)
    const headRot = quat.lookAt(vecLookAt, vec3.zero(), vec3.up()).clone()
    world.setQuaternion(component.schema.snakeHead, headRot.x, headRot.y, headRot.z, headRot.w)

    headPos.add(step.multiplyScalar(gridSize))
    segmentPositions[0] = headPos

    // Lets set snake head position to snake entity position - for the camera to follow
    world.setPosition(component.eid, headPos.x, headPos.y, headPos.z)

    // Update segment entities positions
    segmentPositions.forEach((pos, i) => {
      world.setPosition(segmentEids[i], pos.x, pos.y, pos.z)
    })
    component.data.segmentPositions = Serializer.serializeArrayVec3(segmentPositions)
    component.data.lastDirection = component.data.direction

    // Check snake for collisions
    if (checkSelfCollision(segmentPositions)) {
      showMessage(world, component.schema.msg, t, 'Game Over ☠️\nYou self-collided')
      component.data.gameOver = true
      startGameReset(t)
      return
    }
    if (checkBoundaryCollision(segmentPositions[0], boundary)) {
      showMessage(world, component.schema.msg, t, 'Game Over ☠️\nYou hit the wall')
      component.data.gameOver = true
      startGameReset(t)
      return
    }

    // Check for snake x apple collisions - to pick up apples
    for (let i = applePositions.length - 1; i >= 0; i--) {
      if (checkAppleCollision(segmentPositions[0], applePositions[i], gridSize)) {
        showMessage(world, component.schema.msg, t, 'Homp!  \nApple eaten 🍎')
        const newSegment = world.createEntity()
        ecs.SphereGeometry.set(world, newSegment, {radius: gridSize * 0.5})
        ecs.Material.set(world, newSegment, {r: 0, g: 255, b: 0, roughness: 0, metalness: 0})
        const tailPos = segmentPositions[segmentPositions.length - 1].clone()
        world.setPosition(newSegment, tailPos.x, tailPos.y, tailPos.z)
        segmentPositions.push(tailPos)
        segmentEids.push(newSegment)
        component.data.segmentPositions = Serializer.serializeArrayVec3(segmentPositions)
        component.data.segmentEids = Serializer.serializeArrayBigInt(segmentEids)
        component.data.tStep *= component.data.speedMult  // increase speed

        // last apple
        if (applePositions.length === 1) {
          showMessage(world, component.schema.msg, t, 'You won!🏆🥰✨')
          component.data.gameOver = true
          startGameReset(t)
          return
        }

        // Remove eaten apple
        world.deleteEntity(appleEids[i])
        applePositions.splice(i, 1)
        appleEids.splice(i, 1)

        // Spawn a new apple
        // const newApple = spawnApple(world, gridSize)
        // applePositions.push(newApple.position)
        // appleEids.push(newApple.eid)
      }
    }
    component.data.applePositions = Serializer.serializeArrayVec3(applePositions)
    component.data.appleEids = Serializer.serializeArrayBigInt(appleEids)
  },
})
