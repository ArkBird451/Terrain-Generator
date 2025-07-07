import React, { useCallback, memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const accent = '#6ec1e4';
const border = '#333a';
const bg = 'rgba(35,36,58,0.85)';
const labelColor = '#e3e3e3';
const descColor = '#aab';
const focusShadow = `0 0 0 2px ${accent}55`;

const ParameterControl = memo(({ 
  label, 
  type, 
  value, 
  onChange, 
  options = [], 
  min = undefined, 
  max = undefined, 
  step = undefined, 
  description = undefined 
}) => {
  const [sliderHover, setSliderHover] = React.useState(false);
  const [sliderFocus, setSliderFocus] = React.useState(false);
  const [localValue, setLocalValue] = React.useState(value);
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = useRef(null);
  const showBubble = sliderHover || sliderFocus;

  // Sync local value with prop value only when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value);
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const newValue = type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(newValue);
  }, [onChange, type]);

  const handleNumberInput = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const input = e.target;
    const newValue = input.value;
    
    // Always update local value while typing
    setLocalValue(newValue);
    
    // Allow empty value for better UX while typing
    if (newValue === '') {
      return;
    }

    // Validate number
    const numValue = Number(newValue);
    if (isNaN(numValue)) return;

    // Apply min/max constraints
    let constrainedValue = numValue;
    if (min !== undefined) constrainedValue = Math.max(constrainedValue, Number(min));
    if (max !== undefined) constrainedValue = Math.min(constrainedValue, Number(max));

    // Debounce the actual onChange call
    const timeoutId = setTimeout(() => {
      onChange(constrainedValue);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [onChange, min, max]);

  const handleKeyDown = useCallback((e) => {
    if (type === 'number') {
      // Prevent default behavior for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      // Handle arrow key increments/decrements
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const stepValue = Number(step) || 1;
        const currentValue = Number(localValue) || 0;
        const newValue = e.key === 'ArrowUp' 
          ? currentValue + stepValue 
          : currentValue - stepValue;
        
        // Apply min/max constraints
        let constrainedValue = newValue;
        if (min !== undefined) constrainedValue = Math.max(constrainedValue, Number(min));
        if (max !== undefined) constrainedValue = Math.min(constrainedValue, Number(max));

        setLocalValue(constrainedValue);
        onChange(constrainedValue);
      }
    }
  }, [type, localValue, step, min, max, onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    
    // Ensure value is within bounds on blur
    if (type === 'number' && localValue !== '') {
      const numValue = Number(localValue);
      let constrainedValue = numValue;
      
      if (min !== undefined) constrainedValue = Math.max(constrainedValue, Number(min));
      if (max !== undefined) constrainedValue = Math.min(constrainedValue, Number(max));
      
      setLocalValue(constrainedValue);
      onChange(constrainedValue);
    }
  }, [type, localValue, min, max, onChange]);

  return (
    <div style={{
      marginBottom: 18,
      background: bg,
      borderRadius: 10,
      boxShadow: '0 1px 6px 0 rgba(0,0,0,0.10)',
      border: `1.5px solid ${border}`,
      padding: '14px 16px',
      transition: 'box-shadow 0.2s, border 0.2s',
      position: 'relative',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
      <label style={{
        fontWeight: 600,
        color: labelColor,
        fontSize: 15,
        marginBottom: 2,
        letterSpacing: 0.1,
        cursor: type === 'checkbox' ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        {label}
        {description && <span style={{ color: descColor, fontWeight: 400, fontSize: 13, marginLeft: 6 }}>{description}</span>}
      </label>
      {type === 'range' && (
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 10, position: 'relative', minHeight: 44 }}>
          <div style={{ flex: 1, position: 'relative', height: 36, display: 'flex', alignItems: 'center' }}>
            <input 
              type="range" 
              min={min} 
              max={max} 
              step={step} 
              value={value} 
              aria-label={label}
              onChange={handleChange}
              onMouseEnter={() => setSliderHover(true)}
              onMouseLeave={() => setSliderHover(false)}
              onFocus={() => setSliderFocus(true)}
              onBlur={() => setSliderFocus(false)}
              style={{
                width: '100%',
                height: 8,
                borderRadius: 6,
                background: `linear-gradient(90deg, ${accent} ${(value-min)/(max-min)*100}%, #23243a ${(value-min)/(max-min)*100}%)`,
                outline: 'none',
                boxShadow: sliderFocus ? focusShadow : undefined,
                appearance: 'none',
                transition: 'background 0.2s',
                cursor: 'pointer',
              }}
            />
            {/* Custom thumb using ::-webkit-slider-thumb and ::-moz-range-thumb via style tag */}
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                appearance: none;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: ${accent};
                box-shadow: 0 2px 8px 0 ${accent}44;
                border: 2.5px solid #fff;
                transition: transform 0.18s, box-shadow 0.18s;
                transform: scale(${showBubble ? 1.18 : 1});
              }
              input[type=range]:focus::-webkit-slider-thumb {
                box-shadow: 0 0 0 4px ${accent}55;
              }
              input[type=range]::-moz-range-thumb {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: ${accent};
                box-shadow: 0 2px 8px 0 ${accent}44;
                border: 2.5px solid #fff;
                transition: transform 0.18s, box-shadow 0.18s;
                transform: scale(${showBubble ? 1.18 : 1});
              }
              input[type=range]:focus::-moz-range-thumb {
                box-shadow: 0 0 0 4px ${accent}55;
              }
              input[type=range]::-ms-thumb {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                background: ${accent};
                box-shadow: 0 2px 8px 0 ${accent}44;
                border: 2.5px solid #fff;
                transition: transform 0.18s, box-shadow 0.18s;
                transform: scale(${showBubble ? 1.18 : 1});
              }
            `}</style>
            {/* Value bubble */}
            <span
              style={{
                position: 'absolute',
                left: `calc(${((value - min) / (max - min)) * 100}% - 18px)`,
                top: -32,
                background: accent,
                color: '#23243a',
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 8,
                padding: '3px 12px',
                opacity: showBubble ? 1 : 0,
                pointerEvents: 'none',
                transition: 'opacity 0.2s, left 0.2s',
                zIndex: 2,
                boxShadow: '0 2px 8px 0 rgba(110,193,228,0.18)'
              }}
              aria-hidden={!showBubble}
            >
              {value}
            </span>
          </div>
          <input
            ref={inputRef}
            type="number"
            min={min}
            max={max}
            step={step}
            value={localValue}
            aria-label={label + ' value'}
            onChange={handleNumberInput}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              width: 60,
              marginLeft: 12,
              padding: '6px 10px',
              border: `1.5px solid ${border}`,
              borderRadius: 8,
              background: 'rgba(30,32,48,0.95)',
              color: labelColor,
              fontWeight: 500,
              fontSize: 16,
              outline: 'none',
              boxShadow: sliderFocus ? focusShadow : undefined,
              transition: 'box-shadow 0.2s',
            }}
          />
        </div>
      )}
      {type === 'number' && (
        <input 
          ref={inputRef}
          type="number" 
          min={min} 
          max={max} 
          step={step}
          value={localValue}
          onChange={handleNumberInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            width: '100%',
            padding: '7px 10px',
            background: 'rgba(30,32,48,0.95)',
            border: `1.5px solid ${border}`,
            borderRadius: 7,
            color: labelColor,
            fontWeight: 500,
            fontSize: 15,
            outline: 'none',
            boxShadow: 'none',
            transition: 'box-shadow 0.2s',
          }}
        />
      )}
      {type === 'checkbox' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 2 }}>
          <input 
            type="checkbox" 
            checked={value} 
            onChange={handleChange}
            style={{
              width: 20,
              height: 20,
              accentColor: accent,
              borderRadius: 6,
              border: `1.5px solid ${border}`,
              boxShadow: 'none',
              marginRight: 6,
              cursor: 'pointer',
              outline: 'none',
              transition: 'box-shadow 0.2s',
            }}
          />
        </label>
      )}
      {type === 'select' && (
        <select 
          value={value} 
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '7px 10px',
            background: 'rgba(30,32,48,0.95)',
            border: `1.5px solid ${border}`,
            borderRadius: 7,
            color: labelColor,
            fontWeight: 500,
            fontSize: 15,
            outline: 'none',
            boxShadow: 'none',
            marginTop: 2,
            cursor: 'pointer',
            transition: 'box-shadow 0.2s',
          }}
        >
          {options.map(option => (
            <option key={option.value} value={option.value} style={{ color: '#23243a', background: '#fff' }}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {type === 'color' && (
        <input 
          type="color" 
          value={value} 
          onChange={handleChange}
          style={{
            width: 40,
            height: 32,
            border: `1.5px solid ${border}`,
            borderRadius: 7,
            background: 'none',
            marginTop: 2,
            cursor: 'pointer',
            outline: 'none',
            boxShadow: 'none',
            transition: 'box-shadow 0.2s',
          }}
        />
      )}
      {type === 'text' && (
        <input
          type="text"
          value={value}
          onChange={handleChange}
          style={{
            width: '100%',
            padding: '7px 10px',
            background: 'rgba(30,32,48,0.95)',
            border: `1.5px solid ${border}`,
            borderRadius: 7,
            color: labelColor,
            fontWeight: 500,
            fontSize: 15,
            outline: 'none',
            boxShadow: 'none',
            marginTop: 2,
            transition: 'box-shadow 0.2s',
          }}
        />
      )}
    </div>
  );
});

ParameterControl.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['range', 'number', 'checkbox', 'select', 'color', 'text']).isRequired,
  value: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.bool
  ]).isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ),
  min: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  max: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  step: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  description: PropTypes.string
};

ParameterControl.displayName = 'ParameterControl';

export default ParameterControl; 