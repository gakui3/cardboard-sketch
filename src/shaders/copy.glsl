#version 300 es

precision highp float;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D paintDestTexture;

void main(void ) {
  fragColor = texture(paintDestTexture, vUv);
}
