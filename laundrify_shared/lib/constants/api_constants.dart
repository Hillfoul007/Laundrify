class ApiConstants {
  // Base URLs
  static const String prodBaseUrl = 'https://your-production-backend.com/api';
  static const String devBaseUrl = 'http://localhost:3001/api';
  
  // Use environment variable or default to development
  static String get baseUrl {
    const bool isProduction = bool.fromEnvironment('dart.vm.product');
    return isProduction ? prodBaseUrl : devBaseUrl;
  }

  // Common endpoints
  static const String auth = '/auth';
  static const String sendOtp = '$auth/send-otp';
  static const String verifyOtp = '$auth/verify-otp';
  static const String refreshToken = '$auth/refresh';
  
  // Customer endpoints
  static const String services = '/services';
  static const String bookings = '/bookings';
  static const String quickBook = '/bookings/quick-book';
  static const String userProfile = '/user/profile';
  static const String userAddresses = '/user/addresses';
  
  // Rider endpoints
  static const String riderAuth = '/rider/auth';
  static const String riderProfile = '/rider/profile';
  static const String riderOrders = '/rider/orders';
  static const String riderLocation = '/rider/location';
  static const String riderEarnings = '/rider/earnings';
  static const String riderStatus = '/rider/status';
  
  // Common endpoints
  static const String notifications = '/notifications';
  static const String registerPushToken = '/notifications/register-token';
  static const String location = '/location';
  static const String detectLocation = '$location/detect';
  
  // Order status constants
  static const String orderStatusPending = 'pending';
  static const String orderStatusConfirmed = 'confirmed';
  static const String orderStatusAssigned = 'assigned';
  static const String orderStatusPickedUp = 'picked_up';
  static const String orderStatusInTransit = 'in_transit';
  static const String orderStatusDelivered = 'delivered';
  static const String orderStatusCancelled = 'cancelled';
  
  // Rider status constants
  static const String riderStatusOffline = 'offline';
  static const String riderStatusOnline = 'online';
  static const String riderStatusBusy = 'busy';
  
  // Payment status constants
  static const String paymentStatusPending = 'pending';
  static const String paymentStatusCompleted = 'completed';
  static const String paymentStatusFailed = 'failed';
  static const String paymentStatusRefunded = 'refunded';
}
