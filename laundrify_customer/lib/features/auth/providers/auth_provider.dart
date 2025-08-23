import 'package:flutter/material.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/api_service.dart';
import '../../../core/models/user_model.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService;
  
  UserModel? _user;
  bool _isLoading = false;
  String? _error;
  String? _otpRequestId;

  AuthProvider(this._authService) {
    _initializeAuth();
  }

  // Getters
  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && _authService.isAuthenticated;
  String? get phoneNumber => _authService.phoneNumber;

  // Initialize authentication state
  Future<void> _initializeAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.initialize();
      _user = _authService.currentUser;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Send OTP to phone number
  Future<bool> sendOtp(String phoneNumber) async {
    _setLoading(true);
    _clearError();

    try {
      // Validate phone number
      if (!AuthService.isValidIndianPhoneNumber(phoneNumber)) {
        _setError('Please enter a valid Indian mobile number');
        return false;
      }

      // Format phone number
      final formattedPhone = AuthService.formatPhoneNumber(phoneNumber);

      // Send OTP request
      final response = await _authService.sendOtp(formattedPhone);

      if (response.isSuccess) {
        _otpRequestId = response.data?['requestId'];
        return true;
      } else {
        _setError(response.error ?? 'Failed to send OTP');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Verify OTP and login
  Future<bool> verifyOtp(String phoneNumber, String otp) async {
    _setLoading(true);
    _clearError();

    try {
      // Validate inputs
      if (otp.length != 6) {
        _setError('Please enter a valid 6-digit OTP');
        return false;
      }

      // Format phone number
      final formattedPhone = AuthService.formatPhoneNumber(phoneNumber);

      // Verify OTP
      final response = await _authService.verifyOtp(formattedPhone, otp);

      if (response.isSuccess && response.data != null) {
        _user = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'Invalid OTP. Please try again.');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Update user profile
  Future<bool> updateProfile({
    String? name,
    String? email,
  }) async {
    if (_user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      final updateData = <String, dynamic>{};
      if (name != null) updateData['name'] = name;
      if (email != null) updateData['email'] = email;

      final response = await _authService.updateProfile(updateData);

      if (response.isSuccess && response.data != null) {
        _user = response.data!;
        notifyListeners();
        return true;
      } else {
        _setError(response.error ?? 'Failed to update profile');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Refresh authentication token
  Future<void> refreshToken() async {
    try {
      await _authService.refreshToken();
    } catch (e) {
      // If refresh fails, logout user
      await logout();
    }
  }

  // Logout user
  Future<void> logout() async {
    _setLoading(true);
    
    try {
      await _authService.logout();
      _user = null;
      _clearError();
    } catch (e) {
      _setError('Logout failed');
    } finally {
      _setLoading(false);
    }
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
    notifyListeners();
  }

  // Clear error manually (for UI)
  void clearError() {
    _clearError();
  }
}
