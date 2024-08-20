#version 300 es

precision highp float;

in vec2 vUV; // 頂点シェーダーから渡されるUV座標
uniform sampler2D textureSampler;

out vec4 fragColor;

void main(void ) {
  //   fragColor = texture(textureSampler, vec2(vUV.y * 10, vUV.x)); // UV座標をRGB値に変換して表示
  fragColor = texture(textureSampler, vec2(vUV.x * 15.0, vUV.y));
}
