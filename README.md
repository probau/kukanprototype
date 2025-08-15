# Kukan Prototype - AI Room Analysis

A powerful prototype demonstrating AI's ability to understand and reason about 3D room scans using OpenAI's GPT-4o Vision model. The AI analyzes dynamic screenshots of the current 3D view, making it appear as if it understands the 3D scene from any camera angle.

## 🚀 **Key Features**

### **Dynamic 3D Analysis**
- **Real-time Screenshots**: AI captures and analyzes the current 3D view from your camera perspective
- **Camera-Aware Responses**: Get intelligent answers based on exactly what you're looking at
- **Interactive Experience**: Navigate the 3D room and ask questions about what you see

### **3D Room Viewer**
- **Interactive Navigation**: Rotate, zoom, and explore 3D room models
- **OBJ/MTL Support**: Load textured 3D models with materials
- **Responsive Controls**: Smooth mouse and scroll interactions
- **Visual Feedback**: Screenshot capture indicators

### **AI Chat Interface**
- **Context-Aware Responses**: AI sees exactly what you see in the 3D view
- **Markdown Formatting**: Rich text responses with bold, italic, and code formatting
- **Real-time Analysis**: Instant responses based on current camera perspective
- **Example Questions**: Pre-built questions to get started

## 🏗️ **Architecture**

### **Frontend**
- **Next.js 14**: Modern React framework with App Router
- **Three.js**: 3D rendering and model loading
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern, responsive styling

### **Backend**
- **Next.js API Routes**: Serverless API endpoints
- **OpenAI GPT-4o Vision**: Advanced AI image analysis
- **Dynamic Screenshots**: Real-time 3D view capture

### **3D Rendering**
- **OBJ Loader**: 3D model loading
- **MTL Loader**: Material and texture support
- **WebGL Renderer**: Hardware-accelerated graphics
- **Screenshot API**: Canvas-to-image conversion

## 📁 **Project Structure**

```
Kukan_prototype/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # AI chat endpoint
│   │   └── scans/route.ts         # Scan discovery endpoint
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main page
├── components/
│   ├── ChatInterface.tsx          # AI chat UI
│   ├── ModelViewer.tsx            # 3D viewer with screenshot capability
│   └── ScanSelector.tsx           # Room selection dropdown
├── types/
│   └── scan.ts                    # TypeScript interfaces
├── public/
│   └── scans/                     # Room scan data
│       └── museum/
│           ├── museum.glb         # 3D model
│           └── textures/          # Texture files (optional)
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
└── bedroom/
    ├── room.obj
    └── room.mtl
```

### **4. Run Development Server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see your prototype!

## 🎯 **How It Works**

### **1. 3D Navigation**
- **Load a room scan** from the dropdown
- **Navigate the 3D view** using mouse and scroll
- **Position your camera** to see what interests you

### **2. AI Analysis**
- **Ask a question** about what you see
- **AI captures screenshot** of your current 3D view
- **GPT-4o analyzes** the screenshot contextually
- **Get intelligent response** based on your perspective

### **3. Dynamic Context**
- **Different angles** = Different AI responses
- **Current view focus** = Relevant analysis
- **Interactive exploration** = Continuous learning

## 💡 **Example Questions**

Try these questions from different camera angles:

- **"What furniture do you see in this view?"**
- **"How far is the table from the wall?"**
- **"What's the size of the rug from this perspective?"**
- **"Can you see any windows or doors?"**
- **"What's the layout of this corner?"**

## 🔧 **Technical Details**

### **Screenshot Technology**
- **Canvas Capture**: Uses Three.js renderer's canvas element
- **Base64 Encoding**: Converts to data URL for API transmission
- **High Quality**: JPEG format with 90% quality for optimal AI analysis
- **Real-time**: Captures current view state including camera position

### **AI Integration**
- **GPT-4o Vision**: Latest multimodal AI model
- **High Detail**: Uses 'high' detail setting for accurate analysis
- **Context Awareness**: System prompts guide AI to focus on visible content
- **Error Handling**: Graceful fallbacks for API issues

### **Performance Optimizations**
- **Preserve Drawing Buffer**: Enables screenshot capability
- **Efficient Rendering**: 60fps 3D navigation
- **Smart Loading**: Progressive model loading with fallbacks
- **Responsive Design**: Adapts to different screen sizes

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
   - Verify OBJ file format
   - Check browser console for errors

2. **Screenshots Not Working**
   - Ensure `preserveDrawingBuffer: true` in renderer
   - Check browser WebGL support
   - Verify canvas element exists

3. **AI Responses Not Working**
   - Check OpenAI API key in `.env`
   - Verify API quota and billing
   - Check network connectivity

4. **Performance Issues**
   - Reduce model complexity
   - Optimize texture sizes
   - Check device capabilities

## 🔮 **Future Enhancements**

- **Multiple Camera Views**: Save and switch between perspectives
- **Measurement Tools**: AI-powered distance and size estimation
- **Furniture Placement**: AI suggestions for room layout
- **VR Support**: Immersive 3D exploration
- **Batch Analysis**: Process multiple views simultaneously

## 📄 **License**

This project is proprietary software developed for investor demonstration purposes.

## 🤝 **Support**

For technical support or questions about the implementation, please refer to the project documentation or contact the development team.

---

**Built with ❤️ for the future of AI-powered 3D analysis**
