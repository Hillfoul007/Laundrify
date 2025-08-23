# Flutter Apps Deployment Guide

## Overview
This guide covers deploying both **Laundrify Customer** and **Laundrify Rider** Flutter apps to Google Play Store and Apple App Store.

## Project Structure
```
├── laundrify_customer/     # Customer app
├── laundrify_rider/        # Rider app  
├── laundrify_shared/       # Shared utilities
└── backend/               # Existing Node.js backend
```

## Prerequisites

### Development Environment
- Flutter SDK (latest stable)
- Android Studio with Android SDK
- Xcode (for iOS development)
- Firebase project setup
- Google Maps API keys

### Backend Requirements
Your existing Node.js backend needs minimal changes:
- Ensure CORS allows mobile app domains
- Add FCM token registration endpoints
- Update authentication to handle mobile tokens

## App Store Preparation

### 1. App Icons & Splash Screens

#### Customer App Icons
```bash
cd laundrify_customer
# Generate app icons using flutter_launcher_icons
flutter pub add dev:flutter_launcher_icons
```

Create `flutter_launcher_icons.yaml`:
```yaml
flutter_launcher_icons:
  android: "launcher_icon"
  ios: true
  image_path: "assets/icons/customer_app_icon.png"
  min_sdk_android: 21
```

#### Rider App Icons
```bash
cd laundrify_rider
flutter pub add dev:flutter_launcher_icons
```

### 2. App Signing

#### Android Signing
1. Generate keystore:
```bash
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

2. Create `android/key.properties`:
```properties
storePassword=your-store-password
keyPassword=your-key-password
keyAlias=upload
storeFile=../upload-keystore.jks
```

3. Update `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}
```

#### iOS Signing
- Set up Apple Developer account
- Create App IDs in Apple Developer Console
- Generate provisioning profiles
- Configure signing in Xcode

### 3. Firebase Setup

#### Create Firebase Projects
1. Customer app: `laundrify-customer`
2. Rider app: `laundrify-rider`

#### Add Firebase Config Files
```bash
# Download google-services.json and GoogleService-Info.plist
# Place in respective android/app and ios/Runner folders
```

### 4. Google Maps Integration

#### Get API Keys
- Android: Restrict to package names
- iOS: Restrict to bundle IDs

#### Configure Maps
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data android:name="com.google.android.geo.API_KEY"
           android:value="YOUR_ANDROID_API_KEY"/>
```

Add to `ios/Runner/AppDelegate.swift`:
```swift
GMSServices.provideAPIKey("YOUR_IOS_API_KEY")
```

## Build & Release

### Android Release

#### Customer App
```bash
cd laundrify_customer
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

#### Rider App
```bash
cd laundrify_rider
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

### iOS Release

#### Customer App
```bash
cd laundrify_customer
flutter build ios --release
# Open ios/Runner.xcworkspace in Xcode
# Archive and upload to App Store Connect
```

#### Rider App
```bash
cd laundrify_rider
flutter build ios --release
# Archive and upload to App Store Connect
```

## App Store Listings

### Google Play Store

#### Customer App
- **App Name**: Laundrify - Laundry Service
- **Package**: com.laundrify.customer
- **Category**: Lifestyle
- **Description**: On-demand laundry pickup and delivery service

#### Rider App
- **App Name**: Laundrify Rider
- **Package**: com.laundrify.rider
- **Category**: Business
- **Description**: Delivery partner app for Laundrify

### Apple App Store

#### Customer App
- **Bundle ID**: com.laundrify.customer
- **Category**: Lifestyle
- **Subcategory**: Shopping

#### Rider App
- **Bundle ID**: com.laundrify.rider
- **Category**: Business

## Backend Integration

### Required API Updates

1. **CORS Configuration**:
```javascript
const allowedOrigins = [
  'https://your-web-domain.com',
  'http://localhost:3000', // Development
  // No origin restrictions needed for mobile apps
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

2. **FCM Token Registration**:
```javascript
// Add to your routes
app.post('/api/notifications/register-token', (req, res) => {
  const { fcmToken, userId, deviceType } = req.body;
  // Store FCM token in database
});
```

3. **Mobile-specific Endpoints**:
```javascript
// Rider location updates
app.post('/api/rider/location', riderAuth, (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  // Update rider location
});

// Push notification sending
app.post('/api/notifications/send', (req, res) => {
  // Send FCM notifications
});
```

## Testing

### Customer App Testing
1. **Authentication Flow**: OTP login
2. **Service Booking**: End-to-end booking
3. **Location Services**: Address detection
4. **Push Notifications**: Order updates
5. **Payment Integration**: Test transactions

### Rider App Testing
1. **Registration & Verification**
2. **Order Assignment & Acceptance**
3. **Live Location Tracking**
4. **Order Status Updates**
5. **Earnings Calculation**

## Production Checklist

### Pre-Launch
- [ ] Backend APIs tested with mobile apps
- [ ] Firebase FCM setup and tested
- [ ] Google Maps integration working
- [ ] App signing configured
- [ ] Store assets prepared (icons, screenshots, descriptions)
- [ ] Privacy policy and terms updated for mobile apps

### Post-Launch
- [ ] Monitor crash reports (Firebase Crashlytics)
- [ ] Track user analytics
- [ ] Monitor API performance
- [ ] Set up app store optimization (ASO)

## Environment Configuration

### Production URLs
Update in `laundrify_shared/lib/constants/api_constants.dart`:
```dart
static const String prodBaseUrl = 'https://your-production-backend.com/api';
```

### Firebase Configuration
- Set up different environments (dev/prod)
- Configure appropriate Firebase projects
- Update security rules for production

## Maintenance

### App Updates
1. Version management in `pubspec.yaml`
2. Changelog maintenance
3. Backward compatibility testing
4. App store review process

### Backend Updates
- API versioning strategy
- Mobile app compatibility testing
- Database migration considerations

## Support & Monitoring

### Crash Reporting
- Firebase Crashlytics integration
- Error monitoring and alerting

### Performance Monitoring
- Firebase Performance Monitoring
- API response time tracking
- User session analytics

### User Feedback
- In-app feedback system
- App store review monitoring
- Customer support integration

## Security Considerations

### API Security
- JWT token validation
- Rate limiting for mobile endpoints
- Input validation and sanitization

### App Security
- Certificate pinning
- Secure storage for sensitive data
- Biometric authentication option

### Data Privacy
- GDPR compliance
- Data encryption in transit and at rest
- User consent management
