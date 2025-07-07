const terrainFragmentShader = `
float hash(vec2 p) {
    p = 50.0 * fract(p * 0.3183099 + vec2(0.71, 0.113));
    return -1.0 + 2.0 * fract(p.x * p.y * (p.x + p.y));
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Improved cubic interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    vec2 u2 = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // Quintic interpolation
    
    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float ridgedNoise(vec2 p) {
    float n = noise(p);
    float ridge = 1.0 - abs(n * 2.0 - 1.0);
    return ridge * ridge; // Sharper ridges
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float lacunarity = 2.0;
    float persistence = 0.5;
    
    for(int i = 0; i < 8; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    return value;
}

float ridgedFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float lacunarity = 2.0;
    float persistence = 0.5;
    
    for(int i = 0; i < 7; i++) {
        value += amplitude * ridgedNoise(p * frequency);
        frequency *= lacunarity;
        amplitude *= persistence;
    }
    return value;
}

float voronoi(vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    float minDist = 1.0;
    for(int j=-1; j<=1; j++) {
        for(int i=-1; i<=1; i++) {
            vec2 b = vec2(i, j);
            vec2 r = b - f + hash(p + b);
            float d = dot(r, r);
            minDist = min(minDist, d);
        }
    }
    return sqrt(minDist);
}

// Enhanced material parameters
uniform float heightScale;
uniform float rockHeight;
uniform float moistureScale;
uniform float moistureNoiseScale;
uniform float terrainBlendSharpness;
uniform float normalStrength;
uniform float specularIntensity;
uniform float roughness;
uniform float detailScale;
uniform float microDetailScale;
uniform float textureResolution;
uniform float gravelIntensity;
uniform float gravelScale;
uniform float sedimentCurvatureIntensity;
uniform float snowHeight;
uniform float snowSharpness;
uniform float vegetationDensity;
uniform float rockVariation;
uniform float textureScale;
uniform float normalMapStrength;
uniform float roughnessMultiplier;
uniform float albedoIntensity;

uniform sampler2D albedoMap;
uniform sampler2D normalMap;
uniform sampler2D roughnessMap;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vDisplacedPosition;
varying float vSlope;
varying vec2 vUv;
varying vec3 vTangent;
varying vec3 vBitangent;

float getMoisture(vec3 pos) {
    float baseMoisture = fbm(pos.xz * moistureNoiseScale);
    float slope = vSlope;
    float height = pos.y * heightScale;
    float heightFactor = 1.0 - smoothstep(0.2, 0.9, height);
    float valleyFactor = smoothstep(0.0, 0.3, height) * (1.0 - slope);
    float drainageFactor = 1.0 - smoothstep(0.15, 0.5, slope);
    float microClimate = fbm(pos.xz * 0.2) * 0.2;
    float seasonalVariation = sin(pos.x * 0.1 + pos.z * 0.1) * 0.1 + 0.9;
    float timeVariation = sin(pos.x * 0.05 + pos.z * 0.05) * 0.05 + 0.95;
    float moisture = baseMoisture * heightFactor * drainageFactor * seasonalVariation * timeVariation;
    moisture = mix(moisture, moisture * 1.2, valleyFactor);
    moisture += microClimate;
    return clamp(moisture * moistureScale, 0.0, 1.0);
}

float getProceduralHeight(vec3 pos) {
    return fbm(pos.xz * 0.08);
}

float getCurvatureLaplacian(vec3 pos) {
    float eps = 0.5;
    float h = getProceduralHeight(pos);
    float hN = getProceduralHeight(pos + vec3(0.0, 0.0, eps));
    float hS = getProceduralHeight(pos - vec3(0.0, 0.0, eps));
    float hE = getProceduralHeight(pos + vec3(eps, 0.0, 0.0));
    float hW = getProceduralHeight(pos - vec3(eps, 0.0, 0.0));
    return (4.0 * h - hN - hS - hE - hW);
}

vec3 getDetailedNormal(vec3 pos, float height) {
    float scale1 = detailScale * textureResolution;
    float scale2 = microDetailScale * textureResolution;
    float scale3 = gravelScale * textureResolution;
    float h1 = ridgedFbm(pos.xz * scale1);
    float h2 = ridgedFbm((pos.xz + vec2(0.1, 0.0)) * scale1);
    float h3 = ridgedFbm((pos.xz + vec2(0.0, 0.1)) * scale1);
    float m1 = fbm(pos.xz * scale2);
    float m2 = fbm((pos.xz + vec2(0.1, 0.0)) * scale2);
    float m3 = fbm((pos.xz + vec2(0.0, 0.1)) * scale2);
    float gravelN1 = voronoi(pos.xz * scale3);
    float gravelN2 = voronoi((pos.xz + vec2(0.1, 0.0)) * scale3);
    float gravelN3 = voronoi((pos.xz + vec2(0.0, 0.1)) * scale3);
    float primaryNormalStrength = normalStrength;
    float microNormalStrength = normalStrength * 0.3;
    float gravelNormalStrength = gravelIntensity * 0.4;
    vec3 normal = vec3(
        (h1 - h2) * primaryNormalStrength + 
        (m1 - m2) * microNormalStrength + 
        (gravelN1 - gravelN2) * gravelNormalStrength,
        normalStrength,
        (h1 - h3) * primaryNormalStrength + 
        (m1 - m3) * microNormalStrength + 
        (gravelN1 - gravelN3) * gravelNormalStrength
    );
    float slope = vSlope;
    normal.y += slope * 0.2;
    float heightFactor = smoothstep(0.0, 1.0, height * heightScale);
    normal.y += heightFactor * 0.1;
    return normalize(normal);
}

float getGravelMask(vec3 pos, float slope) {
    float scale = gravelScale * textureResolution;
    float v = voronoi(pos.xz * scale);
    float flatness = 1.0 - smoothstep(0.15, 0.5, slope);
    float heightFactor = smoothstep(0.0, 0.3, pos.y * heightScale);
    float moisture = getMoisture(pos);
    float moistureFactor = 1.0 - moisture * 0.5;
    float gravelMask = (1.0 - v) * flatness * gravelIntensity;
    gravelMask *= (1.0 + heightFactor * 0.3);
    gravelMask *= moistureFactor;
    return clamp(gravelMask, 0.0, 1.0);
}

float getDrainagePattern(vec3 pos) {
    float scale = 0.05;
    float pattern = 0.0;
    for(int i = 0; i < 4; i++) {
        float noise = fbm(pos.xz * scale);
        pattern += noise * (1.0 / float(i + 1));
        scale *= 2.0;
    }
    return pattern;
}

float getErosionFactor(vec3 pos, float slope) {
    float baseErosion = fbm(pos.xz * 0.1);
    float slopeErosion = smoothstep(0.25, 0.75, slope);
    float heightErosion = smoothstep(0.3, 0.8, pos.y * heightScale);
    float drainage = getDrainagePattern(pos);
    float windErosion = fbm(pos.xz * 0.05) * 0.3;
    float erosion = (baseErosion * 0.4 + slopeErosion * 0.3 + heightErosion * 0.2 + windErosion * 0.1);
    erosion *= (1.0 + drainage * 0.5);
    float temporalVariation = sin(pos.x * 0.02 + pos.z * 0.02) * 0.1 + 0.9;
    erosion *= temporalVariation;
    return clamp(erosion, 0.0, 1.0);
}

float getSnowCoverage(vec3 pos, float height, float slope) {
    float baseSnow = smoothstep(snowHeight - 0.1, snowHeight, height);
    float slopeFactor = 1.0 - smoothstep(0.0, 0.3, slope);
    float snowNoise = fbm(pos.xz * 0.1) * 0.1;
    return clamp(baseSnow * slopeFactor + snowNoise, 0.0, 1.0) * snowSharpness;
}

float getVegetationCoverage(vec3 pos, float height, float slope, float moisture) {
    float baseVegetation = smoothstep(0.1, 0.4, height) * (1.0 - smoothstep(0.4, 0.7, height));
    float slopeFactor = 1.0 - smoothstep(0.3, 0.7, slope);
    float moistureFactor = smoothstep(0.3, 0.7, moisture);
    float vegetationNoise = fbm(pos.xz * 0.2) * 0.2;
    return clamp(baseVegetation * slopeFactor * moistureFactor + vegetationNoise, 0.0, 1.0) * vegetationDensity;
}

vec3 getRockColor(vec3 pos, float height, float slope) {
    vec3 baseRockColor = vec3(0.5, 0.5, 0.5);
    float rockNoise = fbm(pos.xz * 0.1) * rockVariation;
    float heightFactor = smoothstep(rockHeight - 0.2, rockHeight, height);
    float slopeFactor = smoothstep(0.3, 0.7, slope);
    vec3 rockVariation = vec3(
        rockNoise * 0.1,
        rockNoise * 0.08,
        rockNoise * 0.12
    );
    return mix(baseRockColor, baseRockColor + rockVariation, heightFactor * slopeFactor);
}

vec3 getProceduralColor(vec3 pos, float height, float slope, vec3 normal) {
    float moisture = getMoisture(pos);
    float normalizedHeight = height * heightScale;
    float erosion = getErosionFactor(pos, slope);
    float snowCoverage = getSnowCoverage(pos, normalizedHeight, slope);
    float vegetationCoverage = getVegetationCoverage(pos, normalizedHeight, slope, moisture);
    vec3 sedimentColor = vec3(0.92, 0.87, 0.7);
    vec3 sandColor = vec3(0.85, 0.8, 0.65);
    vec3 grassColor = vec3(0.3, 0.5, 0.2);
    vec3 rockColor = getRockColor(pos, normalizedHeight, slope);
    vec3 snowColor = vec3(0.95, 0.95, 0.95);
    vec3 vegetationColor = vec3(0.2, 0.4, 0.1);
    grassColor = mix(grassColor, vec3(0.2, 0.4, 0.1), moisture * 0.5);
    rockColor = mix(rockColor, vec3(0.6, 0.58, 0.52), moisture * 0.3);
    sandColor = mix(sandColor, vec3(0.8, 0.75, 0.6), moisture * 0.2);
    float scaleDetail = detailScale * textureResolution;
    float scaleMicro = microDetailScale * textureResolution;
    float detail = fbm(pos.xz * scaleDetail);
    float microDetail = fbm(pos.xz * scaleMicro);
    float drainageDetail = getDrainagePattern(pos);
    sandColor += vec3(detail * 0.08) * (1.0 - erosion * 0.3);
    grassColor += vec3(detail * 0.05) * (1.0 - erosion * 0.2);
    rockColor += vec3(detail * 0.12) * (1.0 + erosion * 0.1);
    float slopeRock = smoothstep(0.4, 0.7, slope);
    float sandAmount = smoothstep(0.0, 0.15, normalizedHeight) * (1.0 - moisture * 0.4);
    float grassAmount = smoothstep(0.1, 0.4, normalizedHeight) * (1.0 - erosion * 0.3);
    float rockAmount = smoothstep(rockHeight - 0.2, rockHeight, normalizedHeight) * (1.0 + erosion * 0.2);
    vec3 color = mix(sandColor, grassColor, smoothstep(0.0, 1.0, grassAmount));
    color = mix(color, rockColor, smoothstep(0.0, 1.0, max(rockAmount, slopeRock)));
    color = mix(color, vegetationColor, vegetationCoverage * (1.0 - rockAmount));
    color = mix(color, snowColor, snowCoverage);
    color += vec3(microDetail * 0.04) * (1.0 - erosion * 0.2);
    float gravelMask = getGravelMask(pos, slope);
    vec3 gravelColor = vec3(0.6, 0.58, 0.52) + 
                      vec3(hash(pos.xz * 10.0) * 0.08) * 
                      (1.0 + drainageDetail * 0.3);
    color = mix(color, gravelColor, smoothstep(0.0, 1.0, gravelMask));
    float normalVariation = dot(normal, vec3(0.0, 1.0, 0.0)) * 0.1;
    color += vec3(normalVariation);
    return color;
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 pos = vDisplacedPosition;
    float height = pos.y;
    float slope = vSlope;
    float verticalThreshold = 0.35;
    bool isVertical = abs(normal.y) < verticalThreshold;
    vec3 sideColor = vec3(0.35, 0.28, 0.22);
    vec3 color;
    float rough = roughness;
    if (isVertical) {
        color = sideColor;
    } else {
        vec3 detailedNormal = getDetailedNormal(pos, height);
        mat3 TBN = mat3(normalize(vTangent), normalize(vBitangent), normal);
        normal = normalize(TBN * detailedNormal);
        color = getProceduralColor(pos, height, slope, normal);
    }
#ifdef USE_ALBEDOMAP
    vec3 texColor = texture2D(albedoMap, vUv * textureScale * textureResolution).rgb;
    color = mix(color, texColor, albedoIntensity);
#endif
#ifdef USE_ROUGHNESSMAP
    rough = mix(rough, texture2D(roughnessMap, vUv * textureScale * textureResolution).r, roughnessMultiplier);
#endif
#ifdef USE_NORMALMAP
    vec3 texNormal = texture2D(normalMap, vUv * textureScale * textureResolution).xyz * 2.0 - 1.0;
    normal = normalize(mix(normal, texNormal, 0.5 * normalMapStrength));
#endif
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    vec3 halfDir = normalize(lightDir + viewDir);
    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotH = max(dot(normal, halfDir), 0.0);
    float specular = pow(NdotH, 32.0) * specularIntensity * (1.0 - rough);
    float ao = 1.0 - slope * 0.5;
    color = color * (NdotL + 0.2) * ao;
    color += vec3(specular);
    gl_FragColor = vec4(color, 1.0);
}
`;
export default terrainFragmentShader; 