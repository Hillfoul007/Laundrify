# Laundrify Flutter Apps

This repository contains the Flutter mobile apps for the Laundrify laundry service platform, converted from the original React web application.

## 📱 Apps Overview

### 🛒 Customer App (`laundrify_customer`)
- **Target Users**: Customers who need laundry services
- **Key Features**:
  - Phone OTP authentication
  - Service browsing and booking
  - Real-time order tracking
  - Address management
  - Push notifications
  - Payment integration

### 🚚 Rider App (`laundrify_rider`)
- **Target Users**: Delivery partners/riders
- **Key Features**:
  - Rider registration and verification
  - Order assignment and management
  - Live location tracking
  - Earnings dashboard
  - Route optimization
  - Customer communication

### 🔧 Shared Package (`laundrify_shared`)
- **Purpose**: Common utilities and models
- **Contents**:
  - API constants and endpoints
  - Shared utilities (phone validation, formatting, etc.)
  - Common models and types

## 🏗️ Architecture

```
├── laundrify_customer/
│   ├── lib/
│   │   ├── core/                 # Core services, routing, theme
│   ���   ├── features/             # Feature-based modules
│   │   │   ├── auth/            # Authentication
│   │   │   ├── home/            # Home screen
│   │   │   ├── booking/         # Booking flow
│   │   │   ├── cart/            # Shopping cart
│   │   │   └── profile/         # User profile
│   │   └── shared/              # Shared widgets and screens
│   └── pubspec.yaml
│
├── laundrify_rider/
│   ├── lib/
│   │   ├── core/                # Core services, routing, theme
│   │   ├── features/            # Feature-based modules
│   │   │   ├── auth/           # Rider authentication
│   │   │   ├── dashboard/      # Rider dashboard
│   │   │   ├── orders/         # Order management
│   │   │   ├── tracking/       # Location tracking
│   │   │   └── profile/        # Rider profile
│   │   └── shared/             # Shared widgets and screens
│   └── pubspec.yaml
│
├── laundrify_shared/
│   ├── lib/
│   │   ├── constants/          # API constants
│   │   ├── utils/              # Utility functions
│   │   └── models/             # Shared data models
│   └���─ pubspec.yaml
│
└── backend/                    # Existing Node.js backend (unchanged)
```

## 🚀 Getting Started

### Prerequisites
- Flutter SDK 3.0.0 or higher
- Android Studio / VS Code
- Xcode (for iOS development)
- Firebase account
- Google Maps API key

### Setup

1. **Clone and Setup Flutter Projects**
```bash
# Customer App
cd laundrify_customer
flutter pub get

# Rider App
cd laundrify_rider
flutter pub get

# Shared Package
cd laundrify_shared
flutter pub get
```

2. **Firebase Configuration**
- Create Firebase projects for both apps
- Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
- Enable Authentication, Cloud Messaging, and Crashlytics

3. **Google Maps Setup**
- Get API keys for Android and iOS
- Add keys to respective platform configurations

4. **Backend Configuration**
- Ensure your existing Node.js backend is running
- Update API base URLs in `laundrify_shared/lib/constants/api_constants.dart`

### Running the Apps

#### Customer App
```bash
cd laundrify_customer
flutter run
```

#### Rider App
```bash
cd laundrify_rider
flutter run
```

## 🔧 Backend Integration

The Flutter apps integrate with your existing Node.js backend with minimal changes required:

### Required Backend Updates

1. **CORS Configuration**: Allow mobile app requests
2. **FCM Integration**: Add Firebase Cloud Messaging for push notifications
3. **Mobile Endpoints**: Add rider-specific endpoints for location tracking

### API Compatibility
All existing REST APIs are compatible. The Flutter apps use the same endpoints as your React web app.

## 📦 Key Dependencies

### Shared Dependencies
- `provider` - State management
- `go_router` - Navigation
- `http` / `dio` - API communication
- `shared_preferences` - Local storage
- `firebase_core` & `firebase_messaging` - Push notifications
- `google_maps_flutter` - Maps integration
- `geolocator` - Location services

### Customer App Specific
- `pin_code_fields` - OTP input
- `image_picker` - Profile images

### Rider App Specific
- `background_location` - Background location tracking
- `audioplayers` - Notification sounds

## 🎨 Design System

Both apps use a consistent design system based on your existing brand colors:

- **Primary Purple**: `#C46DD8`
- **Primary Pink**: `#F36BAF`
- **Mint**: `#B9F9D3`
- **Red**: `#FF3F63`
- **Blue**: `#243C90`
- **Yellow**: `#E3FF63`

## 🔐 Authentication Flow

### Customer App
1. Phone number input with validation
2. OTP verification via SMS
3. Auto-login with stored JWT tokens
4. Profile completion (optional)

### Rider App
1. Rider registration with vehicle details
2. Document verification process
3. Admin approval workflow
4. Phone OTP login

## 📍 Location Services

### Customer App
- Address autocomplete with Google Places
- Current location detection
- Saved addresses management
- Service area validation

### Rider App
- Real-time location tracking
- Route optimization
- Delivery proof (photos)
- Customer location navigation

## 🔔 Push Notifications

Both apps support Firebase Cloud Messaging for:
- Order status updates
- Rider assignment notifications
- Promotional messages
- System alerts

## 🚀 Deployment

### Development
- Use development Firebase projects
- Point to local/staging backend APIs
- Enable debug features

### Production
- Switch to production Firebase projects
- Update API endpoints to production URLs
- Enable crash reporting and analytics
- Follow app store guidelines

See `FLUTTER_DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## 🧪 Testing

### Unit Tests
```bash
flutter test
```

### Integration Tests
```bash
flutter test integration_test/
```

### Manual Testing Checklist
- [ ] Authentication flows
- [ ] Booking processes
- [ ] Location services
- [ ] Push notifications
- [ ] Payment integration
- [ ] Offline functionality

## ��� Analytics & Monitoring

- **Firebase Analytics**: User behavior tracking
- **Firebase Crashlytics**: Crash reporting
- **Firebase Performance**: Performance monitoring
- **Custom Events**: Business metrics

## 🤝 Contributing

1. Follow Flutter coding standards
2. Use feature-based architecture
3. Write tests for new features
4. Update documentation
5. Test on both Android and iOS

## 📱 App Store Information

### Customer App
- **Name**: Laundrify - Laundry Service
- **Category**: Lifestyle
- **Target Audience**: General users needing laundry services

### Rider App
- **Name**: Laundrify Rider
- **Category**: Business
- **Target Audience**: Delivery partners

## 🔧 Troubleshooting

### Common Issues

1. **Build Errors**: Check Flutter version compatibility
2. **API Errors**: Verify backend connectivity
3. **Location Issues**: Check permissions and API keys
4. **Push Notifications**: Verify Firebase configuration

### Support
- Check existing issues in React codebase
- Review Flutter documentation
- Contact development team for backend-related issues

## 📋 Migration Status

### ✅ Completed Features
- Authentication system
- Basic app structure
- Navigation setup
- API service layer
- Theme and styling
- Core models and providers

### 🚧 In Progress
- Service booking flow
- Order tracking
- Payment integration
- Push notifications setup

### 📝 Pending
- Complete UI implementation
- Comprehensive testing
- App store assets
- Production deployment

## 📞 Contact

For questions or support regarding the Flutter conversion:
- Review the original React codebase for business logic
- Check backend API documentation
- Test integrations with existing backend services

---

**Note**: This Flutter conversion maintains compatibility with your existing Node.js backend and database. The mobile apps provide native iOS and Android experiences while leveraging your current infrastructure.
