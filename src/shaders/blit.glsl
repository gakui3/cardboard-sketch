// precision highp float;

// varying vec2 vUV;
// uniform sampler2D textureSampler;
// // uniform sampler2D tempTexture;

// void main(void ) {
//   vec4 c1 = texture2D(textureSampler, vUV);
//   // vec4 c2 = texture2D(tempTexture, vUV);

//   gl_FragColor = c1;
// }

#version 300 es

precision highp float;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D paintSrcTexture;
uniform sampler2D tempTexture;

void main(void ) {
  vec4 c1 = texture(paintSrcTexture, vUv);
  vec4 c2 = texture(tempTexture, vUv);

  // fragColor = c1 + c2;
  fragColor = mix(c2, c1, c1.a);
}
