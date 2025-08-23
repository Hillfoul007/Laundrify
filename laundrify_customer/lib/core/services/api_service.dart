import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://your-backend-url.com/api';
  // For development: 'http://localhost:3001/api'
  
  final http.Client _client = http.Client();
  String? _authToken;

  // Initialize with stored auth token
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
  }

  // Set auth token
  void setAuthToken(String token) {
    _authToken = token;
  }

  // Clear auth token
  void clearAuthToken() {
    _authToken = null;
  }

  // Get headers with auth token
  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (_authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    
    return headers;
  }

  // Generic GET request
  Future<ApiResponse<T>> get<T>(
    String endpoint, {
    Map<String, String>? queryParams,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint').replace(
        queryParameters: queryParams,
      );

      final response = await _client.get(uri, headers: _headers);
      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  // Generic POST request
  Future<ApiResponse<T>> post<T>(
    String endpoint, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final response = await _client.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  // Generic PUT request
  Future<ApiResponse<T>> put<T>(
    String endpoint, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final response = await _client.put(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
        body: body != null ? jsonEncode(body) : null,
      );
      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  // Generic DELETE request
  Future<ApiResponse<T>> delete<T>(
    String endpoint, {
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    try {
      final response = await _client.delete(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
      );
      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_handleError(e));
    }
  }

  // Handle HTTP response
  ApiResponse<T> _handleResponse<T>(
    http.Response response,
    T Function(Map<String, dynamic>)? fromJson,
  ) {
    final statusCode = response.statusCode;
    
    if (statusCode >= 200 && statusCode < 300) {
      try {
        final jsonData = jsonDecode(response.body);
        
        if (fromJson != null && jsonData is Map<String, dynamic>) {
          return ApiResponse.success(fromJson(jsonData));
        } else {
          return ApiResponse.success(jsonData as T);
        }
      } catch (e) {
        return ApiResponse.error('Failed to parse response: $e');
      }
    } else {
      String errorMessage = 'Request failed with status: $statusCode';
      
      try {
        final errorData = jsonDecode(response.body);
        if (errorData is Map<String, dynamic> && errorData.containsKey('error')) {
          errorMessage = errorData['error'].toString();
        } else if (errorData is Map<String, dynamic> && errorData.containsKey('message')) {
          errorMessage = errorData['message'].toString();
        }
      } catch (e) {
        // Use default error message if parsing fails
      }
      
      return ApiResponse.error(errorMessage);
    }
  }

  // Handle network and other errors
  String _handleError(dynamic error) {
    if (error is SocketException) {
      return 'No internet connection. Please check your network.';
    } else if (error is HttpException) {
      return 'Network error occurred. Please try again.';
    } else if (error is FormatException) {
      return 'Invalid response format.';
    } else {
      return 'An unexpected error occurred: ${error.toString()}';
    }
  }

  // Dispose of the client
  void dispose() {
    _client.close();
  }
}

// API Response wrapper class
class ApiResponse<T> {
  final T? data;
  final String? error;
  final bool isSuccess;

  ApiResponse._({this.data, this.error, required this.isSuccess});

  factory ApiResponse.success(T data) {
    return ApiResponse._(data: data, isSuccess: true);
  }

  factory ApiResponse.error(String error) {
    return ApiResponse._(error: error, isSuccess: false);
  }
}

// API endpoints constants
class ApiEndpoints {
  // Auth endpoints
  static const String sendOtp = '/auth/send-otp';
  static const String verifyOtp = '/auth/verify-otp';
  static const String refreshToken = '/auth/refresh';
  
  // Services endpoints
  static const String services = '/services';
  static const String serviceCategories = '/services/categories';
  
  // Booking endpoints
  static const String bookings = '/bookings';
  static const String quickBook = '/bookings/quick-book';
  
  // User endpoints
  static const String profile = '/user/profile';
  static const String addresses = '/user/addresses';
  
  // Location endpoints
  static const String detectLocation = '/location/detect';
  static const String saveLocation = '/location/save';
  
  // Notifications endpoints
  static const String notifications = '/notifications';
  static const String registerPushToken = '/notifications/register-token';
}
