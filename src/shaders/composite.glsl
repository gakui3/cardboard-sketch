#version 300 es

precision highp float;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D paintDestTexture;
uniform sampler2D backgroundTexture;

void main(void ) {
  vec4 background = texture(backgroundTexture, vUv);
  vec4 paint = texture(paintDestTexture, vUv);

  vec4 col = mix(paint, background, 0.5);
  col.a = 1.0;

  //加算合成
  fragColor = col;
}
