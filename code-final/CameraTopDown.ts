import * as ecs from '@8thwall/ecs'
const {THREE} = window as any

// CameraTopDown component help to control the camera
// it will makes 3rd person camera follow a target (targetEntity)
// at a certain height (followHeight) and distance (followDistance)
// Smoothing controls how smooth camera changes the position and rotation
const CameraTopDown = ecs.registerComponent({
  name: 'camera-top-down',
  schema: {
    targetEntity: ecs.eid,    // Entity the camera should follow (snake head)
    followDistance: ecs.f32,  // Distance behind the target
    followHeight: ecs.f32,    // Height above the target
    smoothing: ecs.f32,       // Smoothing factor
  },
  schemaDefaults: {
    followDistance: 5,
    followHeight: 2,
    smoothing: 0.1,
  },

  add: (world, component) => {
  },

  tick: (world, component) => {
    const {schema, eid} = component
    const targetEid = schema.targetEntity
    const {vec3, quat} = ecs.math

    let targetPos = ecs.Position.get(world, targetEid)
    targetPos = vec3.xyz(targetPos.x, targetPos.y, targetPos.z)  // clone

    // Position
    let camPos = vec3.xyz(
      targetPos.x,
      targetPos.y + schema.followHeight,
      targetPos.z + schema.followDistance
    )

    let cameraPosPrev = ecs.Position.get(world, eid)
    cameraPosPrev = vec3.xyz(cameraPosPrev.x, cameraPosPrev.y, cameraPosPrev.z)  // clone
    camPos = cameraPosPrev.mix(camPos, schema.smoothing)  // smoothing

    const camPosCurrent = ecs.Position.cursor(world, eid)
    camPosCurrent.x = camPos.x
    camPosCurrent.y = camPos.y
    camPosCurrent.z = camPos.z

    // Rotation
    let camRot = quat.lookAt(camPos, targetPos, vec3.up()).clone()

    const camRotPrev = ecs.Quaternion.get(world, eid)

    const camRotPrevTHREE = new THREE.Quaternion(camRotPrev.x, camRotPrev.y, camRotPrev.z, camRotPrev.w)
    const camRotTHREE = new THREE.Quaternion(camRot.x, camRot.y, camRot.z, camRot.w)
    camRotPrevTHREE.slerp(camRotTHREE, schema.smoothing)
    camRot = camRotPrevTHREE.clone()

    const camRotCurrent = ecs.Quaternion.cursor(world, eid)
    camRotCurrent.w = camRot.w
    camRotCurrent.x = camRot.x
    camRotCurrent.y = camRot.y
    camRotCurrent.z = camRot.z
  },
})

export {CameraTopDown}
