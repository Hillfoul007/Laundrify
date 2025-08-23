class UserModel {
  final String id;
  final String phoneNumber;
  final String? name;
  final String? email;
  final List<AddressModel> addresses;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isVerified;
  final String? profileImage;

  UserModel({
    required this.id,
    required this.phoneNumber,
    this.name,
    this.email,
    this.addresses = const [],
    required this.createdAt,
    required this.updatedAt,
    this.isVerified = false,
    this.profileImage,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      phoneNumber: json['phoneNumber'] ?? '',
      name: json['name'],
      email: json['email'],
      addresses: (json['addresses'] as List<dynamic>?)
          ?.map((address) => AddressModel.fromJson(address))
          .toList() ?? [],
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      isVerified: json['isVerified'] ?? false,
      profileImage: json['profileImage'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phoneNumber': phoneNumber,
      'name': name,
      'email': email,
      'addresses': addresses.map((address) => address.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'isVerified': isVerified,
      'profileImage': profileImage,
    };
  }

  UserModel copyWith({
    String? id,
    String? phoneNumber,
    String? name,
    String? email,
    List<AddressModel>? addresses,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isVerified,
    String? profileImage,
  }) {
    return UserModel(
      id: id ?? this.id,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      name: name ?? this.name,
      email: email ?? this.email,
      addresses: addresses ?? this.addresses,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isVerified: isVerified ?? this.isVerified,
      profileImage: profileImage ?? this.profileImage,
    );
  }
}

class AddressModel {
  final String id;
  final String type; // home, work, other
  final String fullAddress;
  final String? landmark;
  final String? instructions;
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  AddressModel({
    required this.id,
    required this.type,
    required this.fullAddress,
    this.landmark,
    this.instructions,
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      id: json['_id'] ?? json['id'] ?? '',
      type: json['type'] ?? 'other',
      fullAddress: json['fullAddress'] ?? '',
      landmark: json['landmark'],
      instructions: json['instructions'],
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      isDefault: json['isDefault'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'fullAddress': fullAddress,
      'landmark': landmark,
      'instructions': instructions,
      'latitude': latitude,
      'longitude': longitude,
      'isDefault': isDefault,
    };
  }

  AddressModel copyWith({
    String? id,
    String? type,
    String? fullAddress,
    String? landmark,
    String? instructions,
    double? latitude,
    double? longitude,
    bool? isDefault,
  }) {
    return AddressModel(
      id: id ?? this.id,
      type: type ?? this.type,
      fullAddress: fullAddress ?? this.fullAddress,
      landmark: landmark ?? this.landmark,
      instructions: instructions ?? this.instructions,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}
