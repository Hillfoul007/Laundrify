class RiderModel {
  final String id;
  final String phoneNumber;
  final String name;
  final String? email;
  final String? vehicleType;
  final String? vehicleNumber;
  final String? licenseNumber;
  final bool isActive;
  final bool isVerified;
  final bool isOnline;
  final LocationModel? currentLocation;
  final EarningsModel earnings;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? profileImage;
  final double rating;
  final int totalDeliveries;

  RiderModel({
    required this.id,
    required this.phoneNumber,
    required this.name,
    this.email,
    this.vehicleType,
    this.vehicleNumber,
    this.licenseNumber,
    this.isActive = false,
    this.isVerified = false,
    this.isOnline = false,
    this.currentLocation,
    required this.earnings,
    required this.createdAt,
    required this.updatedAt,
    this.profileImage,
    this.rating = 0.0,
    this.totalDeliveries = 0,
  });

  factory RiderModel.fromJson(Map<String, dynamic> json) {
    return RiderModel(
      id: json['_id'] ?? json['id'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      name: json['name'] ?? '',
      email: json['email'],
      vehicleType: json['vehicleType'],
      vehicleNumber: json['vehicleNumber'],
      licenseNumber: json['licenseNumber'],
      isActive: json['isActive'] ?? false,
      isVerified: json['isVerified'] ?? false,
      isOnline: json['isOnline'] ?? false,
      currentLocation: json['currentLocation'] != null
          ? LocationModel.fromJson(json['currentLocation'])
          : null,
      earnings: json['earnings'] != null
          ? EarningsModel.fromJson(json['earnings'])
          : EarningsModel.empty(),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      profileImage: json['profileImage'],
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      totalDeliveries: json['totalDeliveries'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phoneNumber': phoneNumber,
      'name': name,
      'email': email,
      'vehicleType': vehicleType,
      'vehicleNumber': vehicleNumber,
      'licenseNumber': licenseNumber,
      'isActive': isActive,
      'isVerified': isVerified,
      'isOnline': isOnline,
      'currentLocation': currentLocation?.toJson(),
      'earnings': earnings.toJson(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'profileImage': profileImage,
      'rating': rating,
      'totalDeliveries': totalDeliveries,
    };
  }
}

class LocationModel {
  final double latitude;
  final double longitude;
  final DateTime timestamp;
  final double? accuracy;

  LocationModel({
    required this.latitude,
    required this.longitude,
    required this.timestamp,
    this.accuracy,
  });

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      timestamp: DateTime.parse(json['timestamp']),
      accuracy: (json['accuracy'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'timestamp': timestamp.toIso8601String(),
      'accuracy': accuracy,
    };
  }
}

class EarningsModel {
  final double todayEarnings;
  final double weekEarnings;
  final double monthEarnings;
  final double totalEarnings;
  final int todayDeliveries;
  final int weekDeliveries;
  final int monthDeliveries;

  EarningsModel({
    this.todayEarnings = 0.0,
    this.weekEarnings = 0.0,
    this.monthEarnings = 0.0,
    this.totalEarnings = 0.0,
    this.todayDeliveries = 0,
    this.weekDeliveries = 0,
    this.monthDeliveries = 0,
  });

  factory EarningsModel.fromJson(Map<String, dynamic> json) {
    return EarningsModel(
      todayEarnings: (json['todayEarnings'] as num?)?.toDouble() ?? 0.0,
      weekEarnings: (json['weekEarnings'] as num?)?.toDouble() ?? 0.0,
      monthEarnings: (json['monthEarnings'] as num?)?.toDouble() ?? 0.0,
      totalEarnings: (json['totalEarnings'] as num?)?.toDouble() ?? 0.0,
      todayDeliveries: json['todayDeliveries'] ?? 0,
      weekDeliveries: json['weekDeliveries'] ?? 0,
      monthDeliveries: json['monthDeliveries'] ?? 0,
    );
  }

  factory EarningsModel.empty() {
    return EarningsModel();
  }

  Map<String, dynamic> toJson() {
    return {
      'todayEarnings': todayEarnings,
      'weekEarnings': weekEarnings,
      'monthEarnings': monthEarnings,
      'totalEarnings': totalEarnings,
      'todayDeliveries': todayDeliveries,
      'weekDeliveries': weekDeliveries,
      'monthDeliveries': monthDeliveries,
    };
  }
}

class OrderModel {
  final String id;
  final String customerId;
  final String customerName;
  final String customerPhone;
  final String pickupAddress;
  final String deliveryAddress;
  final LocationModel pickupLocation;
  final LocationModel deliveryLocation;
  final String status; // assigned, picked_up, in_transit, delivered
  final double amount;
  final DateTime createdAt;
  final DateTime? pickupTime;
  final DateTime? deliveryTime;
  final String? instructions;
  final List<String> items;

  OrderModel({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerPhone,
    required this.pickupAddress,
    required this.deliveryAddress,
    required this.pickupLocation,
    required this.deliveryLocation,
    required this.status,
    required this.amount,
    required this.createdAt,
    this.pickupTime,
    this.deliveryTime,
    this.instructions,
    this.items = const [],
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['_id'] ?? json['id'] ?? '',
      customerId: json['customerId'] ?? '',
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      pickupAddress: json['pickupAddress'] ?? '',
      deliveryAddress: json['deliveryAddress'] ?? '',
      pickupLocation: LocationModel.fromJson(json['pickupLocation']),
      deliveryLocation: LocationModel.fromJson(json['deliveryLocation']),
      status: json['status'] ?? 'assigned',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      pickupTime: json['pickupTime'] != null ? DateTime.parse(json['pickupTime']) : null,
      deliveryTime: json['deliveryTime'] != null ? DateTime.parse(json['deliveryTime']) : null,
      instructions: json['instructions'],
      items: (json['items'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerId': customerId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'pickupAddress': pickupAddress,
      'deliveryAddress': deliveryAddress,
      'pickupLocation': pickupLocation.toJson(),
      'deliveryLocation': deliveryLocation.toJson(),
      'status': status,
      'amount': amount,
      'createdAt': createdAt.toIso8601String(),
      'pickupTime': pickupTime?.toIso8601String(),
      'deliveryTime': deliveryTime?.toIso8601String(),
      'instructions': instructions,
      'items': items,
    };
  }
}
