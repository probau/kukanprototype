# Room Scans Directory

This folder contains the room scan data for the Kukan Prototype.

## Expected Structure

Each room scan should be in its own subfolder with the following files:

```
scans/
├── museum/
│   ├── museum.glb         # 3D model file (required)
│   └── textures/          # Texture files (optional)
├── bedroom/
│   ├── model.obj
│   ├── model.mtl
│   └── room.jpg
└── kitchen/
    ├── model.obj
    └── room.jpg
```

## File Requirements

### 3D Model Files
- **Formats**: OBJ, GLB, or GLTF files supported
- **Size**: Optimize for web loading (<10MB recommended)
- **Origin**: Center the model at origin (0,0,0) if possible

### model.mtl (Optional)
- **Format**: Standard MTL material file format
- **Purpose**: Defines materials, colors, and texture references
- **Naming**: Should match the OBJ filename (e.g., model.obj → model.mtl)

### room.jpg
- **Format**: JPEG image
- **Content**: Must include visible A4 paper labeled "A4" for scale reference
- **Quality**: High resolution for accurate AI analysis
- **Size**: <5MB recommended

### textures/ (optional)
- **Format**: Standard image formats (PNG, JPG)
- **Naming**: Referenced in the MTL file
- **Size**: Optimize for web performance

## Material Support

The application now supports:
- ✅ **OBJ files** - Basic 3D geometry with MTL materials
- ✅ **GLB/GLTF files** - Modern 3D format with embedded materials
- ✅ **MTL files** - Material definitions and properties for OBJ files
- ✅ **Texture files** - Referenced by MTL files
- ✅ **Fallback rendering** - Works without material files

## Adding New Scans

1. Create a new folder with descriptive name (e.g., `dining-room`)
2. Add a 3D model file (`.obj`, `.glb`, or `.gltf`)
3. For OBJ files, optionally add `.mtl` and `textures/` folder
4. Restart the development server
5. The new scan will appear in the dropdown selector

## Troubleshooting

- **Model not loading**: Check file format (OBJ, GLB, GLTF) and size
- **Materials not showing**: For OBJ files, verify MTL file exists and references textures correctly
- **Performance issues**: Optimize model, texture, and material file sizes
