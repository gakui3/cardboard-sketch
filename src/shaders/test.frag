#version 300 es

precision highp float;

in vec2 vUV; // 頂点シェーダーから渡されるUV座標

out vec4 fragColor;

void main(void ) {
  fragColor = vec4(vUV, 0.0, 1.0); // UV座標をRGB値に変換して表示
}
