# 🚀 Quick Start Guide - Kukan Prototype

Get up and running in 5 minutes!

## ⚡ Immediate Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# Copy the example environment file
cp env.example .env.local

# Edit .env.local and add your OpenAI API key
OPENAI_API_KEY=sk-your_actual_api_key_here
```

### 3. Add Sample Data
Place your room scan files in the `public/scans/` folder:
```
public/scans/
├── museum/
│   ├── museum.glb         # Your 3D model
│   └── textures/          # Texture files (optional)
└── bedroom/
    ├── room.obj
    └── room.mtl
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## 🎯 Test the Application

1. **Select a Scan**: Choose from the dropdown
2. **View 3D Model**: Rotate and zoom the model
3. **Ask Questions**: Try these example queries:
   - "How many chairs are in this room?"
   - "What are the dimensions of the table?"
   - "Where could I place a 120cm desk?"

## 🔧 Troubleshooting

### Common Issues

**Build Errors**: 
```bash
npm run build
```

**Missing Dependencies**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**API Key Issues**:
- Verify `.env.local` exists
- Check API key format
- Restart development server

### Performance Tips

- Keep OBJ files under 10MB
- Optimize room.jpg to under 5MB
- Use compressed textures if available

## 📱 Demo Mode

Even without scan data, you can:
- View the clean UI layout
- Test the scan selector
- See the chat interface
- Experience the responsive design

## 🚀 Ready to Deploy?

Check out [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

---

**Need help? Check the main [README.md](./README.md) for detailed documentation.**
