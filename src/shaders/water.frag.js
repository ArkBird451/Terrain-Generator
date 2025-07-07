const waterFragmentShader = `
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

uniform vec3 waterColor;
uniform float waterOpacity;

void main() {
    gl_FragColor = vec4(waterColor, waterOpacity);
}
`;
export default waterFragmentShader; 