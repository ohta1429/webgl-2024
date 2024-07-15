precision mediump float;

attribute vec3 position;
attribute vec3 positionStar;
attribute vec4 color;
varying vec4 vColor;

// 経過時間を uniform 変数（の浮動小数点）として受け取る
uniform float time;
uniform float direction;

void main() {
  // フラグメントシェーダに送る色の情報を varying 変数に代入
  vColor = color;
  // 頂点座標の出力
  gl_Position = vec4(mix(position,positionStar,direction), 1.0);
}

