import * as THREE from 'three';
import terrainVertexShader from '../shaders/terrain.vert.js';
import terrainFragmentShader from '../shaders/terrain.frag.js';
import waterVertexShader from '../shaders/water.vert.js';
import waterFragmentShader from '../shaders/water.frag.js';

// Texture cache to avoid redundant loads
const textureCache = new Map();

// Default Poly Haven PBR texture URLs
const DEFAULT_ALBEDO_URL = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/brown_mud_leaves_01/brown_mud_leaves_01_diff_4k.jpg';
const DEFAULT_NORMAL_URL = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/brown_mud_leaves_01/brown_mud_leaves_01_nor_gl_4k.jpg';
const DEFAULT_ROUGHNESS_URL = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/brown_mud_leaves_01/brown_mud_leaves_01_rough_4k.jpg';
const DEFAULT_DISPLACEMENT_URL = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/brown_mud_leaves_01/brown_mud_leaves_01_disp_4k.jpg';

/**
 * Loads the default Poly Haven PBR textures for terrain.
 * @returns {Promise<{albedoMap: THREE.Texture, normalMap: THREE.Texture, roughnessMap: THREE.Texture, displacementMap: THREE.Texture}>}
 */
export async function loadDefaultTerrainTextures() {
    const [albedoMap, normalMap, roughnessMap, displacementMap] = await Promise.all([
        loadTexture(DEFAULT_ALBEDO_URL, { repeat: true }),
        loadTexture(DEFAULT_NORMAL_URL, { repeat: true }),
        loadTexture(DEFAULT_ROUGHNESS_URL, { repeat: true }),
        loadTexture(DEFAULT_DISPLACEMENT_URL, { repeat: true })
    ]);
    return { albedoMap, normalMap, roughnessMap, displacementMap };
}

/**
 * Loads the default PBR textures and creates a terrain material with them.
 * @param {object} params - Additional material params (optional)
 * @returns {Promise<THREE.ShaderMaterial>}
 */
export async function createTexturedTerrainMaterial(params = {}) {
    const textures = await loadDefaultTerrainTextures();
    return createTerrainMaterial({
        ...params,
        ...textures,
        displacementScale: params.displacementScale || 0.2
    });
}

export const createTerrainMaterial = (params = {}) => {
    const {
        heightScale = 0.5,
        rockHeight = 0.6,
        moistureScale = 0.8,
        moistureNoiseScale = 0.05,
        terrainBlendSharpness = 1.5,
        normalStrength = 0.5,
        specularIntensity = 0.3,
        roughness = 0.7,
        detailScale = 0.1,
        microDetailScale = 0.5,
        textureResolution = 1.0,
        gravelIntensity = 0.5,
        gravelScale = 12.0,
        sedimentCurvatureIntensity = 0.5,
        snowHeight = 0.8,
        snowSharpness = 1.0,
        vegetationDensity = 0.7,
        rockVariation = 0.2,
        albedoMap = null,
        normalMap = null,
        roughnessMap = null,
        displacementMap = null,
        displacementScale = 0.2,
        textureScale = 1.0,
        normalMapStrength = 1.0,
        roughnessMultiplier = 1.0,
        albedoIntensity = 0.6
    } = params;

    // Enable defines if maps are provided
    const defines = {};
    if (albedoMap) defines.USE_ALBEDOMAP = '';
    if (normalMap) defines.USE_NORMALMAP = '';
    if (roughnessMap) defines.USE_ROUGHNESSMAP = '';
    if (displacementMap) defines.USE_DISPLACEMENTMAP = '';

    const material = new THREE.ShaderMaterial({
        uniforms: {
            heightScale: { value: heightScale },
            rockHeight: { value: rockHeight },
            moistureScale: { value: moistureScale },
            moistureNoiseScale: { value: moistureNoiseScale },
            terrainBlendSharpness: { value: terrainBlendSharpness },
            normalStrength: { value: normalStrength },
            specularIntensity: { value: specularIntensity },
            roughness: { value: roughness },
            detailScale: { value: detailScale },
            microDetailScale: { value: microDetailScale },
            textureResolution: { value: textureResolution },
            gravelIntensity: { value: gravelIntensity },
            gravelScale: { value: gravelScale },
            sedimentCurvatureIntensity: { value: sedimentCurvatureIntensity },
            snowHeight: { value: snowHeight },
            snowSharpness: { value: snowSharpness },
            vegetationDensity: { value: vegetationDensity },
            rockVariation: { value: rockVariation },
            albedoMap: { value: albedoMap },
            normalMap: { value: normalMap },
            roughnessMap: { value: roughnessMap },
            displacementMap: { value: displacementMap },
            displacementScale: { value: displacementScale },
            textureScale: { value: textureScale },
            normalMapStrength: { value: normalMapStrength },
            roughnessMultiplier: { value: roughnessMultiplier },
            albedoIntensity: { value: albedoIntensity }
        },
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragmentShader,
        defines,
        side: THREE.DoubleSide
    });
    return material;
};

export const createWaterPlane = (size, params = {}) => {
    const {
        waterLevel = 0.0,
        waterColor = new THREE.Color(0x0077be),
        segments = 32,
        useLOD = true,
        waterOpacity = 0.4 // Default to 40% opacity
    } = params;

    const createWaterGeometry = (segments) => new THREE.PlaneGeometry(size, size, segments, segments);
    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -waterLevel + 0.01);
    let colorObj;
    if (typeof waterColor === 'string') {
        // Ensure color string starts with #
        colorObj = new THREE.Color(waterColor.startsWith('#') ? waterColor : `#${waterColor}`);
    } else if (waterColor && typeof waterColor.toArray === 'function') {
        colorObj = waterColor;
    } else {
        colorObj = new THREE.Color(0x0077be);
    }

    const waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
            waterColor: { value: colorObj.toArray() },
            waterOpacity: { value: waterOpacity }
        },
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        clippingPlanes: [clippingPlane],
        clipShadows: true,
        depthWrite: false,
        depthTest: true
    });

    let waterPlane;
    if (useLOD) {
        const lod = new THREE.LOD();
        const highDetail = new THREE.Mesh(createWaterGeometry(segments), waterMaterial);
        highDetail.rotation.x = -Math.PI / 2;
        highDetail.position.y = waterLevel;
        highDetail.renderOrder = 0;
        lod.addLevel(highDetail, 0);
        waterPlane = lod;
    } else {
        waterPlane = new THREE.Mesh(createWaterGeometry(segments), waterMaterial);
        waterPlane.rotation.x = -Math.PI / 2;
        waterPlane.position.y = waterLevel;
        waterPlane.renderOrder = 0;
    }

    return waterPlane;
};

export const loadTexture = async (url, options = {}) => {
    if (textureCache.has(url)) {
        return textureCache.get(url);
    }
    const {
        repeat = true,
        anisotropy = 4,
        minFilter = THREE.LinearMipMapLinearFilter,
        magFilter = THREE.LinearFilter
    } = options;
    const textureLoader = new THREE.TextureLoader();
    return new Promise((resolve, reject) => {
        textureLoader.load(
            url,
            (texture) => {
                if (repeat) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                }
                texture.anisotropy = anisotropy;
                texture.minFilter = minFilter;
                texture.magFilter = magFilter;
                texture.needsUpdate = true;
                textureCache.set(url, texture); // Cache the loaded texture
                resolve(texture);
            },
            undefined,
            (error) => {
                console.error('Error loading texture:', error);
                reject(error);
            }
        );
    });
}; 