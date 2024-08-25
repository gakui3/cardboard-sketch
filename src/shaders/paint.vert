#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;
layout(location = 2) in vec3 normal;

//'world', 'view', 'projection', 'worldViewProjection', 'cameraPosition'
uniform mat4 world;
// uniform mat4 view;
uniform mat3 normalMatrix;
// uniform mat4 projection;
uniform mat4 worldViewProjection;
// uniform vec3 cameraPosition;

out vec2 vUV; // フラグメントシェーダーに渡すためのUV変数
out vec3 wNormal; // フラグメントシェーダーに渡すための法線変数
out vec3 worldPosition;

void main(void ) {
  vUV = uv; // UV座標をフラグメントシェーダーに渡す
  worldPosition = (world * vec4(position, 1.0)).xyz;

  mat4 inverseModelMatrix = inverse(world);
  mat3 normalMatrix = transpose(mat3(inverseModelMatrix));
  wNormal = (normalMatrix * normal).xyz;
  gl_Position = vec4(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0, 0.0, 1.0);
}
