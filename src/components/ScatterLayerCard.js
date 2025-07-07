import React from 'react';
import ParameterControl from './ParameterControl';
import { FaTrash } from 'react-icons/fa';

const ScatterLayerCard = React.memo(function ScatterLayerCard({ layer, idx, layers, onParamChange, updateScatterLayer, params }) {
  // Remove layer handler
  const handleRemove = () => {
    const newLayers = layers.slice();
    newLayers.splice(idx, 1);
    onParamChange('scatterLayers', newLayers);
  };

  // Update a property of this layer
  const update = changes => {
    onParamChange('scatterLayers', updateScatterLayer(layers, idx, changes));
  };

  return (
    <div
      style={{
        border: '2px solid #6ec1e4',
        borderRadius: '10px',
        marginBottom: '14px',
        padding: '14px 12px 10px 12px',
        background: layer.enabled ? '#232323' : '#181818',
        opacity: layer.enabled ? 1 : 0.5,
        position: 'relative',
        boxShadow: '0 2px 12px 0 rgba(110,193,228,0.10)',
        transition: 'border 0.2s, box-shadow 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={layer.enabled}
          onChange={e => update({ enabled: e.target.checked })}
          style={{ marginRight: 8 }}
        />
        <input
          type="text"
          value={layer.label}
          onChange={e => update({ label: e.target.value })}
          style={{ width: 90, marginRight: 8, background: 'transparent', color: '#fff', border: '1.5px solid #6ec1e4', borderRadius: 4, padding: '2px 6px', fontWeight: 600, fontSize: 15 }}
        />
        <select
          value={layer.objectType}
          onChange={e => update({ objectType: e.target.value })}
          style={{ marginRight: 8, borderRadius: 4, border: '1.5px solid #6ec1e4', background: '#181818', color: '#fff', fontWeight: 500 }}
        >
          <option value="tree">Tree</option>
          <option value="rock">Rock</option>
          <option value="grass">Grass</option>
        </select>
        <select
          value={layer.scatterOn}
          onChange={e => update({ scatterOn: e.target.value })}
          style={{ marginRight: 8, borderRadius: 4, border: '1.5px solid #6ec1e4', background: '#181818', color: '#fff', fontWeight: 500 }}
        >
          <option value="all">All Terrain</option>
          <option value="mountain">Mountains</option>
          <option value="valley">Valleys</option>
          <option value="plain">Plains</option>
        </select>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <button
          onClick={handleRemove}
          title="Remove this scatter layer"
          style={{
            background: 'linear-gradient(90deg, #e46e6e 60%, #fff 100%)',
            color: '#23243a',
            border: 'none',
            borderRadius: '50%',
            width: 38,
            height: 38,
            fontSize: 20,
            fontWeight: 900,
            boxShadow: '0 2px 8px 0 rgba(228,110,110,0.18)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, box-shadow 0.2s',
            outline: 'none',
          }}
        >
          <FaTrash style={{ fontSize: 18, color: '#e46e6e' }} />
        </button>
      </div>
      {/* Advanced controls (expand/collapse) */}
      <details style={{ marginTop: 4 }}>
        <summary style={{ color: '#aaa', cursor: 'pointer', fontWeight: 600 }}>Advanced</summary>
        <div style={{ marginTop: 8 }}>
          <ParameterControl label="Density" type="range" min={0.01} max={1.0} step={0.01} value={layer.density} onChange={v => update({ density: +v })} description="How densely to scatter objects." />
          <ParameterControl label="Point Radius" type="range" min={1} max={20} step={1} value={layer.pointRadius} onChange={v => update({ pointRadius: +v })} description="Minimum grid distance between points (higher = fewer objects)." />
          <ParameterControl label="Scale" type="range" min={0.05} max={1.0} step={0.01} value={layer.scale} onChange={v => update({ scale: +v })} description="Base scale of scattered objects." />
          <ParameterControl label="Jitter" type="range" min={0} max={1} step={0.01} value={layer.jitter} onChange={v => update({ jitter: +v })} description="Maximum random offset for each point (breaks up grid)." />
          <ParameterControl label="Max Slope (degrees)" type="range" min={0} max={60} step={1} value={layer.maxSlopeDeg} onChange={v => update({ maxSlopeDeg: +v })} description="Maximum allowed slope angle for scatter points (lower = avoid steep areas)." />
          <ParameterControl label="Mask Threshold" type="range" min={0} max={1} step={0.01} value={layer.maskThreshold} onChange={v => update({ maskThreshold: +v })} description="Height threshold for scatter mask." />
          <ParameterControl label="Seed" type="number" min={0} max={99999} step={1} value={layer.seed} onChange={v => update({ seed: +v })} description="Random seed for reproducible scatter." />
          <ParameterControl label="Debug" type="checkbox" value={layer.debug} onChange={v => update({ debug: v })} description="Show scatter mask as red dots instead of objects." />
          <ParameterControl label="Max Points" type="number" min={10} max={10000} step={10} value={layer.maxPoints || 2000} onChange={v => update({ maxPoints: +v })} description="Maximum number of points to scatter (prevents browser lockups)." />
          {/* Negative Affinity Controls */}
          <ParameterControl
            label="Negative Affinity Type"
            type="select"
            value={layer.negativeAffinityType || ''}
            onChange={v => update({ negativeAffinityType: v })}
            options={layers
              .filter((l, i) => i !== idx)
              .map(l => ({ value: l.objectType, label: l.label || l.objectType }))
              .concat([{ value: '', label: 'None' }])}
            description="Avoid placing this layer near another type."
          />
          <ParameterControl
            label="Negative Affinity Radius"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={layer.negativeAffinityRadius || 0}
            onChange={v => update({ negativeAffinityRadius: +v })}
            description="How far from the other type to avoid (as a fraction of its point radius)."
          />
        </div>
      </details>
    </div>
  );
});

export default ScatterLayerCard; 