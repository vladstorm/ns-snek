import * as ecs from '@8thwall/ecs'
const {THREE} = window as any

// Serializer helps to use new properties types in components (in .data/.schema)
// You can use THREE.Vector3 Arrays, BigInt Arrays and JSON objects
const Serializer = {
  // String to THREE.Vector3 Array
  serializeArrayVec3: posArray => posArray.map(pos => `${pos.x},${pos.y},${pos.z}`).join(';'),

  // THREE.Vector3 Array to String
  deserializeArrayVec3: positionsString => positionsString.split(';').map((pos) => {
    const [x, y, z] = pos.split(',').map(Number)
    return new THREE.Vector3(x, y, z)
  }),

  // String to BigInt Array
  serializeArrayBigInt: (intArray: BigInt[]): string => intArray.join(','),

  // BigInt Array To String
  deserializeArrayBigInt: (intString: string): BigInt[] => intString.split(',').map(BigInt),

  // JSON object to string
  serializeObject: obj => JSON.stringify(obj),

  // JSON string to object
  deserializeObject: string => JSON.parse(string),

}

export {Serializer}
