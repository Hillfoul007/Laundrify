import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/services/api_service.dart';
import 'core/services/auth_service.dart';
import 'core/services/location_service.dart';
import 'core/services/notification_service.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/home/providers/home_provider.dart';
import 'features/booking/providers/booking_provider.dart';
import 'features/cart/providers/cart_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize SharedPreferences
  final prefs = await SharedPreferences.getInstance();
  
  // Initialize services
  final apiService = ApiService();
  final authService = AuthService(apiService, prefs);
  final locationService = LocationService();
  final notificationService = NotificationService();
  
  await notificationService.initialize();
  
  runApp(LaundrifyCutomerApp(
    authService: authService,
    locationService: locationService,
    notificationService: notificationService,
    apiService: apiService,
  ));
}

class LaundrifyCutomerApp extends StatelessWidget {
  final AuthService authService;
  final LocationService locationService;
  final NotificationService notificationService;
  final ApiService apiService;

  const LaundrifyCutomerApp({
    super.key,
    required this.authService,
    required this.locationService,
    required this.notificationService,
    required this.apiService,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthProvider(authService),
        ),
        ChangeNotifierProvider(
          create: (_) => HomeProvider(locationService, apiService),
        ),
        ChangeNotifierProvider(
          create: (_) => BookingProvider(apiService),
        ),
        ChangeNotifierProvider(
          create: (_) => CartProvider(),
        ),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp.router(
            title: 'Laundrify Customer',
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: ThemeMode.system,
            routerConfig: AppRouter.router,
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}
