
// = 009 ======================================================================
// これまでのサンプルでは、メッシュは「１つのジオメトリから１つ」ずつ生成してい
// ましたが、実際の案件では、同じジオメトリを再利用しながら「複数のメッシュ」を
// 生成する場面のほうが多いかもしれません。
// このとき、3D シーンに複数のオブジェクトを追加する際にやってしまいがちな間違い
// として「ジオメトリやマテリアルも複数回生成してしまう」というものがあります。
// メモリ効率よく複数のオブジェクトをシーンに追加する方法をしっかりおさえておき
// ましょう。
// ============================================================================

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  app.render();
}, false);

class ThreeApp {
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    // fovy は Field of View Y のことで、縦方向の視野角を意味する
    fovy: 60,
    // 描画する空間のアスペクト比（縦横比）
    aspect: window.innerWidth / window.innerHeight,
    // 描画する空間のニアクリップ面（最近面）
    near: 0.1,
    // 描画する空間のファークリップ面（最遠面）
    far: 100.0,
    // カメラの座標
    position: new THREE.Vector3(0.0, 2.0, 20.0),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x9e9e9e,       // 画面をクリアする色
    width: window.innerWidth,   // レンダラーに設定する幅
    height: window.innerHeight, // レンダラーに設定する高さ
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,                            // 光の色
    intensity: 2.0,                             // 光の強度
    position: new THREE.Vector3(1.0, 3.0, 1.0), // 光の向き
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.1,  // 光の強度
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x3399ff, // マテリアルの基本色
  };
  static MESH_PARAM = {
    BOX_MESH_NUM: 100,
    OTHER_MESH_NUM: 10,
    TOTAL_MESH_NUM: 110,
    POS_RANGE: 10,
    MAX_SCALE: 1.5,
    TARGET_MESH_NUM: 10
  }

  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  material;         // マテリアル
  torusGeometry;    // トーラスジオメトリ
  torusArray;       // トーラスメッシュの配列 @@@
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      ThreeApp.CAMERA_PARAM.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far,
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // たくさんのメッシュを様々なジオメトリで作成する
    this.meshes = [];
    for (let i = 0; i < ThreeApp.MESH_PARAM.BOX_MESH_NUM; i++) {
      const mesh = this.#randomMesh(true);
      this.meshes.push(mesh);
    }
    for (let i = 0; i < ThreeApp.MESH_PARAM.OTHER_MESH_NUM; i++) {
      const mesh = this.#randomMesh();
      this.meshes.push(mesh);
    }

    this.scene.add(...this.meshes);

    // メッシュを動かす関数を設定する
    this.meshes.forEach(mesh => mesh._function = null);
    for(let i = 0; i < ThreeApp.MESH_PARAM.TOTAL_MESH_NUM; i++) {
      const mesh = this.meshes[i];
      mesh._function = this.#meshMove(mesh.position);
    }
    // 2sごとに動きを変更する
    setInterval(() => {
      for(let i = 0; i < ThreeApp.MESH_PARAM.TOTAL_MESH_NUM; i++) {
        const mesh = this.meshes[i];
        mesh._function = this.#meshMove(mesh.position);
      }
    },2000);

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      // Y 軸回転 @@@
      this.meshes.forEach(mesh => mesh._function());
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 乱数生成関数
   * @param isInt trueにすると整数値でランダム値を返す
   */
  #mapRand(min, max, isInt = false) {
    let rand = Math.random() * (max - min) + min;
    rand = isInt ? Math.round(rand) : rand;
    return rand;
  }

  /**
   * メッシュ生成
   * @param isBoxOnly BoxGeometryのみ生成
   */
  #randomMesh(isBoxOnly = false) {
    const geometries = [
      new THREE.BoxGeometry(1.0, 1.0, 1.0),
      new THREE.ConeGeometry(0.5, 1.0, 16),
      new THREE.TorusGeometry(0.5, 0.2, 8, 16),
    ];
    const color = new THREE.Color(
      this.#mapRand(0.7, 1),
      this.#mapRand(0.7, 1),
      this.#mapRand(0.7, 1)
    );
    const pos = {
      x: this.#mapRand(-ThreeApp.MESH_PARAM.POS_RANGE, ThreeApp.MESH_PARAM.POS_RANGE),
      y: this.#mapRand(-ThreeApp.MESH_PARAM.POS_RANGE, ThreeApp.MESH_PARAM.POS_RANGE),
      z: this.#mapRand(-ThreeApp.MESH_PARAM.POS_RANGE, ThreeApp.MESH_PARAM.POS_RANGE),
    };
    const material = new THREE.MeshLambertMaterial({ color });
    const gIndex = this.#mapRand(0, geometries.length - 1, true);
    const mesh = isBoxOnly ? new THREE.Mesh(geometries[0], material) : new THREE.Mesh(geometries[gIndex], material);
    mesh.position.set(pos.x, pos.y, pos.z);
    const scale = this.#mapRand(1, ThreeApp.MESH_PARAM.MAX_SCALE)
    mesh.geometry.scale(scale, scale, scale);
    return mesh;
  }

  /**
   * メッシュを動かす 関数を返す
   * 
   */
  #meshMove({x,y,z}) {
    const rand = this.#mapRand(0.03, 0.1);
    const MOVE_FUNCTIONS = [
      function() {
        const direction = x < 0 ? rand : -rand;
        this.position.x += direction;
      },
      function() {
        const direction = y < 0 ? rand : -rand;
        this.position.y += direction;
      },
      function() {
        const direction = z < 0 ? rand : -rand;
        this.position.z += direction;
      },
      function() {
        this.rotation.x += 0.05;
      },
      function() {
        this.rotation.y += 0.05;
      },
    ];
    const moveFunc = MOVE_FUNCTIONS[this.#mapRand(0, MOVE_FUNCTIONS.length - 1, true)];
    return moveFunc;
  }
}

