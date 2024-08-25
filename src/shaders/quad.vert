#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 uv;

uniform mat4 worldViewProjection;
out vec2 vUv;

void main(void ) {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
