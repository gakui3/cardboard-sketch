#version 300 es

layout(location = 0) in vec3 position;

uniform mat4 worldViewProjection;

void main(void) {
    gl_Position = worldViewProjection * vec4(position, 1.0);
}