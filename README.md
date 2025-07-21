# FinTrack 💰

A comprehensive cross-platform finance tracking application built with React, TypeScript, and Capacitor. FinTrack provides users with powerful tools to manage their finances, track expenses, and analyze spending patterns with real-time data and intelligent caching.

## 🌟 Features

### 🔐 Authentication & Security

- **Google OAuth Integration** - Secure authentication with Google accounts
- **JWT Token Management** - Secure API access with token-based authentication
- **User Profile Management** - Personal information, preferences, and photo upload

### 📱 Cross-Platform Support

- **Web Application** - Full-featured web interface with responsive design
- **Android Mobile App** - Native Android experience using Capacitor
- **Progressive Web App (PWA)** - Installable web app with offline capabilities

### 💼 Account Management

- **Multi-Account Support** - Manage checking, savings, credit, investment, and cash accounts
- **Real-time Balance Tracking** - Instant balance calculations with smart caching
- **Account Categories** - Organize accounts by type with custom institution information
- **Instant Loading** - Accounts load instantly with intelligent background updates

### 💸 Transaction Management

- **Comprehensive Transaction Tracking** - Record income, expenses, and transfers
- **Advanced Search & Filtering** - Find transactions by date, amount, account, or description
- **Responsive Transaction Grid** - Mobile-optimized display with expandable details
- **Month Grouping** - Organize transactions by month for better organization
- **Bulk Operations** - Efficient handling of large transaction datasets

### 📊 Analytics & Insights

- **Real-time Spending Analytics** - Interactive charts showing spending patterns
- **Category Analysis** - Breakdown of expenses by category with visual representations
- **Time Period Comparisons** - Weekly, monthly, and yearly spending analysis
- **Recharts Integration** - Beautiful, interactive data visualizations

### ⚡ Performance & Caching

- **Financial Caching System** - Intelligent caching for instant data loading
- **Smart Balance Optimization** - Cached balances with background refresh
- **Optimistic Updates** - Immediate UI feedback with background synchronization
- **Background Sync** - Seamless data consistency across devices

### 🌍 Internationalization

- **Multi-language Support** - English and Portuguese with extensible i18n system
- **Theme Customization** - Light and dark themes with user preferences
- **Responsive Design** - Optimized for mobile, tablet, and desktop screens

### 🔄 Data Synchronization

- **Real-time Updates** - Changes sync instantly across all user sessions
- **Conflict Resolution** - Smart handling of concurrent updates
- **Offline Capability** - Local storage with background sync when online
- **Multi-device Consistency** - Seamless experience across web and mobile

## 🏗️ Technical Architecture

### Frontend Stack

- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development with comprehensive interfaces
- **Material-UI v7** - Modern, accessible component library
- **Vite** - Fast build tool with hot module replacement
- **Capacitor** - Cross-platform native app capabilities

### Backend Infrastructure

- **Flask** - Python web framework with RESTful API design
- **SQLite** - Lightweight, reliable database with transaction support
- **JWT Authentication** - Secure token-based API access
- **Google OAuth** - Third-party authentication integration

### Mobile & PWA

- **Android Support** - Native Android app with Capacitor
- **Camera Integration** - Photo capture for profile pictures
- **Status Bar Management** - Native mobile UI integration
- **Safe Area Handling** - Proper mobile layout with notch support

### Caching & Performance

- **Capacitor Preferences** - Secure local storage for cached data
- **Financial Cache Manager** - Intelligent caching with timestamp validation
- **Background Updates** - Non-blocking data refresh
- **Optimistic Loading** - Instant UI updates with fallback handling

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Android Studio (for mobile development)

### Frontend Setup

```bash
cd app
npm install
npm run dev          # Development server
npm run build        # Production build
npm run build:android # Android build
```

### Backend Setup

```bash
cd server
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py        # Start Flask server
```

### Mobile Development

```bash
cd app
npm run build
npx cap sync android
npx cap open android
```

## 📱 Application Screens

### 🏠 Dashboard

- Overview of all accounts with real-time balances
- Recent transactions summary
- Quick access to main features

### 💳 Accounts

- Create and manage financial accounts
- Real-time balance calculations
- Account type categorization (checking, savings, credit, etc.)

### 💰 Transactions

- Add, edit, and delete transactions
- Advanced search and filtering
- Responsive grid layout with mobile optimization
- Monthly grouping and organization

### 📈 Analytics

- Interactive spending charts with Recharts
- Category breakdown and trend analysis
- Time period comparisons (weekly, monthly, yearly)
- Real-time calculations from cached data

### 👤 Profile

- User information management
- Theme and language preferences
- Profile photo upload with camera integration
- Settings synchronization across devices

## 🎯 Key Innovations

### Intelligent Caching System

- **Instant Loading**: All screens load instantly with cached data
- **Background Refresh**: Data updates silently in the background
- **Smart Invalidation**: Cache updates only when server data changes
- **Optimistic Updates**: UI responds immediately to user actions

### Responsive Design

- **Mobile-First**: Optimized for touch interfaces and small screens
- **Adaptive Layouts**: Components adjust to screen size and orientation
- **Native Feel**: Mobile app feels native with proper safe area handling

### Real-time Analytics

- **Client-side Calculations**: Analytics computed from cached transaction data
- **Interactive Visualizations**: Touch-friendly charts with drill-down capabilities
- **Performance Optimized**: No API calls needed for analytics after initial load

## 🔧 Development Features

### Code Organization

- **Component-based Architecture**: Modular, reusable components
- **TypeScript Interfaces**: Comprehensive type definitions
- **Conventional Commits**: Semantic versioning and clear git history
- **ESLint & Prettier**: Code quality and formatting standards

### Testing & Quality

- **Type Safety**: Full TypeScript coverage with strict mode
- **Error Handling**: Comprehensive error boundaries and fallbacks
- **Performance Monitoring**: Built-in debug logging and performance tracking

## 📄 Documentation

- **Copilot Instructions**: Comprehensive development guidelines in `.github/copilot-instructions.md`
- **Android Setup**: Mobile development guide in `app/android-setup.md`
- **API Documentation**: Server endpoint documentation in `server/README.md`

## 🚢 Deployment

### Web Deployment

```bash
cd app
npm run build
# Deploy dist/ folder to your hosting provider
```

### Android Release

```bash
cd app
npm run build:android
# Open Android Studio and build release APK
```

## 🤝 Contributing

1. Follow the coding patterns established in `.github/copilot-instructions.md`
2. Use conventional commit messages
3. Ensure TypeScript types are properly defined
4. Test on both web and mobile platforms
5. Maintain responsive design principles

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**FinTrack** - Making personal finance management simple, fast, and accessible across all your devices. 🚀
