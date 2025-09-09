# APIFlow - No-Code Database API Generator

Transform your database into powerful REST APIs in minutes. No coding required.

![APIFlow Dashboard](https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop)

## 🚀 Features

### 🔗 Database Connectivity
- **Multiple Database Support**: SQLite, MySQL, PostgreSQL
- **Real-time Connection Testing**: Verify connections before saving
- **Sample Data Generation**: Automatic sample data for SQLite databases
- **Connection Management**: Easy add, test, and remove database connections

### 🔍 Schema Explorer
- **Visual Schema Browser**: Explore your database structure visually
- **Table Relationships**: See foreign key relationships between tables
- **Column Details**: View data types, constraints, and properties
- **Real-time Data**: Live connection to your actual database schemas

### ⚡ API Builder
- **No-Code API Generation**: Create REST endpoints without writing code
- **Smart Filtering**: Add filters based on actual database columns
- **Multiple HTTP Methods**: Support for GET, POST, PUT, DELETE
- **Authentication Options**: Built-in API key authentication
- **Real-time Preview**: See your API structure as you build

### 🧪 API Tester
- **Interactive Testing**: Test your APIs directly in the browser
- **Real-time Responses**: See actual data from your database
- **cURL Generation**: Auto-generate cURL commands for your APIs
- **Request History**: Track your recent API tests

### 📚 Documentation
- **Auto-generated Docs**: Complete API documentation generated automatically
- **Code Examples**: JavaScript, Python, and cURL examples
- **Interactive Examples**: Copy-paste ready code snippets
- **Export Options**: Download documentation for sharing

### 📊 Analytics
- **Usage Monitoring**: Track API requests and performance
- **Real-time Metrics**: Live dashboard with key statistics
- **Performance Insights**: Response times and error rates
- **Usage Trends**: Historical data and trends

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Better SQLite3 (for local databases)
- **Build Tool**: Vite
- **Code Quality**: ESLint + TypeScript

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apiflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### First Steps

1. **Connect a Database**
   - Go to "Databases" in the sidebar
   - Click "Add Database"
   - Choose SQLite for a quick start (includes sample data)
   - Test the connection

2. **Explore Your Schema**
   - Navigate to "Schema Explorer"
   - Select your connected database
   - Browse tables and relationships

3. **Build Your First API**
   - Go to "API Builder"
   - Select your database and table
   - Configure your endpoint
   - Add filters if needed
   - Generate your API

4. **Test Your API**
   - Navigate to "API Tester"
   - Select your endpoint
   - Send test requests
   - View real responses

## 📖 Usage Guide

### Database Connection

#### SQLite (Recommended for Testing)
```
Connection Name: My SQLite DB
Database Type: SQLite
Database Name: sample.db
```

#### MySQL
```
Connection Name: My MySQL DB
Database Type: MySQL
Host: localhost
Port: 3306
Database Name: my_database
Username: your_username
Password: your_password
```

#### PostgreSQL
```
Connection Name: My PostgreSQL DB
Database Type: PostgreSQL
Host: localhost
Port: 5432
Database Name: my_database
Username: your_username
Password: your_password
```

### API Endpoint Examples

#### Get All Users
```
Method: GET
Path: /api/users
Authentication: Optional
```

#### Get User by ID
```
Method: GET
Path: /api/users/{id}
Authentication: Required
```

#### Create New User
```
Method: POST
Path: /api/users
Authentication: Required
Body: JSON user data
```

### Sample API Responses

#### GET /api/users
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## 🏗️ Project Structure

```
src/
├── components/           # React components
│   ├── Dashboard.tsx    # Main dashboard
│   ├── DatabaseConnector.tsx  # Database management
│   ├── SchemaExplorer.tsx     # Schema browser
│   ├── APIBuilder.tsx   # API endpoint builder
│   ├── APITester.tsx    # API testing interface
│   ├── Documentation.tsx      # Auto-generated docs
│   ├── Analytics.tsx    # Usage analytics
│   └── Settings.tsx     # App settings
├── utils/               # Utility functions
│   └── database.ts      # Database management
├── types.ts            # TypeScript type definitions
└── App.tsx             # Main application component
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Database Types

1. Update the `DatabaseConnection` interface in `src/utils/database.ts`
2. Add connection logic in `DatabaseManager.testConnection()`
3. Update the UI in `DatabaseConnector.tsx`

### Extending API Features

1. Add new endpoint types in `APIBuilder.tsx`
2. Update the documentation generator in `Documentation.tsx`
3. Add testing support in `APITester.tsx`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and in-app documentation
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join our community discussions

## 🎯 Roadmap

- [ ] **GraphQL Support**: Generate GraphQL APIs alongside REST
- [ ] **Real-time APIs**: WebSocket endpoint generation
- [ ] **API Versioning**: Support for multiple API versions
- [ ] **Custom Middleware**: Add custom authentication and validation
- [ ] **Cloud Deployment**: One-click deployment to cloud providers
- [ ] **Team Collaboration**: Multi-user workspace support
- [ ] **Advanced Analytics**: Detailed performance monitoring
- [ ] **API Marketplace**: Share and discover APIs

## ⭐ Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Database integration with [Better SQLite3](https://github.com/WiseLibs/better-sqlite3)

---

**Made with ❤️ for developers who want to build APIs fast**