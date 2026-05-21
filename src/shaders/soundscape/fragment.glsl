uniform vec3 colorLeftTop;
uniform vec3 colorLeftBottom;
uniform vec3 colorRightTop;
uniform vec3 colorRightBottom;
uniform vec3 uBboxMin;
uniform vec3 uBboxMax;
uniform float uGradientLeftToRight;
uniform float uRoughness;      // 0.0 = sharp mirror-like, 1.0 = very rough
uniform float uRoughnessPower; // scales the range
uniform vec3 uCameraPosition;  // pass from Three.js camera.position

varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
    float bboxWidth = max(uBboxMax.x - uBboxMin.x, 0.0001);
    float bboxDepth = max(uBboxMax.z - uBboxMin.z, 0.0001);
    float bboxHeight = max(uBboxMax.y - uBboxMin.y, 0.0001);
    float normalizedWidth = (vWorldPosition.x - uBboxMin.x) / bboxWidth;
    float normalizedDepth = (vWorldPosition.z - uBboxMin.z) / bboxDepth;
    float normalizedHeight = (vWorldPosition.y - uBboxMin.y) / bboxHeight;
    normalizedWidth = clamp(normalizedWidth, 0.0, 1.0);
    normalizedDepth = clamp(normalizedDepth, 0.0, 1.0);
    normalizedHeight = clamp(normalizedHeight, 0.0, 1.0);
    float backToFrontBlend = 1.0 - normalizedDepth;
    float horizontalBlend = mix(backToFrontBlend, normalizedWidth, uGradientLeftToRight);
    vec3 leftColor = mix(colorLeftBottom, colorLeftTop, normalizedHeight);
    vec3 rightColor = mix(colorRightBottom, colorRightTop, normalizedHeight);
    vec3 baseColor = mix(leftColor, rightColor, horizontalBlend);
    
    // World-space normal & view direction
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

    // Lights
    vec3 lightDir1 = normalize(vec3(-10.0, -10.0, -5.0));
    // vec3 lightDir2 = normalize(vec3(10.0, 10.0, 0.0));

    // Ambient
    vec3 ambient = 1.2 * baseColor;

    // Roughness -> shininess mapping

    float maxShininess = 512.0;   // maximum sharpness
    float minShininess = 2.0;     // minimum softness
    float shininess = mix(maxShininess, minShininess, pow(uRoughness, uRoughnessPower));

    // Diffuse + specular from both lights
    vec3 totalLight = vec3(0.0);

    // Light 1
    float diff1 = max(dot(normal, lightDir1), 0.0);
    vec3 halfDir1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, halfDir1), 0.1), shininess);
    totalLight += diff1 * baseColor + spec1 * vec3(0.3);

    // // Light 2
    // float diff2 = max(dot(normal, lightDir2), 0.0);
    // vec3 halfDir2 = normalize(lightDir2 + viewDir);
    // float spec2 = pow(max(dot(normal, halfDir2), 0.0), shininess);
    // totalLight += diff2 * baseColor + spec2 * vec3(1.0);

    // Final color
    gl_FragColor = vec4(ambient + totalLight, 1.0);
}
