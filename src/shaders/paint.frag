#version 300 es

precision highp float;

in vec2 vUV; // 頂点シェーダーから渡されるUV座標
in vec3 wNormal; // 頂点シェーダーから渡される法線ベクトル
in vec3 worldPosition; // 頂点シェーダーから渡されるワールド座標

// uniform sampler2D textureSampler;
uniform vec3 lightPosition; // ライトの位置
uniform vec3 lightDirection; // ライトの方向
// uniform vec3 lightColor; // ライトの色
// uniform float lightCutoff; // スポットライトのカットオフ角度（コサイン値）
// uniform float lightOuterCutoff; // スポットライトの外側カットオフ角度（コサイン値）
// uniform float lightIntensity; // ライトの強度

out vec4 fragColor;

void main(void ) {
  vec3 lightColor = vec3(1.0, 0.0, 0.0); // ライトの色
  float lightCutoff = cos(radians(0.5)); // スポットライトのカットオフ角度（コサイン値）
  float lightOuterCutoff = cos(radians(0.8)); // スポットライトの外側カットオフ角度（コサイン値）
  float lightIntensity = 3.0; // ライトの強度
  //   vec3 lightPosition = vec3(0.0, -1.0, -0.25); // ライトの位置
  //   vec3 lightDirection = vec3(0.0, 0.0, 1.0); // ライトの方向

  //   fragColor = vec4(0.0, 1.0, 0.0, 1.0);
  vec3 normal = normalize(wNormal);

  // 頂点からライトへのベクトル
  vec3 toLightDir = normalize(lightPosition - worldPosition);

  vec3 fixLightDirection = vec3(-lightDirection.x, -lightDirection.y, lightDirection.z);
  // ライトの方向とライトから頂点へのベクトルのコサイン角度
  float theta = dot(toLightDir, normalize(fixLightDirection));

  // 照明強度の計算（スポットライトの減衰を含む）
  float epsilon = lightCutoff - lightOuterCutoff;
  float intensity = clamp((theta - lightOuterCutoff) / epsilon, 0.0, 1.0);

  // ランバート照明（拡散反射）計算
  float diffuse = max(dot(normal, toLightDir), 0.0);

  // ライトの最終強度を計算
  vec3 result = lightColor * diffuse * intensity * lightIntensity;

  fragColor = vec4(result, intensity);
}
