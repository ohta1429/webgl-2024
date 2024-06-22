
// = 018 ======================================================================
// ここではまず、三角関数の最も基本的な要素であるサインとコサインについてのおさ
// らいをしましょう。
// プログラミングにおいて、一般に角度は度数ではなくラジアンで表されます。
// JavaScript の場合も、サインやコサインを求める際の角度の指定にはラジアンを用い
// る必要があります。
// 簡潔に言えば、ラジアンとは「円の一周を２パイ」とし、それを基準に角度を表現す
// る方法です。（たとえば 1/2 パイは直角とみなせる）
// ここでは時間の経過（秒数）をラジアンとみなして、その値からサインとコサインを
// 求めてやり、月の座標にそれらの結果を設定しています。サインやコサインは、角度
// が変化したときどのように振る舞うのか、ここでしっかり確かめておきましょう。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

window.addEventListener('DOMContentLoaded', async () => {
  const wrapper = document.querySelector('#webgl');
  const app = new ThreeApp(wrapper);
  await app.load();
  app.init();
  app.render();
}, false);

class ThreeApp {
  /**
   * 月に掛けるスケール
   */
  static MOON_SCALE = 0.1;
  static EARTH_SCALE = 3.0;
  /**
 * 月と地球の間の距離
 */
  static MOON_DISTANCE = 3.0;
  /**
   * 地球の間の距離
   */
  static DISTANCE = 3.3;
  /**
   * 移動速度
   */
    static ORBIT_SPEED = 0.5;
  /**
   * 曲がる力
   */
  static TURN_SCALE = 1.0;
  /**
   * オフセット
   */
  static ANGLE_OFFSET = Math.PI / 4;
  /**
   * カメラ定義のための定数
   */
  static CAMERA_PARAM = {
    fovy: 60,
    aspect: window.innerWidth / window.innerHeight,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 10.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   */
  static RENDERER_PARAM = {
    clearColor: 0x001e43,
    width: window.innerWidth,
    height: window.innerHeight,
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.3,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  static POSITION_MATERIAL_PARAM = {
    color: 0xff5533,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 20.0,
  };

  wrapper;          // canvas の親要素
  renderer;         // レンダラ
  scene;            // シーン
  camera;           // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight;     // 環境光（アンビエントライト）
  controls;         // オービットコントロール
  axesHelper;       // 軸ヘルパー
  isDown;           // キーの押下状態用フラグ
  clock;            // 時間管理用
  sphereGeometry;   // ジオメトリ
  coneGeometry;     // コーンジオメトリ
  earth;            // 地球
  earthMaterial;    // 地球用マテリアル
  earthTexture;     // 地球用テクスチャ
  moon;             // 月
  moonMaterial;     // 月用マテリアル
  moonTexture;      // 月用テクスチャ

  orbit;
  orbitMaterial;
  orbitDirection;
  orbit2;
  orbitDirection2;
  
  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

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

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      const earthPath = './earth.jpg';
      const moonPath = './moon.jpg';
      const loader = new THREE.TextureLoader();
      loader.load(earthPath, (earthTexture) => {
        // 地球用
        this.earthTexture = earthTexture;
        loader.load(moonPath, (moonTexture) => {
          // 月用
          this.moonTexture = moonTexture;
          resolve();
        });
      });
    });
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

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

    // 球体のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(ThreeApp.EARTH_SCALE, 32, 32);

    // 地球のマテリアルとメッシュ
    this.earthMaterial = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.earthMaterial.map = this.earthTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    // 地球の周りをぐるぐる回るオブジェクトを作成
    this.coneGeometry = new THREE.ConeGeometry(2.0, 4.0, 32);
    this.orbitMaterial = new THREE.MeshPhongMaterial(ThreeApp.POSITION_MATERIAL_PARAM);
    this.orbit = new THREE.Mesh(this.coneGeometry, this.orbitMaterial);
    this.orbit2 = new THREE.Mesh(this.coneGeometry, this.orbitMaterial);
    this.orbit.scale.setScalar(ThreeApp.MOON_SCALE);
    this.orbit2.scale.setScalar(ThreeApp.MOON_SCALE);
    this.orbit.position.set(0.0,ThreeApp.DISTANCE,0.0);
    this.orbit2.position.set(0.0,ThreeApp.DISTANCE,0.0);
    // 進行方向の初期化
    this.orbitDirection = new THREE.Vector3(0.0, 1.0, 0.0).normalize();
    this.orbitDirection2 = new THREE.Vector3(0.0, 1.0, 0.0).normalize();

    this.scene.add(this.orbit);
    this.scene.add(this.orbit2);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // - Clock オブジェクト ---------------------------------------------------
    // three.js の Clock オブジェクトを使うと、時間の経過を効率よく取得・調査す
    // ることができます。
    // 内部的に時刻の計測を開始しているか、というフラグがあり初期値は false です
    // が、経過時間を取得する Clock.getElapsedTime などを呼び出すと同時に、自動
    // 的にタイマーがスタートするようになっています。
    // 明示的にいずれかのタイミングでスタートさせたい場合は Clock.start メソッド
    // を用いることで、タイマーのリセットを行うと同時に計測を開始できます。
    // ------------------------------------------------------------------------
    // Clock オブジェクトの生成 @@@
    this.clock = new THREE.Clock();
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      // this.moon.rotation.y += 0.05;
    }
    this.earth.rotation.y += 0.005;
    this.earth.rotation.z += 0.005;

    // 前フレームの位置
    const prevPosition = this.orbit.position.clone();
    const prevPosition2 = this.orbit2.position.clone();
    // 前フレームの進行方向ベクトル
    const previousDirection = this.orbitDirection.clone();
    const previousDirection2 = this.orbitDirection2.clone();

    // 球体の周りを回る動きを計算
    const radius = ThreeApp.DISTANCE;  // 球体の半径 + コーンの半径の合計
    const time = this.clock.getElapsedTime();
    const orbitAngle = time * ThreeApp.ORBIT_SPEED;
    
    // コーンの位置を時間経過から計算
    this.orbit.position.set(
      radius * Math.cos(orbitAngle + ThreeApp.ANGLE_OFFSET) * -1,
      radius * Math.sin(orbitAngle + ThreeApp.ANGLE_OFFSET),
      radius * Math.cos(orbitAngle + ThreeApp.ANGLE_OFFSET),
    );
    this.orbit2.position.set(
      radius * Math.cos(orbitAngle + ThreeApp.ANGLE_OFFSET),
      0.0,
      radius * Math.sin(orbitAngle + ThreeApp.ANGLE_OFFSET),
    );
    
    // 前の位置と現在の位置から、２点間を結ぶベクトルを定義 => 向きを計算
    const subVector = new THREE.Vector3().subVectors(this.orbit.position, prevPosition);
    subVector.normalize();
    const subVector2 = new THREE.Vector3().subVectors(this.orbit2.position, prevPosition2);
    subVector2.normalize();
    // 進行方向ベクトルに向きベクトルをスケールして加算    
    this.orbitDirection.add(subVector.multiplyScalar(ThreeApp.TURN_SCALE));
    this.orbitDirection.normalize();
    this.orbitDirection2.add(subVector2.multiplyScalar(ThreeApp.TURN_SCALE));
    this.orbitDirection2.normalize();

    // 前フレームの進行方向と現在の進行方向の2つのベクトルから法線ベクトルを求める
    const normalAxis = new THREE.Vector3().crossVectors(previousDirection, this.orbitDirection);
    normalAxis.normalize();
    const normalAxis2 = new THREE.Vector3().crossVectors(previousDirection2, this.orbitDirection2);
    normalAxis2.normalize();
    // 前フレームの進行方向と現在の進行方向の2つのベクトルから内積でコサインを取り出す
    const cos = previousDirection.dot(this.orbitDirection);
    const cos2 = previousDirection2.dot(this.orbitDirection2);
    // コサインをラジアンへ変換
    const radians = Math.acos(cos);
    const radians2 = Math.acos(cos2);
    // 求めた法線ベクトルとラジアンからクォータニオンを定義
    const qtn = new THREE.Quaternion().setFromAxisAngle(normalAxis, radians);
    const qtn2 = new THREE.Quaternion().setFromAxisAngle(normalAxis2, radians2);
    // コーンメッシュのクォータニオンに乗算
    this.orbit.quaternion.premultiply(qtn);
    this.orbit2.quaternion.premultiply(qtn2);

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
