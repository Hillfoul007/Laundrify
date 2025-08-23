import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user_model.dart';

class AuthService {
  final ApiService _apiService;
  final SharedPreferences _prefs;
  
  static const String _authTokenKey = 'auth_token';
  static const String _userDataKey = 'user_data';
  static const String _phoneNumberKey = 'phone_number';

  AuthService(this._apiService, this._prefs);

  // Check if user is authenticated
  bool get isAuthenticated {
    final token = _prefs.getString(_authTokenKey);
    return token != null && token.isNotEmpty;
  }

  // Get current user
  UserModel? get currentUser {
    final userData = _prefs.getString(_userDataKey);
    if (userData != null) {
      try {
        final json = jsonDecode(userData);
        return UserModel.fromJson(json);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Get stored phone number
  String? get phoneNumber {
    return _prefs.getString(_phoneNumberKey);
  }

  // Initialize auth service
  Future<void> initialize() async {
    final token = _prefs.getString(_authTokenKey);
    if (token != null) {
      _apiService.setAuthToken(token);
    }
  }

  // Send OTP to phone number
  Future<ApiResponse<Map<String, dynamic>>> sendOtp(String phoneNumber) async {
    final response = await _apiService.post(
      ApiEndpoints.sendOtp,
      body: {'phoneNumber': phoneNumber},
    );

    if (response.isSuccess) {
      // Store phone number for later use
      await _prefs.setString(_phoneNumberKey, phoneNumber);
    }

    return response;
  }

  // Verify OTP and authenticate user
  Future<ApiResponse<UserModel>> verifyOtp(String phoneNumber, String otp) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      ApiEndpoints.verifyOtp,
      body: {
        'phoneNumber': phoneNumber,
        'otp': otp,
      },
    );

    if (response.isSuccess && response.data != null) {
      final data = response.data!;
      
      // Extract token and user data
      final token = data['token'] as String?;
      final userData = data['user'] as Map<String, dynamic>?;

      if (token != null && userData != null) {
        // Store auth token
        await _prefs.setString(_authTokenKey, token);
        _apiService.setAuthToken(token);

        // Store user data
        final user = UserModel.fromJson(userData);
        await _prefs.setString(_userDataKey, jsonEncode(user.toJson()));

        return ApiResponse.success(user);
      } else {
        return ApiResponse.error('Invalid response format');
      }
    } else {
      return ApiResponse.error(response.error ?? 'Verification failed');
    }
  }

  // Refresh authentication token
  Future<ApiResponse<String>> refreshToken() async {
    final response = await _apiService.post<Map<String, dynamic>>(
      ApiEndpoints.refreshToken,
    );

    if (response.isSuccess && response.data != null) {
      final token = response.data!['token'] as String?;
      if (token != null) {
        await _prefs.setString(_authTokenKey, token);
        _apiService.setAuthToken(token);
        return ApiResponse.success(token);
      }
    }

    return ApiResponse.error(response.error ?? 'Token refresh failed');
  }

  // Update user profile
  Future<ApiResponse<UserModel>> updateProfile(Map<String, dynamic> profileData) async {
    final response = await _apiService.put<Map<String, dynamic>>(
      ApiEndpoints.profile,
      body: profileData,
    );

    if (response.isSuccess && response.data != null) {
      final user = UserModel.fromJson(response.data!);
      await _prefs.setString(_userDataKey, jsonEncode(user.toJson()));
      return ApiResponse.success(user);
    }

    return ApiResponse.error(response.error ?? 'Profile update failed');
  }

  // Logout user
  Future<void> logout() async {
    // Clear stored data
    await _prefs.remove(_authTokenKey);
    await _prefs.remove(_userDataKey);
    await _prefs.remove(_phoneNumberKey);
    
    // Clear API service token
    _apiService.clearAuthToken();
  }

  // Check if phone number is valid Indian mobile number
  static bool isValidIndianPhoneNumber(String phoneNumber) {
    // Remove any non-digit characters
    final digitsOnly = phoneNumber.replaceAll(RegExp(r'\D'), '');
    
    // Check if it's a valid 10-digit Indian mobile number
    if (digitsOnly.length == 10) {
      // Indian mobile numbers start with 6, 7, 8, or 9
      return digitsOnly.startsWith(RegExp(r'[6-9]'));
    }
    
    // Check if it's a 12-digit number starting with 91 (country code)
    if (digitsOnly.length == 12 && digitsOnly.startsWith('91')) {
      final mobileNumber = digitsOnly.substring(2);
      return mobileNumber.startsWith(RegExp(r'[6-9]'));
    }
    
    return false;
  }

  // Format phone number for API calls
  static String formatPhoneNumber(String phoneNumber) {
    final digitsOnly = phoneNumber.replaceAll(RegExp(r'\D'), '');
    
    // If it's 10 digits, add country code
    if (digitsOnly.length == 10) {
      return '+91$digitsOnly';
    }
    
    // If it's 12 digits starting with 91, add +
    if (digitsOnly.length == 12 && digitsOnly.startsWith('91')) {
      return '+$digitsOnly';
    }
    
    // Return as is if already formatted
    return phoneNumber.startsWith('+') ? phoneNumber : '+$digitsOnly';
  }
}
