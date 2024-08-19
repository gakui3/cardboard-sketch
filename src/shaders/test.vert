#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

uniform mat4 worldViewProjection;

out vec2 vUV; // フラグメントシェーダーに渡すためのUV変数

void main(void ) {
  vUV = uv; // UV座標をフラグメントシェーダーに渡す
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
