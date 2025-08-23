import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/rider_login_screen.dart';
import '../../features/auth/screens/rider_registration_screen.dart';
import '../../features/auth/screens/otp_verification_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/orders/screens/orders_list_screen.dart';
import '../../features/orders/screens/order_details_screen.dart';
import '../../features/tracking/screens/live_tracking_screen.dart';
import '../../features/profile/screens/rider_profile_screen.dart';
import '../../features/profile/screens/earnings_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../shared/screens/splash_screen.dart';
import '../../shared/widgets/main_layout.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final authProvider = context.read<AuthProvider>();
      final isAuthenticated = authProvider.isAuthenticated;
      final isOnAuthFlow = state.location.startsWith('/auth');

      // If rider is not authenticated and not on auth flow, redirect to login
      if (!isAuthenticated && !isOnAuthFlow && state.location != '/splash') {
        return '/auth/login';
      }

      // If rider is authenticated and on auth flow, redirect to dashboard
      if (isAuthenticated && isOnAuthFlow) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),
      
      // Authentication Routes
      GoRoute(
        path: '/auth/login',
        name: 'rider-login',
        builder: (context, state) => const RiderLoginScreen(),
      ),
      GoRoute(
        path: '/auth/register',
        name: 'rider-registration',
        builder: (context, state) => const RiderRegistrationScreen(),
      ),
      GoRoute(
        path: '/auth/otp',
        name: 'otp-verification',
        builder: (context, state) {
          final phoneNumber = state.extra as String?;
          return OtpVerificationScreen(phoneNumber: phoneNumber);
        },
      ),

      // Main App Routes with Bottom Navigation
      ShellRoute(
        builder: (context, state, child) => MainLayout(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/orders',
            name: 'orders',
            builder: (context, state) => const OrdersListScreen(),
          ),
          GoRoute(
            path: '/tracking',
            name: 'tracking',
            builder: (context, state) => const LiveTrackingScreen(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const RiderProfileScreen(),
          ),
          GoRoute(
            path: '/notifications',
            name: 'notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
        ],
      ),

      // Order Details
      GoRoute(
        path: '/order/:orderId',
        name: 'order-details',
        builder: (context, state) {
          final orderId = state.pathParameters['orderId']!;
          return OrderDetailsScreen(orderId: orderId);
        },
      ),

      // Earnings
      GoRoute(
        path: '/earnings',
        name: 'earnings',
        builder: (context, state) => const EarningsScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Page not found',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              state.location,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/dashboard'),
              child: const Text('Go to Dashboard'),
            ),
          ],
        ),
      ),
    ),
  );
}
