# Living Room Scan

This folder contains the living room scan data for the Kukan Prototype.

## Required Files

Place the following files in this folder:

1. **model.obj** - The 3D model file of the living room
2. **room.jpg** - A stitched image of the room with visible A4 paper labeled "A4"

## Optional Files

- **textures/** - Folder containing texture files referenced by the OBJ model

## File Requirements

### model.obj
- Standard OBJ format
- Optimized for web loading (<10MB recommended)
- Center the model at origin if possible

### room.jpg
- High-quality JPEG image
- Must include visible A4 paper labeled "A4" for scale reference
- Used by GPT-4o Vision for AI analysis
- <5MB recommended

## Example Usage

Once these files are added, the living room will appear in the scan selector dropdown, and users can:
- View the 3D model in the viewer
- Ask AI questions about the room layout and furniture
- Get accurate measurements using the A4 scale reference
