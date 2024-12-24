import * as ecs from '@8thwall/ecs'
const {THREE} = window as any

let material = null
let isModelLoaded : boolean = false

// Force field shader material
ecs.registerComponent({
  name: 'force-field',
  data: {
    time: ecs.f32,
  },
  add: (world, component) => {
    material = new THREE.ShaderMaterial({
      uniforms: {
        time: {value: 0},
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: ` 
      varying vec2 vUv;
      varying vec3 pos;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        pos = position.xyz;
      }`,
      fragmentShader: ` 
      uniform float time; 
      varying vec2 vUv;
      varying vec3 pos;
      void main(void) {
        vec2 p = vUv;
        float g = pos.y; //force field gradient
        float posGround = 0.5;
        float posHeight = 1.;
        g = 1.-(g+posGround) / posHeight;
        g += 0.125*sin(time * 1. + pos.x * 5.); //sin wave animation
        g += 0.125*sin(time * 1. + pos.z * 5.);
        vec3 col = vec3(0., 1., 1.) * g;
        gl_FragColor = vec4(col, g);
      }`,
    })

    ecs.Material.remove(world, component.eid)
    const obj = world.three.entityToObject.get(component.eid)
    obj.material = material
  },
  tick: (world, component) => {
    material.uniforms.time.value = world.time.elapsed * 0.001

    // the model takes time to load. so, lets apply materials once its loaded
    // once its loaded we will have a sub-mesh with DefaultMaterial
    // which we can replace with our ShaderMaterial
    if (isModelLoaded === false) {
      const obj = world.three.entityToObject.get(component.eid)
      obj.traverse((node: any) => {
        if (node.isMesh) {
          if (node.material.type !== 'ShaderMaterial') {
            node.material = material
            node.renderOrder = 9000  // lets render force field after main gplats mesh
            isModelLoaded = true
          }
        }
      })
    }
  },
  remove: (world, component) => {
  },
})
