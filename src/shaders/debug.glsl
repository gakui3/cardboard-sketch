precision highp float;

// Samplers
varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D depthTextureSampler;
uniform sampler2D paintSrcSampler;
uniform sampler2D paintDestSampler;
uniform sampler2D resultSampler;

const float divisions = 8.0;

void main(void ) {
  vec2 uv = vec2(1.0 - vUV.x, 1.0 - vUV.y);

  vec2 repeatUV = vec2(fract(uv.x * 8.0), fract(uv.y * divisions));
  float xIdx = floor(uv.x * divisions);
  float yIdx = floor(uv.y * divisions);

  vec4 c = texture2D(textureSampler, vUV);

  if (xIdx == 0.0 && yIdx == 0.0) {
    vec2 uv = vec2(1.0 - repeatUV.x, 1.0 - repeatUV.y);
    vec4 col = texture2D(depthTextureSampler, uv);
    c = col;
  }
  if (xIdx == 0.0 && yIdx == 1.0) {
    vec2 uv = vec2(1.0 - repeatUV.x, 1.0 - repeatUV.y);
    vec4 col = texture2D(paintSrcSampler, uv);
    c = col;
  }
  if (xIdx == 0.0 && yIdx == 2.0) {
    vec2 uv = vec2(1.0 - repeatUV.x, 1.0 - repeatUV.y);
    vec4 col = texture2D(paintDestSampler, uv);
    c = col;
  }
  if (xIdx == 0.0 && yIdx == 3.0) {
    vec2 uv = vec2(1.0 - repeatUV.x, 1.0 - repeatUV.y);
    vec4 col = texture2D(resultSampler, uv);
    c = col;
  }

  gl_FragColor = c;
}
