# Kukan Prototype - AI Room Analysis

A powerful prototype demonstrating AI's ability to understand and reason about 3D room scans using OpenAI's GPT-4o Vision model. The AI analyzes dynamic screenshots of the current 3D view, making it appear as if it understands the 3D scene from any camera angle.

## 🚀 **Key Features**

### **Dynamic 3D Analysis**
- **Real-time Screenshots**: AI captures and analyzes the current 3D view from your camera perspective
- **Camera-Aware Responses**: Get intelligent answers based on exactly what you're looking at
- **Interactive Experience**: Navigate the 3D room and ask questions about what you see

### **Enhanced 3D Room Viewer**
- **Smart Camera Controls**: Adaptive movement speeds based on object size for smooth navigation
- **Size-Aware Navigation**: Very small objects get extremely slow, precise movement; large objects get responsive controls
- **Interactive Navigation**: Rotate, zoom, and explore 3D room models with optimized controls
- **Multi-Format Support**: OBJ, GLB, GLTF, and MTL files with automatic format detection
- **Responsive Controls**: Smooth mouse and scroll interactions with size-optimized speeds
- **Visual Feedback**: Screenshot capture indicators and loading states

### **AI Chat Interface**
- **Context-Aware Responses**: AI sees exactly what you see in the 3D view
- **Markdown Formatting**: Rich text responses with bold, italic, and code formatting
- **Real-time Analysis**: Instant responses based on current camera perspective
- **Example Questions**: Pre-built questions to get started
- **Smart Screenshot Compression**: Automatic image optimization to prevent API errors

## 🏗️ **Architecture**

### **Frontend**
- **Next.js 14**: Modern React framework with App Router
- **Three.js**: 3D rendering and model loading with optimized controls
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern, responsive styling

### **Backend**
- **Next.js API Routes**: Serverless API endpoints with payload size validation
- **OpenAI GPT-4o Vision**: Advanced AI image analysis
- **Dynamic Screenshots**: Real-time 3D view capture with compression
- **Robust Error Handling**: Comprehensive error handling for various failure scenarios

### **3D Rendering**
- **Multi-Format Loaders**: OBJ, GLB, GLTF support with automatic detection
- **MTL Loader**: Material and texture support
- **WebGL Renderer**: Hardware-accelerated graphics with preserveDrawingBuffer
- **Optimized Screenshot API**: Canvas-to-image conversion with compression

## 📁 **Project Structure**

```
Kukan_prototype/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # AI chat endpoint with size validation
│   │   └── scans/route.ts         # Scan discovery endpoint
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main page with file upload
├── components/
│   ├── ChatInterface.tsx          # AI chat UI with compression
│   ├── ModelViewer/               # Enhanced 3D viewer
│   │   ├── ModelViewer.tsx        # Main 3D viewer component
│   │   ├── CameraControls.ts      # Smart camera controls
│   │   ├── EntranceAnimation.ts   # Smooth camera animations
│   │   ├── Lighting.ts            # Dynamic lighting system
│   │   ├── UIControls.tsx         # User interface controls
│   │   └── types.ts               # TypeScript definitions
│   └── ScanSelector.tsx           # Room selection dropdown
├── types/
│   └── scan.ts                    # TypeScript interfaces
├── public/
│   └── scans/                     # Room scan data
│       ├── museum/
│       │   ├── museum.glb         # 3D model
│       │   └── textures/          # Texture files (optional)
│       └── living-room/
│           ├── room.obj           # OBJ model
│           └── room.mtl           # Material file
├── middleware.ts                  # API payload validation
└── package.json                   # Dependencies
```

## 🚀 **Quick Start**

### **1. Clone and Install**
```bash
git clone https://github.com/divisionAI-co/kukan.git
cd kukan
npm install
```

### **2. Environment Setup**
```bash
cp .env.example .env
# Add your OpenAI API key to .env
OPENAI_API_KEY=your_api_key_here
```

### **3. Add Room Scans**
Place your room scan folders in `public/scans/`:
```
public/scans/
├── museum/
│   ├── museum.glb        # 3D model file
│   └── textures/         # Texture folder (optional)
├── living-room/
│   ├── room.obj          # OBJ model
│   ├── room.mtl          # Material file
│   └── textures/         # Texture folder (optional)
└── custom-room/
    ├── model.gltf        # GLTF model
    └── textures/         # Texture folder (optional)
```

### **4. Run Development Server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see your prototype!

## 🎯 **How It Works**

### **1. 3D Navigation**
- **Load a room scan** from the dropdown or upload your own 3D model
- **Navigate the 3D view** using optimized mouse and scroll controls
- **Smart camera positioning** automatically adjusts for small vs. large objects
- **Position your camera** to see what interests you

### **2. AI Analysis**
- **Ask a question** about what you see
- **AI captures optimized screenshot** of your current 3D view
- **Automatic compression** reduces file size while maintaining quality
- **GPT-4o analyzes** the compressed screenshot contextually
- **Get intelligent response** based on your perspective

### **3. Dynamic Context**
- **Different angles** = Different AI responses
- **Current view focus** = Relevant analysis
- **Interactive exploration** = Continuous learning
- **Size-adaptive controls** = Smooth navigation regardless of object scale

## 💡 **Example Questions**

Try these questions from different camera angles:

- **"What furniture do you see in this view?"**
- **"How far is the table from the wall?"**
- **"What's the size of the rug from this perspective?"**
- **"Can you see any windows or doors?"**
- **"What's the layout of this corner?"**
- **"Describe the architectural features visible from this angle"**

## 🔧 **Technical Details**

### **Enhanced Camera Controls**
- **Size-Aware Movement**: Pan, zoom, and rotation speeds automatically adjust based on object size
- **Very Small Objects** (< 0.5): Exponential scaling for extremely precise, slow movement
- **Small Objects** (0.5 - 1.0): Quadratic scaling for gradual speed increase
- **Large Objects** (≥ 1.0): Linear scaling for responsive navigation
- **Smooth Transitions**: No more jerky movement for small objects

### **Smart Screenshot Technology**
- **Multi-Stage Compression**: Automatic optimization at capture and before API transmission
- **Format Optimization**: JPEG instead of PNG for significantly smaller files
- **Size Reduction**: Canvas resizing and quality adjustment (typically 80-95% smaller)
- **Quality Balance**: Maintains sufficient quality for AI analysis while preventing API errors
- **Real-time Capture**: Captures current view state including camera position

### **API Optimizations**
- **Payload Size Validation**: Prevents 413 errors with comprehensive size checking
- **Screenshot Limits**: Enforces 20MB limit for individual screenshots
- **Timeout Handling**: 60-second timeout for large requests
- **Error Recovery**: Graceful fallbacks and clear error messages
- **Rate Limit Handling**: Specific handling for API quota issues

### **AI Integration**
- **GPT-4o Vision**: Latest multimodal AI model with high detail analysis
- **Context Awareness**: System prompts guide AI to focus on visible content
- **Comprehensive Analysis**: Expert-level insights about artwork, architecture, and exhibits
- **Error Handling**: Graceful fallbacks for various API failure scenarios

### **Performance Optimizations**
- **Preserve Drawing Buffer**: Enables screenshot capability without performance impact
- **Efficient Rendering**: 60fps 3D navigation with optimized controls
- **Smart Loading**: Progressive model loading with format detection
- **Responsive Design**: Adapts to different screen sizes and device capabilities
- **Memory Management**: Efficient texture and model handling

## 🚀 **Deployment**

### **Vercel (Recommended)**
```bash
npm run build
# Deploy to Vercel with automatic builds
```

### **Environment Variables**
- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Set to 'production' for deployment

## 🐛 **Troubleshooting**

### **Common Issues**

1. **3D Model Not Loading**
   - Check file paths in `public/scans/`
   - Verify supported formats: OBJ, GLB, GLTF
   - Check browser console for errors
   - Ensure materials (MTL) are in the same folder

2. **Screenshots Not Working**
   - Ensure `preserveDrawingBuffer: true` in renderer
   - Check browser WebGL support
   - Verify canvas element exists
   - Check console for compression logs

3. **AI Responses Not Working**
   - Check OpenAI API key in `.env`
   - Verify API quota and billing
   - Check network connectivity
   - Look for specific error messages in chat

4. **Performance Issues**
   - Reduce model complexity
   - Optimize texture sizes
   - Check device capabilities
   - Monitor memory usage in browser dev tools

5. **Camera Movement Too Fast/Slow**
   - Check console for model size detection logs
   - Verify camera controls are properly initialized
   - Try different model sizes to test scaling

## 🔮 **Future Enhancements**

- **Multiple Camera Views**: Save and switch between perspectives
- **Measurement Tools**: AI-powered distance and size estimation
- **Furniture Placement**: AI suggestions for room layout
- **VR Support**: Immersive 3D exploration
- **Batch Analysis**: Process multiple views simultaneously
- **Advanced Compression**: WebP support and adaptive quality
- **Camera Presets**: Pre-defined viewing angles for common analysis tasks

## 📄 **License**

This project is proprietary software developed for investor demonstration purposes.

## 🤝 **Support**

For technical support or questions about the implementation, please refer to the project documentation or contact the development team.

---

**Built with ❤️ for the future of AI-powered 3D analysis**
