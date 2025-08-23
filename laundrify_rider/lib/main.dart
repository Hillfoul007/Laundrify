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
import 'core/services/order_service.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/dashboard/providers/dashboard_provider.dart';
import 'features/orders/providers/orders_provider.dart';
import 'features/tracking/providers/tracking_provider.dart';

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
  final orderService = OrderService(apiService);
  
  await notificationService.initialize();
  
  runApp(LaundrifyriderApp(
    authService: authService,
    locationService: locationService,
    notificationService: notificationService,
    apiService: apiService,
    orderService: orderService,
  ));
}

class LaundrifyriderApp extends StatelessWidget {
  final AuthService authService;
  final LocationService locationService;
  final NotificationService notificationService;
  final ApiService apiService;
  final OrderService orderService;

  const LaundrifyriderApp({
    super.key,
    required this.authService,
    required this.locationService,
    required this.notificationService,
    required this.apiService,
    required this.orderService,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthProvider(authService),
        ),
        ChangeNotifierProvider(
          create: (_) => DashboardProvider(locationService, apiService),
        ),
        ChangeNotifierProvider(
          create: (_) => OrdersProvider(orderService),
        ),
        ChangeNotifierProvider(
          create: (_) => TrackingProvider(locationService, apiService),
        ),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp.router(
            title: 'Laundrify Rider',
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
