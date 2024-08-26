#version 300 es

precision highp float;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D paintDestTexture;
uniform sampler2D backgroundTexture;

vec4 blendScreen(vec4 srcColor, vec4 dstColor) {
  vec3 color = 1.0 - (1.0 - srcColor.rgb) * (1.0 - dstColor.rgb);
  float alpha = srcColor.a + dstColor.a * (1.0 - srcColor.a);
  return vec4(color, alpha);
}

vec3 overlayBlend(vec3 srcColor, vec3 dstColor) {
  return mix(
    2.0 * srcColor * dstColor,
    1.0 - 2.0 * (1.0 - srcColor) * (1.0 - dstColor),
    step(0.5, dstColor)
  );
}

vec4 blendOverlay(vec4 srcColor, vec4 dstColor) {
  vec3 color = overlayBlend(srcColor.rgb, dstColor.rgb);
  float alpha = srcColor.a + dstColor.a * (1.0 - srcColor.a);
  return vec4(color, alpha);
}

vec4 blendMultiply(vec4 srcColor, vec4 dstColor) {
  vec3 color = srcColor.rgb * dstColor.rgb;
  float alpha = srcColor.a + dstColor.a * (1.0 - srcColor.a);
  return vec4(color, alpha);
}

void main(void ) {
  vec4 background = texture(backgroundTexture, vUv);
  vec4 paint = texture(paintDestTexture, vUv);

  vec4 col = blendScreen(paint, background);
  // vec4 col = blendOverlay(paint, background);
  // vec4 col = blendMultiply(paint, background);

  fragColor = col;
}
