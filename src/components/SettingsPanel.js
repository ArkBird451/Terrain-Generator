import React from 'react';
import PropTypes from 'prop-types';
import ParameterControl from './ParameterControl';
import { FaMountain, FaSlidersH, FaWater, FaLeaf, FaLayerGroup, FaEraser, FaMagic, FaPalette } from 'react-icons/fa';
import ScatterLayerCard from './ScatterLayerCard';

// Memoized CollapsibleSection component
const CollapsibleSection = React.memo(({ title, children, defaultOpen = true, icon }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{
      marginBottom: 18,
      borderRadius: 12,
      background: 'rgba(40,40,50,0.97)',
      boxShadow: open ? '0 2px 12px 0 rgba(0,0,0,0.10)' : 'none',
      border: open ? '1.5px solid #444' : '1.5px solid #333',
      transition: 'box-shadow 0.2s, border 0.2s',
      overflow: 'hidden'
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          padding: '14px 18px', fontWeight: 600, fontSize: 17,
          background: open ? 'linear-gradient(90deg, #23243a 60%, #23243a00)' : 'rgba(35,36,58,0.7)',
          color: open ? '#fff' : '#aaa',
          borderBottom: open ? '1px solid #333' : 'none',
          userSelect: 'none',
          letterSpacing: 0.2
        }}
      >
        {icon}
        {title}
        <span style={{ marginLeft: 'auto', fontSize: 18, color: '#6ec1e4', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
      </div>
      <div style={{ display: open ? 'block' : 'none', padding: '18px 18px 8px 18px' }}>
        {children}
      </div>
    </div>
  );
});

CollapsibleSection.displayName = 'CollapsibleSection';

// eslint-disable-next-line no-unused-vars
const SettingsPanel = React.memo(({ params, onParamChange, onReset }) => {
  const handleParamChange = (key, value) => {
    onParamChange(key, value);
  };

  const sectionIcons = {
    'Terrain Shape': <FaSlidersH style={{ marginRight: 8, color: '#6ec1e4' }} />,
    'Elevation': <FaMountain style={{ marginRight: 8, color: '#e4b06e' }} />,
    'Ridged Noise': <FaMagic style={{ marginRight: 8, color: '#b06ee4' }} />,
    'Domain Warping': <FaLayerGroup style={{ marginRight: 8, color: '#6ee4b0' }} />,
    'Erosion': <FaEraser style={{ marginRight: 8, color: '#e46e6e' }} />,
    'Smoothing': <FaLeaf style={{ marginRight: 8, color: '#6ee4b0' }} />,
    'Surface & Texture': <FaPalette style={{ marginRight: 8, color: '#e46ec1' }} />,
    'Water': <FaWater style={{ marginRight: 8, color: '#6ec1e4' }} />,
    'Scatter Layers': <FaLayerGroup style={{ marginRight: 8, color: '#e4b06e' }} />
  };

  // Memoize options arrays
  const erosionTypeOptions = React.useMemo(() => [
    { value: 'thermal', label: 'Thermal' },
    { value: 'hydraulic', label: 'Hydraulic' },
    { value: 'both', label: 'Both' }
  ], []);

  // Helper to update a scatter layer property
  const updateScatterLayer = (layers, idx, changes) => {
    const newLayers = layers.slice();
    newLayers[idx] = { ...newLayers[idx], ...changes };
    return newLayers;
  };

  return (
    <div
      ref={panelRef => {
        if (panelRef) {
          // Restore scroll position after render
          if (typeof window !== 'undefined' && window.__settingsPanelScroll !== undefined) {
            panelRef.scrollTop = window.__settingsPanelScroll;
          }
        }
      }}
      onScroll={e => {
        if (typeof window !== 'undefined') {
          window.__settingsPanelScroll = e.currentTarget.scrollTop;
        }
      }}
      style={{
        width: 'min(98vw, 340px)',
        minWidth: 240,
        maxWidth: 400,
        height: '100vh',
        padding: 0,
        background: 'linear-gradient(160deg, #23243a 0%, #23243a 60%, #23243aee 100%)',
        overflowY: 'auto',
        borderRight: '1.5px solid #333',
        fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
        fontSize: 15,
        color: '#f3f3f3',
        boxShadow: '2px 0 16px 0 rgba(0,0,0,0.10)',
        position: 'relative',
        zIndex: 10
      }}
    >
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'linear-gradient(90deg, #23243a 80%, #23243a00)',
        padding: '22px 20px 10px 20px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1.5px solid #333',
        marginBottom: 8
      }}>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: 22, letterSpacing: 0.5, color: '#6ec1e4', flex: 1 }}>Terrain Settings</h2>
        <button
          onClick={onReset}
          style={{
            padding: '7px 14px',
            background: 'linear-gradient(90deg, #444 60%, #6ec1e4 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            marginLeft: 8,
            boxShadow: '0 2px 8px 0 rgba(110,193,228,0.08)',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #6ec1e4 60%, #444 100%)'}
          onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg, #444 60%, #6ec1e4 100%)'}
        >
          Reset
        </button>
      </div>

      <div style={{ padding: '0 8px 32px 8px' }}>
        <CollapsibleSection title="Terrain Shape" icon={sectionIcons['Terrain Shape']}>
          <ParameterControl label="Size" type="range" min="2" max="100" step="1" value={params.size} onChange={v => {
            handleParamChange('size', +v);
            handleParamChange('width', +v);
            handleParamChange('height', +v);
          }} description="Controls both width and height of the terrain." />
          <ParameterControl label="Mesh Resolution" type="range" min="32" max="4096" step="32" value={params.meshResolution || 512} onChange={v => handleParamChange('meshResolution', +v)} description="Controls mesh grid resolution for preview/export (higher = slower)." />
          <ParameterControl label="Use Export Resolution" type="checkbox" value={params.useExportResolution || false} onChange={v => handleParamChange('useExportResolution', v)} description="Toggle to preview at full export resolution (4096²)." />
        </CollapsibleSection>
        <CollapsibleSection title="Elevation" icon={sectionIcons['Elevation']}>
          <ParameterControl label="Height Range" type="range" min="0" max="5" step="0.1" value={params.amplitude} onChange={v => handleParamChange('amplitude', +v)} description="Maximum elevation difference." />
          <ParameterControl label="Octaves" type="range" min="1" max="12" step="1" value={params.octaves} onChange={v => handleParamChange('octaves', +v)} />
          <ParameterControl label="Lacunarity" type="range" min="1" max="4" step="0.1" value={params.lacunarity} onChange={v => handleParamChange('lacunarity', +v)} />
          <ParameterControl label="Gain" type="range" min="0" max="1" step="0.05" value={params.gain} onChange={v => handleParamChange('gain', +v)} />
        </CollapsibleSection>
        <CollapsibleSection title="Ridged Noise" icon={sectionIcons['Ridged Noise']} defaultOpen={false}>
          <ParameterControl label="Ridged" type="checkbox" value={params.ridged} onChange={v => handleParamChange('ridged', v)} />
          <ParameterControl label="Ridged Offset" type="range" min="0" max="1" step="0.1" value={params.ridgedOffset} onChange={v => handleParamChange('ridgedOffset', +v)} />
        </CollapsibleSection>
        <CollapsibleSection title="Worley Noise" icon={sectionIcons['Worley Noise']} defaultOpen={false}>
          <ParameterControl 
            label="Points" 
            type="range" 
            min="128" 
            max="4096" 
            step="128" 
            value={params.worleyPoints || 512} 
            onChange={v => handleParamChange('worleyPoints', +v)} 
            description="Number of points for Worley noise generation." 
          />
          <ParameterControl 
            label="Weight" 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            value={params.worleyWeight || 0.5} 
            onChange={v => handleParamChange('worleyWeight', +v)} 
            description="Weight of Worley noise in the final terrain." 
          />
          <ParameterControl 
            label="Seed" 
            type="number" 
            min="0" 
            max="999999" 
            step="1" 
            value={params.worleySeed || Math.floor(Math.random() * 1000)} 
            onChange={v => handleParamChange('worleySeed', +v)} 
            description="Seed for Worley noise randomization." 
          />
        </CollapsibleSection>
        <CollapsibleSection title="Domain Warping" icon={sectionIcons['Domain Warping']} defaultOpen={false}>
          <ParameterControl label="Use Domain Warp" type="checkbox" value={params.useDomainWarp} onChange={v => handleParamChange('useDomainWarp', v)} />
          <ParameterControl label="Warp Type" type="select" value={params.warpType} onChange={v => handleParamChange('warpType', v)} options={[
            { value: 'fractal', label: 'Fractal' },
            { value: 'simplex', label: 'Simplex' }
          ]} />
          <ParameterControl label="Warp Strength" type="range" min="0" max="1" step="0.05" value={params.warpStrength} onChange={v => handleParamChange('warpStrength', +v)} />
          <ParameterControl label="Warp Frequency" type="range" min="0" max="1" step="0.05" value={params.warpFrequency} onChange={v => handleParamChange('warpFrequency', +v)} />
          <ParameterControl label="Warp Iterations" type="range" min="1" max="5" step="1" value={params.warpIterations} onChange={v => handleParamChange('warpIterations', +v)} />
        </CollapsibleSection>
        <CollapsibleSection title="Smoothing" icon={sectionIcons['Smoothing']} defaultOpen={false}>
          <ParameterControl label="Enable Smoothing" type="checkbox" value={params.applySmoothing} onChange={v => handleParamChange('applySmoothing', v)} description="Smooth out sharp terrain features." />
          <ParameterControl label="Smoothing Passes" type="range" min="0" max="10" step="1" value={params.smoothIterations} onChange={v => handleParamChange('smoothIterations', +v)} description="Number of smoothing passes." />
          <ParameterControl label="Smoothing Strength" type="range" min="0" max="1" step="0.05" value={params.smoothFactor} onChange={v => handleParamChange('smoothFactor', +v)} description="How much each pass smooths the terrain." />
        </CollapsibleSection>
        <CollapsibleSection title="Surface & Texture" icon={sectionIcons['Surface & Texture']}>
          <ParameterControl label="Height Scale" type="range" min={0.1} max={5.0} step={0.1} value={params.heightScale} onChange={value => handleParamChange('heightScale', +value)} description="Controls the exaggeration of height in the texture." />
          <ParameterControl label="Rock Height" type="range" min={0.1} max={1.0} step={0.1} value={params.rockHeight} onChange={value => handleParamChange('rockHeight', +value)} description="Height at which rock texture appears." />
          <ParameterControl label="Blend Sharpness" type="range" min={0.1} max={5.0} step={0.1} value={params.terrainBlendSharpness} onChange={value => handleParamChange('terrainBlendSharpness', +value)} description="How sharp the transitions are between textures." />
          <ParameterControl label="Moisture Scale" type="range" min={0.1} max={5.0} step={0.1} value={params.moistureScale} onChange={value => handleParamChange('moistureScale', +value)} description="Controls the amount of green (vegetation) in the texture." />
          <ParameterControl label="Moisture Noise" type="range" min={0.01} max={1.0} step={0.01} value={params.moistureNoiseScale} onChange={value => handleParamChange('moistureNoiseScale', +value)} description="Adds randomness to the moisture map." />
          <ParameterControl label="Texture Resolution" type="range" min={0.5} max={6.0} step={0.1} value={params.textureResolution || 1.0} onChange={value => handleParamChange('textureResolution', +value)} description="Controls the sharpness of the texture." />
          <ParameterControl label="Albedo Intensity" type="range" min={0} max={1} step={0.01} value={params.albedoIntensity || 0.6} onChange={value => handleParamChange('albedoIntensity', +value)} description="Blend between procedural and texture color (0 = procedural, 1 = texture)." />
        </CollapsibleSection>
        <CollapsibleSection title="Water" icon={sectionIcons['Water']} defaultOpen={false}>
          <ParameterControl label="Enable Water" type="checkbox" value={params.enableWater} onChange={value => handleParamChange('enableWater', +value)} description="Add a water plane at a given height." />
          <ParameterControl label="Water Level" type="range" min={0} max={1} step={0.01} value={params.waterLevel} onChange={value => handleParamChange('waterLevel', +value)} description="Height of the water plane." />
        </CollapsibleSection>
        <CollapsibleSection title="Scatter Layers" icon={sectionIcons['Scatter Layers']}>
          {(() => {
            const scatterLayers = Array.isArray(params.scatterLayers) ? params.scatterLayers : [];
            return scatterLayers.map((layer, idx) => (
              <ScatterLayerCard
                key={layer.id}
                layer={layer}
                idx={idx}
                layers={scatterLayers}
                onParamChange={handleParamChange}
                updateScatterLayer={updateScatterLayer}
                params={params}
              />
            ));
          })()}
          <div style={{ position: 'relative', marginTop: 8 }}>
            <button
              onClick={() => {
                const scatterLayers = Array.isArray(params.scatterLayers) ? params.scatterLayers : [];
                const nextId = scatterLayers.length > 0 ? Math.max(...scatterLayers.map(l => l.id)) + 1 : 1;
                const newLayer = {
                  id: nextId,
                  enabled: true,
                  label: `Layer ${nextId}`,
                  objectType: 'tree',
                  scatterOn: 'all',
                  density: 0.2,
                  pointRadius: 2,
                  scale: 0.2,
                  jitter: 0.4,
                  maxSlopeDeg: 45,
                  maskThreshold: 0.5,
                  seed: 42,
                  debug: false,
                  maxPoints: 2000
                };
                handleParamChange('scatterLayers', [...scatterLayers, newLayer]);
              }}
              style={{
                position: 'absolute',
                right: 0,
                bottom: -16,
                background: 'linear-gradient(90deg, #6ec1e4 60%, #e4b06e 100%)',
                color: '#23243a',
                border: 'none',
                borderRadius: '50%',
                width: 44,
                height: 44,
                fontSize: 28,
                fontWeight: 900,
                boxShadow: '0 2px 8px 0 rgba(110,193,228,0.18)',
                cursor: 'pointer',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, box-shadow 0.2s',
              }}
              title="Add Scatter Layer"
            >
              +
            </button>
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="Erosion" icon={sectionIcons['Erosion']}>
          <ParameterControl label="Erosion Droplets" type="number" min={1000} max={1000000} step={1000} value={params.erosionDroplets || 100000} onChange={v => handleParamChange('erosionDroplets', +v)} description="Number of droplets to simulate." />
          <ParameterControl label="Batch Size" type="number" min={100} max={10000} step={100} value={params.erosionBatchSize || 1000} onChange={v => handleParamChange('erosionBatchSize', +v)} description="Update mesh every N droplets." />
          <ParameterControl label="Inertia" type="range" min={0} max={1} step={0.01} value={params.erosionInertia ?? 0.05} onChange={v => handleParamChange('erosionInertia', +v)} description="Droplet inertia (0 = follows slope, 1 = keeps direction)." />
          <ParameterControl label="Friction" type="range" min={0} max={0.2} step={0.001} value={params.erosionFriction ?? 0.02} onChange={v => handleParamChange('erosionFriction', +v)} description="Velocity loss per step." />
          <ParameterControl label="Sediment Capacity" type="range" min={0.1} max={16} step={0.1} value={params.erosionSedimentCapacity ?? 4} onChange={v => handleParamChange('erosionSedimentCapacity', +v)} description="Sediment capacity factor." />
          <ParameterControl label="Deposition Rate" type="range" min={0.01} max={1} step={0.01} value={params.erosionDepositionRate ?? 0.3} onChange={v => handleParamChange('erosionDepositionRate', +v)} description="How quickly sediment is deposited/eroded." />
          <ParameterControl label="Evaporation Rate" type="range" min={0.001} max={0.2} step={0.001} value={params.erosionEvaporationRate ?? 0.01} onChange={v => handleParamChange('erosionEvaporationRate', +v)} description="Water evaporation rate per step." />
          <ParameterControl label="Min Volume" type="range" min={0.001} max={0.2} step={0.001} value={params.erosionMinVolume ?? 0.01} onChange={v => handleParamChange('erosionMinVolume', +v)} description="Volume below which droplet disappears." />
          <ParameterControl label="Initial Volume" type="range" min={0.1} max={5} step={0.1} value={params.erosionInitialVolume ?? 0.1} onChange={v => handleParamChange('erosionInitialVolume', +v)} description="Starting water volume of each droplet." />
          <ParameterControl label="Initial Speed" type="range" min={0.1} max={5} step={0.1} value={params.erosionInitialSpeed ?? 1.0} onChange={v => handleParamChange('erosionInitialSpeed', +v)} description="Starting speed of each droplet." />
          <ParameterControl label="Max Droplet Lifetime" type="number" min={1} max={100} step={1} value={params.erosionMaxDropletLifetime ?? 30} onChange={v => handleParamChange('erosionMaxDropletLifetime', +v)} description="Max steps per droplet." />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <button
              onClick={() => params.onStartErosion && params.onStartErosion()}
              style={{
                padding: '8px 18px',
                background: 'linear-gradient(90deg, #e46e6e 60%, #6ec1e4 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                fontWeight: 700,
                fontSize: 15,
                cursor: params.erosionRunning ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px 0 rgba(110,193,228,0.08)',
                transition: 'background 0.2s, box-shadow 0.2s',
                opacity: params.erosionRunning ? 0.5 : 1
              }}
              disabled={params.erosionRunning}
            >
              Start Erosion
            </button>
            <button
              onClick={() => params.onStopErosion && params.onStopErosion()}
              style={{
                padding: '8px 18px',
                background: 'linear-gradient(90deg, #6ec1e4 60%, #e46e6e 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                fontWeight: 700,
                fontSize: 15,
                cursor: !params.erosionRunning ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px 0 rgba(110,193,228,0.08)',
                transition: 'background 0.2s, box-shadow 0.2s',
                opacity: !params.erosionRunning ? 0.5 : 1
              }}
              disabled={!params.erosionRunning}
            >
              Stop Erosion
            </button>
            {params.onResetErosion && (
              <button
                onClick={() => params.onResetErosion()}
                style={{
                  padding: '8px 18px',
                  background: 'linear-gradient(90deg, #e46e6e 60%, #fff 100%)',
                  color: '#23243a',
                  border: 'none',
                  borderRadius: '7px',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px 0 rgba(110,193,228,0.08)',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
              >
                Reset Erosion
              </button>
            )}
            {params.erosionProgress !== undefined && (
              <div style={{ flex: 1, height: 18, background: '#23243a', borderRadius: 8, overflow: 'hidden', minWidth: 80 }}>
                <div style={{ width: `${params.erosionProgress * 100}%`, height: '100%', background: '#e46e6e', transition: 'width 0.2s' }} />
              </div>
            )}
            {params.erosionProgress !== undefined && (
              <span style={{ color: '#e46e6e', fontWeight: 600, fontSize: 14, marginLeft: 8 }}>{Math.round(params.erosionProgress * 100)}%</span>
            )}
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="Talus Formation">
          <ParameterControl 
            label="Enable Talus Formation" 
            type="checkbox" 
            value={params.useTalusFormation ?? true} 
            onChange={v => handleParamChange('useTalusFormation', v)} 
            description="Enable talus formation for more realistic slopes." 
          />
          <ParameterControl 
            label="Talus Formation Rate" 
            type="range" 
            min={0.01} 
            max={0.5} 
            step={0.01} 
            value={params.talusFormationRate ?? 0.15} 
            onChange={v => handleParamChange('talusFormationRate', +v)} 
            description="Rate at which talus forms on steep slopes." 
          />
          <ParameterControl 
            label="Talus Particle Size" 
            type="range" 
            min={0.01} 
            max={0.5} 
            step={0.01} 
            value={params.talusParticleSize ?? 0.1} 
            onChange={v => handleParamChange('talusParticleSize', +v)} 
            description="Size of talus particles." 
          />
          <ParameterControl 
            label="Talus Stability" 
            type="range" 
            min={0.1} 
            max={1.0} 
            step={0.05} 
            value={params.talusStabilityFactor ?? 0.8} 
            onChange={v => handleParamChange('talusStabilityFactor', +v)} 
            description="Stability factor for talus formation." 
          />
          <ParameterControl 
            label="Min Slope Angle" 
            type="range" 
            min={15} 
            max={35} 
            step={1} 
            value={params.talusMinSlope ?? 25} 
            onChange={v => handleParamChange('talusMinSlope', +v)} 
            description="Minimum slope angle for talus formation (degrees)." 
          />
          <ParameterControl 
            label="Max Slope Angle" 
            type="range" 
            min={35} 
            max={60} 
            step={1} 
            value={params.talusMaxSlope ?? 45} 
            onChange={v => handleParamChange('talusMaxSlope', +v)} 
            description="Maximum slope angle for talus formation (degrees)." 
          />
          <ParameterControl 
            label="Max Talus Height" 
            type="range" 
            min={0.1} 
            max={2.0} 
            step={0.1} 
            value={params.talusMaxHeight ?? 0.5} 
            onChange={v => handleParamChange('talusMaxHeight', +v)} 
            description="Maximum height of talus deposits." 
          />
        </CollapsibleSection>
      </div>
    </div>
  );
});

SettingsPanel.propTypes = {
  params: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    widthSegments: PropTypes.number.isRequired,
    heightSegments: PropTypes.number.isRequired,
    amplitude: PropTypes.number.isRequired,
    frequency: PropTypes.number.isRequired,
    octaves: PropTypes.number.isRequired,
    lacunarity: PropTypes.number.isRequired,
    gain: PropTypes.number.isRequired,
    ridged: PropTypes.bool.isRequired,
    ridgedOffset: PropTypes.number.isRequired,
    useDomainWarp: PropTypes.bool.isRequired,
    warpType: PropTypes.string.isRequired,
    warpStrength: PropTypes.number.isRequired,
    warpFrequency: PropTypes.number.isRequired,
    warpIterations: PropTypes.number.isRequired,
    applySmoothing: PropTypes.bool.isRequired,
    smoothIterations: PropTypes.number.isRequired,
    smoothFactor: PropTypes.number.isRequired,
    heightScale: PropTypes.number.isRequired,
    rockHeight: PropTypes.number.isRequired,
    terrainBlendSharpness: PropTypes.number.isRequired,
    moistureScale: PropTypes.number.isRequired,
    moistureNoiseScale: PropTypes.number.isRequired,
    textureResolution: PropTypes.number.isRequired,
    gravelIntensity: PropTypes.number.isRequired,
    gravelScale: PropTypes.number.isRequired,
    sedimentCurvatureIntensity: PropTypes.number.isRequired,
    enableWater: PropTypes.bool.isRequired,
    waterLevel: PropTypes.number.isRequired,
    scatterLayers: PropTypes.array.isRequired
  }).isRequired,
  onParamChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired
};

SettingsPanel.displayName = 'SettingsPanel';

export default SettingsPanel; 