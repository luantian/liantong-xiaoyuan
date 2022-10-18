import {
  AmbientLight,
  AnimationMixer,
  AxesHelper,
  Box3,
  Cache,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  LinearEncoding,
  LoaderUtils,
  LoadingManager,
  PMREMGenerator,
  PerspectiveCamera,
  REVISION,
  Scene,
  SkeletonHelper,
  Vector2,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
  Raycaster,
  // TextureLoader,
  // DoubleSide,
  // MeshBasicMaterial,
  // PlaneGeometry,
  Mesh
} from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// import { GUI } from 'dat.gui';

import { environments } from '@/assets/environment/index.js';
// import { createBackground } from '@/lib/three-vignette.js';

const positions = []

const DEFAULT_CAMERA = '[default]';

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`
const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(`${THREE_PATH}/examples/js/libs/draco/gltf/`);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(`${THREE_PATH}/examples/js/libs/basis/`);

// const IS_IOS = isIOS();

const Preset = { ASSET_GENERATOR: 'assetgenerator' };

Cache.enabled = true;

export class Viewer {

  constructor(el, options) {

    this.el = el;
    this.options = options;

    this.lights = [];
    this.content = null;
    this.mixer = null;
    this.clips = [];
    this.gui = null;
    this.events = options.events
    this.step = options.step
    // createPrevBtn()

    console.log('this.events', this.events)

    this.state = {
      environment: options.preset === Preset.ASSET_GENERATOR
        ? environments.find((e) => e.id === 'footprint-court').name
        : environments[1].name,
      background: false,
      playbackSpeed: 1.0,
      actionStates: {},
      camera: DEFAULT_CAMERA,
      wireframe: false,
      skeleton: false,
      grid: false,

      // Lights
      addLights: true,
      exposure: 1.0,
      textureEncoding: 'sRGB',
      ambientIntensity: 0.3,
      ambientColor: 0xFFFFFF,
      directIntensity: 0.8 * Math.PI, // TODO(#116)
      directColor: 0xFFFFFF,
      bgColor1: '#0c3973',
      bgColor2: '#353535'
    };

    this.prevTime = 0;

    this.stats = new Stats();
    this.stats.dom.height = '48px';
    [].forEach.call(this.stats.dom.children, (child) => (child.style.display = ''));

    this.scene = new Scene();

    const fov = options.preset === Preset.ASSET_GENERATOR
      ? 0.8 * 180 / Math.PI
      : 60;
    this.defaultCamera = new PerspectiveCamera(fov, el.clientWidth / el.clientHeight, 0.01, 1000);
    this.activeCamera = this.defaultCamera;
    this.scene.add(this.defaultCamera);

    this.renderer = window.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setClearColor('#0c3973'); // 调整背景色 步骤1
    this.renderer.setClearAlpha(0);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(el.clientWidth, el.clientHeight);

    this.pmremGenerator = new PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    this.neutralEnvironment = this.pmremGenerator.fromScene(new RoomEnvironment()).texture;

    this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = -10;
    this.controls.screenSpacePanning = true;

    // this.vignette = createBackground({
    //   aspect: this.defaultCamera.aspect,
    //   grainScale: IS_IOS ? 0 : 0.001, // mattdesl/three-vignette-background#1
    //   colors: [this.state.bgColor1, this.state.bgColor2]
    // });
    // this.vignette.name = 'Vignette';
    // this.vignette.renderOrder = -1;

    this.el.appendChild(this.renderer.domElement);

    this.cameraCtrl = null;
    this.cameraFolder = null;
    this.animFolder = null;
    this.animCtrls = [];
    this.morphFolder = null;
    this.morphCtrls = [];
    this.skeletonHelpers = [];
    this.gridHelper = null;
    this.axesHelper = null;

    this.addAxesHelper();
    if (options.kiosk) this.gui.close();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    window.addEventListener('resize', this.resize.bind(this), false);
  }

  animate(time) {

    requestAnimationFrame(this.animate);

    const dt = (time - this.prevTime) / 1000;

    this.controls.update();
    this.stats.update();
    this.mixer && this.mixer.update(dt);
    this.render();

    this.prevTime = time;
  }

  render() {

    this.renderer.render(this.scene, this.activeCamera);
    if (this.state.grid) {
      this.axesCamera.position.copy(this.defaultCamera.position)
      this.axesCamera.lookAt(this.axesScene.position)
      this.axesRenderer.render(this.axesScene, this.axesCamera);
    }
  }

  resize() {

    const { clientHeight, clientWidth } = this.el.parentElement;

    this.defaultCamera.aspect = clientWidth / clientHeight;
    this.defaultCamera.updateProjectionMatrix();
    // this.vignette.style({aspect: this.defaultCamera.aspect});
    this.renderer.setSize(clientWidth, clientHeight);

    this.axesCamera.aspect = this.axesDiv.clientWidth / this.axesDiv.clientHeight;
    this.axesCamera.updateProjectionMatrix();
    this.axesRenderer.setSize(this.axesDiv.clientWidth, this.axesDiv.clientHeight);
  }

  load(url, rootPath, assetMap) {

    const baseURL = LoaderUtils.extractUrlBase(url);

    // Load.
    return new Promise((resolve, reject) => {

      // Intercept and override relative URLs.
      MANAGER.setURLModifier((url, path) => {

        // URIs in a glTF file may be escaped, or not. Assume that assetMap is
        // from an un-escaped source, and decode all URIs before lookups.
        // See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
        const normalizedURL = rootPath + decodeURI(url)
          .replace(baseURL, '')
          .replace(/^(\.?\/)/, '');

        if (assetMap.has(normalizedURL)) {
          const blob = assetMap.get(normalizedURL);
          const blobURL = URL.createObjectURL(blob);
          blobURLs.push(blobURL);
          return blobURL;
        }

        return (path || '') + url;

      });

      const loader = new GLTFLoader(MANAGER)
        .setCrossOrigin('anonymous')
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
        .setMeshoptDecoder(MeshoptDecoder);

      const blobURLs = [];

      loader.load(url, (gltf) => {

        const scene = gltf.scene || gltf.scenes[0];
        const clips = gltf.animations || [];

        if (!scene) {
          // Valid, but not supported by this viewer.
          throw new Error(
            'This model contains no scene, and cannot be viewed here. However,'
            + ' it may contain individual 3D resources.'
          );
        }

        this.setContent(scene, clips);

        console.log('scene', scene)

        blobURLs.forEach(URL.revokeObjectURL);

        // See: https://github.com/google/draco/issues/349
        // DRACOLoader.releaseDecoderModule();

        resolve(gltf);

      }, undefined, reject);

    });

  }

  /**
   * @param {THREE.Object3D} object
   * @param {Array<THREE.AnimationClip} clips
   */
  setContent(object, clips) {

    this.object = object

    object.children.map((item) => {
      positions.push(JSON.parse(JSON.stringify(item.position)))
    })

    this.clear();

    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());

    this.controls.reset();

    object.position.x += (object.position.x - center.x);
    object.position.y += (object.position.y - center.y);
    object.position.z += (object.position.z - center.z);
    this.controls.maxDistance = size * 10;
    this.defaultCamera.near = size / 100;
    this.defaultCamera.far = size * 100;
    this.defaultCamera.updateProjectionMatrix();

    if (this.options.cameraPosition) {

      this.defaultCamera.position.fromArray(this.options.cameraPosition);
      this.defaultCamera.lookAt(new Vector3());

    } else {

      this.defaultCamera.position.copy(center);
      this.defaultCamera.position.x += size / 2.0;
      this.defaultCamera.position.y += size / 5.0;
      this.defaultCamera.position.z += size / 2.0;
      this.defaultCamera.lookAt(center);

    }

    this.setCamera(DEFAULT_CAMERA);

    this.axesCamera.position.copy(this.defaultCamera.position)
    this.axesCamera.lookAt(this.axesScene.position)
    this.axesCamera.near = size / 100;
    this.axesCamera.far = size * 100;
    this.axesCamera.updateProjectionMatrix();
    this.axesCorner.scale.set(size, size, size);

    this.controls.saveState();

    this.scene.add(object);
    this.content = object;

    this.state.addLights = true;

    this.content.traverse((node) => {
      if (node.isLight) {
        this.state.addLights = false;
      } else if (node.isMesh) {
        // TODO(https://github.com/mrdoob/three.js/pull/18235): Clean up.
        node.material.depthWrite = !node.material.transparent;
      }
    });

    this.setClips(clips);

    // loadImage(require('../../assets/img/保密室.png'), this.object, { x: -44, y: 16, z: -8 }, '保密室')
    // loadImage(require('../../assets/img/监控室.png'), this.object, { x: -28, y: 16, z: 8 }, '监控室')
    // loadImage(require('../../assets/img/考务室.png'), this.object, { x: 42, y: 16, z: 8 }, '考务室')
    // loadImage(require('../../assets/img/走廊.png'), this.object, { x: 0, y: 16, z: 0 }, '走廊')
    // loadImage(require('../../assets/img/考场-默认.png'), this.object, { x: 0, y: 16, z: 0 })
    // loadImage(require('../../assets/img/考试作弊防控信息.png'), this.object, { x: 0, y: 30, z: -70 })


    setOnClick.call(this, object);

    this.byStepUpdate(this.step)

    // this.updateLights();
    this.updateEnvironment();
    this.updateTextureEncoding();
    this.updateDisplay();

    window.content = this.content;
    console.info('[glTF Viewer] THREE.Scene exported as `window.content`.');
    this.printGraph(this.content);

  }

  printGraph(node) {

    console.group(' <' + node.type + '> ' + node.name);
    node.children.forEach((child) => this.printGraph(child));
    console.groupEnd();

  }

  /**
   * @param {Array<THREE.AnimationClip} clips
   */
  setClips(clips) {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = null;
    }

    this.clips = clips;
    if (!clips.length) return;

    this.mixer = new AnimationMixer(this.content);
  }

  playAllClips() {
    this.clips.forEach((clip) => {
      this.mixer.clipAction(clip).reset().play();
      this.state.actionStates[clip.name] = true;
    });
  }

  /**
   * @param {string} name
   */
  setCamera(name) {
    if (name === DEFAULT_CAMERA) {
      this.controls.enabled = true;
      this.activeCamera = this.defaultCamera;
    } else {
      this.controls.enabled = false;
      this.content.traverse((node) => {
        if (node.isCamera && node.name === name) {
          this.activeCamera = node;
        }
      });
    }
  }

  updateTextureEncoding() {
    const encoding = this.state.textureEncoding === 'sRGB'
      ? sRGBEncoding
      : LinearEncoding;
    traverseMaterials(this.content, (material) => {
      if (material.map) material.map.encoding = encoding;
      if (material.emissiveMap) material.emissiveMap.encoding = encoding;
      if (material.map || material.emissiveMap) material.needsUpdate = true;
    });
  }

  updateLights() {
    const state = this.state;
    const lights = this.lights;

    if (state.addLights && !lights.length) {
      this.addLights();
    } else if (!state.addLights && lights.length) {
      this.removeLights();
    }

    this.renderer.toneMappingExposure = state.exposure;

    if (lights.length === 2) {
      lights[0].intensity = state.ambientIntensity;
      lights[0].color.setHex(state.ambientColor);
      lights[1].intensity = state.directIntensity;
      lights[1].color.setHex(state.directColor);
    }
  }

  addLights() {
    const state = this.state;
    if (this.options.preset === Preset.ASSET_GENERATOR) {
      const hemiLight = new HemisphereLight();
      hemiLight.name = 'hemi_light';
      this.scene.add(hemiLight);
      this.lights.push(hemiLight);
      return;
    }

    const light1 = new AmbientLight(state.ambientColor, state.ambientIntensity);
    light1.name = 'ambient_light';
    this.defaultCamera.add(light1);

    const light2 = new DirectionalLight(state.directColor, state.directIntensity);
    light2.position.set(0.5, 0, 0.866); // ~60º
    light2.name = 'main_light';
    this.defaultCamera.add(light2);

    this.lights.push(light1, light2);
  }

  removeLights() {

    this.lights.forEach((light) => light.parent.remove(light));
    this.lights.length = 0;

  }

  updateEnvironment() {

    const environment = environments.filter((entry) => entry.name === this.state.environment)[0];

    this.getCubeMapTexture(environment).then(({ envMap }) => {

      if ((!envMap || !this.state.background) && this.activeCamera === this.defaultCamera) {
        // this.scene.add(this.vignette);
      } else {
        // this.scene.remove(this.vignette);
      }

      this.scene.environment = envMap;
      this.scene.background = this.state.background ? envMap : null;

    });

  }

  getCubeMapTexture(environment) {
    const { id, path } = environment;

    // neutral (THREE.RoomEnvironment)
    if (id === 'neutral') {

      return Promise.resolve({ envMap: this.neutralEnvironment });

    }

    // none
    if (id === '') {

      return Promise.resolve({ envMap: null });

    }

    return new Promise((resolve, reject) => {

      new RGBELoader()
        .load(path, (texture) => {

          const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
          this.pmremGenerator.dispose();

          resolve({ envMap });

        }, undefined, reject);

    });

  }

  updateDisplay() {
    if (this.skeletonHelpers.length) {
      this.skeletonHelpers.forEach((helper) => this.scene.remove(helper));
    }

    traverseMaterials(this.content, (material) => {
      material.wireframe = this.state.wireframe;
    });

    this.content.traverse((node) => {
      if (node.isMesh && node.skeleton && this.state.skeleton) {
        const helper = new SkeletonHelper(node.skeleton.bones[0].parent);
        helper.material.linewidth = 3;
        this.scene.add(helper);
        this.skeletonHelpers.push(helper);
      }
    });

    if (this.state.grid !== Boolean(this.gridHelper)) {
      if (this.state.grid) {
        this.gridHelper = new GridHelper();
        this.axesHelper = new AxesHelper();
        this.axesHelper.renderOrder = 999;
        this.axesHelper.onBeforeRender = (renderer) => renderer.clearDepth();
        this.scene.add(this.gridHelper);
        this.scene.add(this.axesHelper);
      } else {
        this.scene.remove(this.gridHelper);
        this.scene.remove(this.axesHelper);
        this.gridHelper = null;
        this.axesHelper = null;
        this.axesRenderer.clear();
      }
    }
  }

  updateBackground() {
    this.vignette.style({ colors: [this.state.bgColor1, this.state.bgColor2] });
  }

  /**
   * Adds AxesHelper.
   *
   * See: https://stackoverflow.com/q/16226693/1314762
   */
  addAxesHelper() {
    this.axesDiv = document.createElement('div');
    this.el.appendChild(this.axesDiv);
    this.axesDiv.classList.add('axes');

    const { clientWidth, clientHeight } = this.axesDiv;

    this.axesScene = new Scene();
    this.axesCamera = new PerspectiveCamera(50, clientWidth / clientHeight, 0.1, 10);
    this.axesScene.add(this.axesCamera);

    this.axesRenderer = new WebGLRenderer({ alpha: true });
    this.axesRenderer.setPixelRatio(window.devicePixelRatio);
    this.axesRenderer.setSize(this.axesDiv.clientWidth, this.axesDiv.clientHeight);

    this.axesCamera.up = this.defaultCamera.up;

    this.axesCorner = new AxesHelper(5);
    this.axesScene.add(this.axesCorner);
    this.axesDiv.appendChild(this.axesRenderer.domElement);
  }


  clear() {

    if (!this.content) return;

    this.scene.remove(this.content);

    // dispose geometry
    this.content.traverse((node) => {

      if (!node.isMesh) return;

      node.geometry.dispose();

    });

    // dispose textures
    traverseMaterials(this.content, (material) => {

      for (const key in material) {

        if (key !== 'envMap' && material[key] && material[key].isTexture) {

          material[key].dispose();

        }
      }
    });
  }

  isShowModel(object, meshName, isShow = false) {
    object.children.forEach((item, index) => {
      if (item.name === meshName) {
        console.log('index', index)
        if (!isShow) {
          item.position.set(10000, 10000, 10000)
        } else {
          item.position.set(positions[index].x, positions[index].y, positions[index].z)
        }
      }
    })
  }

  isShowIcons(object, level = '1J', isShow = false) {
    const children = object.children
    // const a = [
    //   '2级_考场A-01',
    //   '2级_保密室',
    //   '1级_楼层',
    //   '2级_监控室',
    //   '2级_考务室',
    //   '2级_考场B-01',
    //   '1级_走廊',
    //   '1级_保密室',
    //   '1级_考务室',
    //   '1级_监控室',
    //   '1级_考试作弊防控信息',
    //   '1级_考场A-01',
    //   '1级_考场A-02',
    //   '1级_考场B-01',
    //   '1级_考场C-01',
    //   '1级_考场D-01',
    //   '2级_考场A-02',
    //   '2级_考场B-05',
    //   '2级_考场A-03',
    //   '2级_走廊02',
    //   '2级_考场B-02',
    //   '2级_考场B-03',
    //   '2级_考场B-04',
    //   '2级_走廊01',
    //   'icon_2J_KCA-01',
    // ]
    children.map((item) => {
      if (item.name.indexOf('icon') > -1 && item.name.indexOf(level) > -1) {
        item.visible = isShow
      }
    })
  }

  byStepUpdate(step) {
    // console.log('this.object.scale', this.controls.setSize(10))
    // this.controls.size = 10

    switch (step) {
      case 0:
        this.isShowModel(this.object, 'lou_01', true)
        this.isShowModel(this.object, 'lou_02', true)
        this.isShowIcons(this.object, '1J', true)
        // this.object.scale.set(1, 1, 1)
        // this.object.position.set(0, 0, 30)
        break;
      case 1:
        this.isShowModel(this.object, 'lou_01', false)
        this.isShowModel(this.object, 'lou_02', true)
        this.isShowIcons(this.object, '1J', false)
        // this.object.position.set(50, 50, 50)
        break;
      case 2:
        this.isShowModel(this.object, 'lou_01', false)
        this.isShowModel(this.object, 'lou_02', false)
        this.isShowIcons(this.object, '1J', false)
        // this.object.position.set(180, 180, 180)
        break;
    }
  }
}

// const loadImage = (url, object, position, name) => {
//   console.log('url', url)
//   new TextureLoader().load(url,
//     (texture) => {
//       console.log('texture', texture)
//       texture.name = name
//       const SIZE = 10;
//       const img = texture.image;
//       let height = (img && img.height) || SIZE;
//       let width = (img && img.width) || SIZE;
//       height = (SIZE / width) * height;
//       width = SIZE;
//       const mat = new MeshBasicMaterial({ map: texture, side: DoubleSide, transparent: true });
//       const geom = new PlaneGeometry(width, height);
//       const mesh = new Mesh(geom, mat);
//       mesh.position.set(position.x, position.y, position.z)
//       object.add(mesh);
//     },
//     undefined,
//     (error) => {
//       console.log('error', error)
//     }
//   );
// }

const lt_meshes = []
function deepLoop(data) {
  if (!data.children || data.children.length === 0) {
    return lt_meshes
  }
  data.children.forEach((item) => {
    if (item instanceof Mesh) {
      lt_meshes.push(item)
    } else {
      deepLoop(item)
    }
  })
  return lt_meshes
}

// let lt_step = 0;
function setOnClick(object) {

  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const This = this
  function onMouseClick(event) {
    // 将鼠标点击位置的屏幕坐标转换成threejs中的标准坐标

    let getBoundingClientRect = This.el.getBoundingClientRect()

    pointer.x = ((event.clientX - getBoundingClientRect.left) / This.el.offsetWidth) * 2 - 1;
    pointer.y = -((event.clientY - getBoundingClientRect.top) / This.el.offsetHeight) * 2 + 1;

    // 通过鼠标点的位置和当前相机的矩阵计算出raycaster
    raycaster.setFromCamera(pointer, This.activeCamera);

    const intersects = raycaster.intersectObjects(deepLoop(object), false);

    if (intersects.length > 0) {
      const meshObject = intersects[0].object
      const name = meshObject.name
      const { events } = This.options
      console.log('name', name)
      let type = ''
      if (name.indexOf('SXT') > -1) {
        type = 'sxt'
      } else if (name.indexOf('lou') > -1) {
        type = 'lou'
      } else if (name.indexOf('icon_') > -1) {
        type = 'icon'
      } else if (name.indexOf('icon_') > -1 && name.indexOf('louceng') > -1) {
        type = 'louceng'
      }

      console.log('type', type)

      // switch (type) {
      //   case 'sxt':
      //     events.clickSxt(meshObject)
      //     break;
      //   case 'lou':
      //     events.clickLou(meshObject)
      //     break;
      // }

      switch (type) {
        case 'sxt':
          events.clickModelItem({
            eqiupType: 'sxt',
            eqiupId: name,
            eqiupName: name,
            model: meshObject
          })
          break;
        case 'lou':
          events.clickModelItem(
            {
              placeType: '场景类型',
              examPlaceId: name,
              examPlaceName: name,
              model: meshObject
            }
          )
          break;
        case 'level1':
          events.clickModelItem(
            {
              placeType: '场景类型',
              examPlaceId: name,
              examPlaceName: name,
              model: meshObject
            }
          )
          break;
        case "icon":
          events.clickModelItem(
            {
              placeType: '场景类型',
              examPlaceId: name,
              examPlaceName: name,
              model: meshObject
            }
          )
          break;
        case 'louceng':
          This.byStepUpdate(2)
          break;
      }

      // 编写业务逻辑处 开始

      // 编写业务逻辑处 结束
    }
  }

  window.addEventListener('click', onMouseClick, false);

}

function traverseMaterials(object, callback) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    materials.forEach(callback);
  });
}

// function createPrevBtn() {
//   const dom = document.createElement('div')
//   // dom.setAttribute('class', 'prev-btn')
//   dom.style.position = 'absolute'
//   dom.style.top = '10px'
//   dom.style.right = '10px'
//   dom.style.cursor = 'pointer'
//   dom.style.zIndex = 10000;
//   dom.style.color = '#fff';
//   dom.innerHTML = '返回'
//   document.querySelector('.lt-model').appendChild(dom)
//   dom.onclick = () => {
//     lt_step --
//   }
// }

// https://stackoverflow.com/a/9039885/1314762
// function isIOS() {
//   return [
//     'iPad Simulator',
//     'iPhone Simulator',
//     'iPod Simulator',
//     'iPad',
//     'iPhone',
//     'iPod'
//   ].includes(navigator.platform)
//   // iPad on iOS 13 detection
//   || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
// }
