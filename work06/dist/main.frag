precision mediump float;

varying vec4 vColor;
varying vec3 vNormal;

// ライトベクトルはひとまず定数で定義する
const vec3 LIGHT = normalize(vec3(1.0, 1.0, 1.0));

void main() {
  // 変換した法線とライトベクトルで内積を取る @@@
  float d = dot(normalize(vNormal), LIGHT);

  // 内積の結果を頂点カラーの RGB 成分に乗算する
  vec4 color = vec4(vColor.rgb * d, vColor.a);

  gl_FragColor = color;
}