# CodeSync - Collaborative Code Editor

A modern, futuristic collaborative code editor built with React.js, featuring real-time collaboration, beautiful themes, and seamless development experience.

Able to see other worker's cursor and online status with file and line:col they are on 
![1st user's interface](https://github.com/user-attachments/assets/2f8a2848-e514-427b-a99f-9817a31d2a61)

![2nd user's interface](https://github.com/user-attachments/assets/170cfb31-8704-414e-8c84-ce128c41779d)

Communicate with others while coding! & Plenty of Cool visual themes to match your vibes!
![Console and Theme selection](https://github.com/user-attachments/assets/35adb68c-3e6a-47b6-8645-60320391d298)

Terminal to run code that changes with theme selected!
![Terminal](https://github.com/user-attachments/assets/c605100f-15a6-4706-a1a2-c5e67929092a)


## ✨ Features

- **Real-time Collaboration**: Work together with multiple developers simultaneously
- **Monaco Editor**: Full-featured VS Code editor with syntax highlighting and IntelliSense
- **Beautiful Themes**: 6 stunning themes (Light, Dark, Cyber, Neon, Ocean, Forest)
- **Project Management**: Create and manage multiple coding projects
- **File Management**: Complete file tree with CRUD operations
- **Live Communication**: Built-in team communication system
- **Integrated Terminal**: Run code directly in the browser
- **User Authentication**: Secure JWT-based authentication
- **Responsive Design**: Works seamlessly across all devices

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js with modern hooks
- **Build Tool**: Vite
- **Editor**: Monaco Editor
- **Styling**: CSS Custom Properties with theme system
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **UI Components**: Radix UI
- **Routing**: React Router DOM

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB/PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: WebSocket/Socket.io
- **API**: RESTful APIs

## 🎨 Theme Gallery

Experience coding with 6 beautifully crafted themes:
- **Light**: Clean minimalist design
- **Dark**: Modern dark interface with blue accents
- **Cyber**: Futuristic cyberpunk aesthetic
- **Neon**: Vibrant neon colors
- **Ocean**: Calming blue ocean vibes
- **Forest**: Natural green forest theme

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/codesync.git
   cd codesync
   ```

2. **Setup Frontend**
   ```bash
   cd CODESYNC_Frontend
   npm install
   npm run dev
   ```

3. **Setup Backend** (if applicable)
   ```bash
   cd CODESYNC_Backend
   npm install
   npm start
   ```

4. **Open in browser**
   ```
   Frontend: http://localhost:5173
   Backend API: http://localhost:3000
   ```

## 📖 Usage

1. **Create Account**: Sign up or log in to access the editor
2. **New Project**: Create a project with your preferred programming language
3. **Collaborate**: Invite team members for real-time collaboration
4. **Code Together**: See live cursors, changes, and user presence
5. **Chat & Communicate**: Use built-in chat while coding
6. **Run Code**: Execute code using the integrated terminal

## 🏗️ Project Structure

```
codesync/
├── CODESYNC_Frontend/          # React.js Frontend Application
│   ├── .vite/                  # Vite cache directory
│   ├── node_modules/           # Dependencies
│   ├── public/                 # Static assets
│   └── src/                    # Source code
│       ├── assets/             # Static resources (images, fonts, etc.)
│       ├── components/         # Reusable UI components
│       ├── contexts/           # React context providers
│       ├── pages/              # Main application pages
│       └── services/           # API and WebSocket services
├── CODESYNC_Backend/           # Backend API
│   ├── config/                 # Configuration files
│   ├── controller/             # Route controllers
│   ├── dto/                    # Data Transfer Objects
│   ├── entity/                 # Database entities/models
│   ├── repository/             # Data access layer
│   ├── security/               # Authentication & authorization
│   ├── service/                # Business logic layer
│   └── websocket/              # WebSocket handling
└── README.md                   # Project documentation
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Monaco Editor team for the amazing code editor
- React community for excellent ecosystem
- All contributors and users of CodeSync

---

**Developed by Vishal**

*Thank you for checking out CodeSync! Happy coding! 🚀*
