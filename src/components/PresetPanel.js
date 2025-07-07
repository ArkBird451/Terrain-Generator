import React from 'react';
import PropTypes from 'prop-types';
import { FaLayerGroup, FaCheck } from 'react-icons/fa';

const presets = {
  mountains: {
    name: "Mountains & Valleys",
    params: {
      amplitude: 2.5,
      frequency: 0.15,
      octaves: 8,
      lacunarity: 2.1,
      gain: 0.45,
      ridged: true,
      ridgedOffset: 0.7,
      useDomainWarp: true,
      warpType: 'fractal',
      warpStrength: 0.25,
      warpFrequency: 0.2,
      warpIterations: 2,
      smoothFactor: 0.35
    }
  },
  plains: {
    name: "Rolling Plains",
    params: {
      amplitude: 0.3,
      frequency: 0.2,
      octaves: 4,
      lacunarity: 2.0,
      gain: 0.5,
      ridged: false,
      ridgedOffset: 0,
      useDomainWarp: false,
      warpType: 'simplex',
      warpStrength: 0,
      warpFrequency: 0,
      warpIterations: 0,
      smoothFactor: 0.7
    }
  },
  forest: {
    name: "Forest Hills",
    params: {
      amplitude: 0.8,
      frequency: 0.25,
      octaves: 5,
      lacunarity: 2.0,
      gain: 0.5,
      ridged: false,
      ridgedOffset: 0,
      useDomainWarp: true,
      warpType: 'simplex',
      warpStrength: 0.3,
      warpFrequency: 0.2,
      warpIterations: 1,
      smoothFactor: 0.4
    }
  }
};

const PresetPanel = ({ onSelectPreset }) => {
  const [active, setActive] = React.useState(null);

  return (
    <div style={{
      position: 'absolute',
      top: 24,
      right: 24,
      background: 'rgba(35,36,58,0.82)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      padding: '22px 22px 18px 22px',
      borderRadius: 18,
      boxShadow: '0 8px 32px 0 rgba(110,193,228,0.18)',
      zIndex: 1000,
      minWidth: 220,
      maxWidth: '90vw',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      fontSize: 15,
      color: '#f3f3f3',
      border: '1.5px solid #333a',
      transition: 'box-shadow 0.3s, border 0.3s',
      animation: 'fadeInPanel 0.5s cubic-bezier(.4,2,.6,1)'
    }}>
      <style>{`
        @keyframes fadeInPanel { from { opacity: 0; transform: translateY(-16px) scale(0.98); } to { opacity: 1; transform: none; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <FaLayerGroup style={{ color: '#6ec1e4', fontSize: 22, marginRight: 10 }} />
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.2, color: '#6ec1e4' }}>Terrain Presets</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(presets).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => { onSelectPreset(preset.params); setActive(key); }}
            style={{
              padding: '10px 18px',
              background: active === key ? 'linear-gradient(90deg, #6ec1e4 60%, #e4b06e 100%)' : 'rgba(60,60,80,0.85)',
              border: 'none',
              borderRadius: 32,
              color: active === key ? '#23243a' : '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: active === key ? '0 2px 12px 0 #6ec1e488' : '0 1px 4px 0 #23243a22',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              position: 'relative',
              transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
            }}
            onMouseOver={e => { if (active !== key) e.currentTarget.style.background = 'rgba(110,193,228,0.18)'; }}
            onMouseOut={e => { if (active !== key) e.currentTarget.style.background = 'rgba(60,60,80,0.85)'; }}
          >
            {preset.name}
            {active === key && <FaCheck style={{ marginLeft: 8, color: '#23243a', fontSize: 18 }} />}
          </button>
        ))}
      </div>
    </div>
  );
};

PresetPanel.propTypes = {
  onSelectPreset: PropTypes.func.isRequired
};

export default PresetPanel; 