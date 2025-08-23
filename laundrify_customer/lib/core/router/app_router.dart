import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/phone_auth_screen.dart';
import '../../features/auth/screens/otp_verification_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/services/screens/service_details_screen.dart';
import '../../features/cart/screens/cart_screen.dart';
import '../../features/booking/screens/booking_confirmation_screen.dart';
import '../../features/booking/screens/booking_history_screen.dart';
import '../../features/booking/screens/order_tracking_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/profile/screens/addresses_screen.dart';
import '../../shared/screens/splash_screen.dart';
import '../../shared/widgets/main_layout.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final authProvider = context.read<AuthProvider>();
      final isAuthenticated = authProvider.isAuthenticated;
      final isOnAuthFlow = state.location.startsWith('/auth');

      // If user is not authenticated and not on auth flow, redirect to phone auth
      if (!isAuthenticated && !isOnAuthFlow && state.location != '/splash') {
        return '/auth/phone';
      }

      // If user is authenticated and on auth flow, redirect to home
      if (isAuthenticated && isOnAuthFlow) {
        return '/home';
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
        path: '/auth/phone',
        name: 'phone-auth',
        builder: (context, state) => const PhoneAuthScreen(),
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
            path: '/home',
            name: 'home',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/cart',
            name: 'cart',
            builder: (context, state) => const CartScreen(),
          ),
          GoRoute(
            path: '/bookings',
            name: 'bookings',
            builder: (context, state) => const BookingHistoryScreen(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),

      // Service Details
      GoRoute(
        path: '/service/:serviceId',
        name: 'service-details',
        builder: (context, state) {
          final serviceId = state.pathParameters['serviceId']!;
          return ServiceDetailsScreen(serviceId: serviceId);
        },
      ),

      // Booking Flow
      GoRoute(
        path: '/booking/confirmation',
        name: 'booking-confirmation',
        builder: (context, state) {
          final bookingData = state.extra as Map<String, dynamic>?;
          return BookingConfirmationScreen(bookingData: bookingData);
        },
      ),

      // Order Tracking
      GoRoute(
        path: '/order/:orderId',
        name: 'order-tracking',
        builder: (context, state) {
          final orderId = state.pathParameters['orderId']!;
          return OrderTrackingScreen(orderId: orderId);
        },
      ),

      // Profile Sub-routes
      GoRoute(
        path: '/profile/addresses',
        name: 'addresses',
        builder: (context, state) => const AddressesScreen(),
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
              onPressed: () => context.go('/home'),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
}
