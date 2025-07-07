# Procedural Terrain Generator

A sophisticated web-based terrain generator that creates, erodes, textures, and visualizes 3D terrain using React and Three.js. The application features real-time parameter controls, web worker-based computations, and both 2D and 3D visualization modes.

## Features

- Procedural terrain generation using multiple noise algorithms
- Hydraulic erosion simulation
- Advanced texturing system with multiple texture maps
- Scattering system for trees, rocks, and grass
- Real-time parameter controls
- 2D heightmap and 3D visualization modes
- Web worker-based computations for performance
- Export capabilities for heightmaps

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone 'https://github.com/fakhirsh/fyp-terrain.git'
cd fyp-terrain
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at [http://localhost:3000](http://localhost:3000).

## Parameter Controls

The application provides a comprehensive set of parameters to control terrain generation:

### Basic Terrain Parameters
- **Size**: Overall size of the terrain (default: 3.5)
- **Mesh Resolution**: Resolution of the terrain mesh (default: 512)

### Noise Parameters
- **Amplitude**: Height range of the terrain (default: 2.5)
- **Octaves**: Number of noise layers (default: 8)
- **Lacunarity**: Frequency multiplier between octaves (default: 2.4)
- **Gain**: Amplitude multiplier between octaves (default: 0.45)
- **Seed**: Random seed for noise generation

### Worley Noise Parameters
- **Worley Points**: Number of points for Worley noise (default: 756)
- **Worley Weight**: Influence of Worley noise (default: 0.3)
- **Worley Dimension**: Dimension of Worley noise (default: 1)

### Domain Warping
- **Use Domain Warping**: Enable/disable domain warping
- **Warp Type**: Type of domain warping ('fractal' or 'simple')
- **Warp Strength**: Strength of domain warping (default: 0.25)
- **Warp Frequency**: Frequency of domain warping (default: 0.2)
- **Warp Iterations**: Number of warping iterations (default: 2)

### Water Parameters
- **Water Level**: Height of the water plane (default: 3.7)
- **Enable Water**: Toggle water visualization

### Texturing Parameters
- **Height Scale**: Scale of height-based texturing (default: 0.5)
- **Rock Height**: Height threshold for rock texturing (default: 0.7)
- **Moisture Scale**: Scale of moisture-based texturing (default: 2.5)
- **Moisture Noise Scale**: Scale of moisture noise (default: 0.05)
- **Terrain Blend Sharpness**: Sharpness of terrain blending (default: 0.7)
- **Texture Resolution**: Resolution of texture maps (default: 4.0)

### Advanced Texturing
- **Gravel Intensity**: Intensity of gravel texturing (default: 0.5)
- **Gravel Scale**: Scale of gravel texturing (default: 12.0)
- **Sediment Curvature Intensity**: Intensity of sediment curvature (default: 1)

### Texture Maps
- **Albedo Map**: Base color texture
- **Normal Map**: Surface normal texture
- **Roughness Map**: Surface roughness texture
- **Displacement Map**: Height displacement texture
- **Texture Scale**: Scale of texture maps (default: 20.0)
- **Normal Map Strength**: Strength of normal mapping (default: 1.0)
- **Displacement Scale**: Scale of displacement mapping (default: 0.02)
- **Roughness Multiplier**: Multiplier for roughness (default: 1.0)
- **Albedo Intensity**: Intensity of albedo map (default: 0.1)

### Scatter Layer Parameters
Each scatter layer (trees, rocks, grass) can be configured with:
- **Density**: Number of objects per unit area
- **Scale**: Size of scattered objects
- **Jitter**: Random position variation
- **Max Slope**: Maximum slope for object placement
- **Mask Threshold**: Height threshold for placement
- **Seed**: Random seed for placement
- **Max Points**: Maximum number of objects

## Quick Presets

The application includes a PresetPanel that provides quick access to pre-configured terrain types. These presets are optimized for specific terrain features and can be accessed from the bottom right corner of the application.

### Available Presets

1. **Mountains & Valleys**
   - High amplitude (2.5)
   - Ridged noise enabled
   - Strong domain warping
   - Optimized for dramatic mountain ranges and deep valleys

2. **Rolling Plains**
   - Low amplitude (0.3)
   - Smooth terrain
   - No domain warping
   - Perfect for gentle, rolling landscapes

3. **Forest Hills**
   - Medium amplitude (0.8)
   - Moderate domain warping
   - Balanced noise parameters
   - Ideal for forested terrain with varied elevation

To use a preset:
1. Click on the desired preset from the PresetPanel
2. The terrain parameters will be automatically updated
3. Generate a new heightmap or switch to 3D view to see the changes

## Usage

1. **Generate Heightmap**
   - Click "Generate Heightmap" to create a 2D heightmap
   - Adjust parameters in the settings panel
   - Export the heightmap if desired

2. **Erosion Simulation** (optional)
   - Start erosion simulation to modify the terrain
   - Adjust erosion parameters
   - Stop or reset erosion as needed

3. **3D Visualization**
   - Click "3D View" to switch to 3D mode
   - Use OrbitControls to navigate:
     - Left click + drag to rotate
     - Right click + drag to pan
     - Scroll to zoom
   - Toggle water visualization
   - Adjust scatter layer parameters

## Performance Considerations

- The application uses web workers for heavy computations
- 3D view is generated on-demand to save resources
- Use lower mesh resolution for faster generation
- Adjust scatter layer density for better performance

## Development

### Available Scripts

- `npm start`: Run development server
- `npm test`: Run tests
- `npm run build`: Build for production
- `npm run eject`: Eject from Create React App

### Project Structure

- `src/components/`: React components
- `src/services/`: Core services (terrain generation, erosion, etc.)
- `src/hooks/`: Custom React hooks
- `src/utils/`: Utility functions

## License

Apache 2.0

## Acknowledgments

- Three.js for 3D rendering
- React for UI framework
- Create React App for project setup
