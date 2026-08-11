# ParkingSpot – API Documentation

> **REST API Reference for Smart Parking Reservation Platform**

**Project:** ParkingSpot – Smart Parking Reservation  
**API Style:** RESTful  
**Backend:** Node.js + Express.js  
**Database:** MongoDB  
**Authentication:** JWT  
**Real-Time:** Socket.IO  
**Payment:** Razorpay / Stripe  
**Maps:** Google Maps API

---

# 1. API Overview

ParkingSpot exposes REST APIs for:

```text
Authentication
Users
Parking Facilities
Parking Slots
Availability
Bookings
Payments
QR / Token Verification
Cancellations
Analytics
Notifications
Reviews
Admin Management
```

The backend acts as the authoritative source for:

- User authentication
- Role authorization
- Parking availability
- Booking creation
- Booking conflicts
- Payment verification
- QR verification
- Cancellation
- Occupancy state

---

# 2. Base URL

## Development

```text
http://localhost:5000/api
```

## Production

```text
https://your-api-domain.com/api
```

The production URL should be configured through the frontend environment variables.

Example:

```env
VITE_API_BASE_URL=https://your-api-domain.com/api
```

---

# 3. API Versioning

Recommended structure:

```text
/api/v1
```

Example:

```text
/api/v1/auth/login
/api/v1/parking
/api/v1/bookings
```

For the initial implementation, either `/api` or `/api/v1` can be used consistently. Versioning is recommended for future scalability.

---

# 4. Authentication

ParkingSpot uses JWT-based authentication.

After successful login, the server returns a JWT.

The frontend sends it with protected requests:

```http
Authorization: Bearer <JWT_TOKEN>
```

Example:

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOi...
```

---

# 5. User Roles

ParkingSpot supports three primary roles:

| Role | Description |
|---|---|
| `COMMUTER` | Searches and books parking |
| `OWNER` | Manages parking facilities and slots |
| `ADMIN` | Manages the complete platform |

---

# 6. Standard Response Format

## Success

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

## Error

```json
{
  "success": false,
  "message": "Something went wrong",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

---

# 7. HTTP Status Codes

| Status | Meaning |
|---:|---|
| 200 | Successful request |
| 201 | Resource created |
| 204 | Successful request with no content |
| 400 | Bad request |
| 401 | Authentication required |
| 403 | Permission denied |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Validation error |
| 429 | Too many requests |
| 500 | Internal server error |

---

# 8. Authentication APIs

## 8.1 Register User

```http
POST /api/auth/register
```

### Access

Public

### Request

```json
{
  "name": "Mohamed",
  "email": "user@example.com",
  "password": "StrongPassword123",
  "phone": "+919876543210",
  "role": "COMMUTER"
}
```

### Response

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "665abc123",
      "name": "Mohamed",
      "email": "user@example.com",
      "role": "COMMUTER"
    }
  }
}
```

### Validation

- Name required
- Valid email required
- Password minimum length
- Email must be unique
- Role must be a supported role

For security, public registration should normally allow only `COMMUTER`. Owner/admin accounts should be created or approved through controlled workflows.

---

# 8.2 Login

```http
POST /api/auth/login
```

### Access

Public

### Request

```json
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```

### Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "JWT_TOKEN",
    "user": {
      "id": "665abc123",
      "name": "Mohamed",
      "email": "user@example.com",
      "role": "COMMUTER"
    }
  }
}
```

---

# 8.3 Get Current User

```http
GET /api/auth/me
```

### Access

Authenticated users

### Headers

```http
Authorization: Bearer <JWT_TOKEN>
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "665abc123",
    "name": "Mohamed",
    "email": "user@example.com",
    "role": "COMMUTER"
  }
}
```

---

# 8.4 Update Profile

```http
PUT /api/auth/profile
```

### Access

Authenticated users

### Request

```json
{
  "name": "Mohamed Nifras",
  "phone": "+919876543210"
}
```

---

# 9. User APIs

## 9.1 Get User Profile

```http
GET /api/users/:id
```

### Access

Authenticated user / Admin

---

## 9.2 Update User

```http
PUT /api/users/:id
```

### Access

User / Admin

### Request

```json
{
  "name": "Updated Name",
  "phone": "+919876543210"
}
```

---

## 9.3 Delete User

```http
DELETE /api/users/:id
```

### Access

Admin

---

# 10. Parking APIs

## 10.1 Create Parking Facility

```http
POST /api/parking
```

### Access

Owner

### Request

```json
{
  "name": "City Center Parking",
  "description": "Secure parking facility near city center",
  "address": "Coimbatore, Tamil Nadu",
  "latitude": 11.0168,
  "longitude": 76.9558,
  "openingTime": "06:00",
  "closingTime": "23:00"
}
```

### Response

```json
{
  "success": true,
  "message": "Parking facility created",
  "data": {
    "parkingId": "PARK123456",
    "name": "City Center Parking",
    "status": "PENDING_APPROVAL"
  }
}
```

---

# 10.2 Get All Parking Facilities

```http
GET /api/parking
```

### Access

Public

### Query Parameters

```text
?page=1
&limit=10
&search=city
&latitude=11.0168
&longitude=76.9558
&radius=5
&minPrice=10
&maxPrice=100
&vehicleType=CAR
```

### Example

```http
GET /api/parking?search=city&vehicleType=CAR&page=1&limit=10
```

---

# 10.3 Get Parking Details

```http
GET /api/parking/:id
```

### Access

Public

### Response

```json
{
  "success": true,
  "data": {
    "id": "PARK123456",
    "name": "City Center Parking",
    "address": "Coimbatore, Tamil Nadu",
    "latitude": 11.0168,
    "longitude": 76.9558,
    "openingTime": "06:00",
    "closingTime": "23:00",
    "availableSlots": 24,
    "totalSlots": 50
  }
}
```

---

# 10.4 Update Parking

```http
PUT /api/parking/:id
```

### Access

Owner of parking / Admin

### Request

```json
{
  "name": "City Center Parking Updated",
  "openingTime": "05:00",
  "closingTime": "23:30"
}
```

---

# 10.5 Delete Parking

```http
DELETE /api/parking/:id
```

### Access

Owner / Admin

---

# 10.6 Approve Parking

```http
PUT /api/admin/parking/:id/approve
```

### Access

Admin

### Response

```json
{
  "success": true,
  "message": "Parking facility approved"
}
```

---

# 10.7 Reject Parking

```http
PUT /api/admin/parking/:id/reject
```

### Access

Admin

### Request

```json
{
  "reason": "Required information is incomplete"
}
```

---

# 11. Parking Slot APIs

## 11.1 Create Slot

```http
POST /api/parking/:parkingId/slots
```

### Access

Parking Owner

### Request

```json
{
  "slotNumber": "A-101",
  "vehicleType": "CAR",
  "pricePerHour": 50
}
```

### Response

```json
{
  "success": true,
  "message": "Parking slot created",
  "data": {
    "id": "SLOT123",
    "slotNumber": "A-101",
    "status": "AVAILABLE"
  }
}
```

---

# 11.2 Get Parking Slots

```http
GET /api/parking/:parkingId/slots
```

### Access

Public / Owner

### Query

```text
?status=AVAILABLE
&vehicleType=CAR
```

---

# 11.3 Get Slot Details

```http
GET /api/slots/:id
```

### Access

Authenticated / Public depending on implementation

---

# 11.4 Update Slot

```http
PUT /api/slots/:id
```

### Access

Owner / Admin

### Request

```json
{
  "pricePerHour": 60,
  "status": "AVAILABLE"
}
```

---

# 11.5 Delete Slot

```http
DELETE /api/slots/:id
```

### Access

Owner / Admin

---

# 11.6 Update Slot Status

```http
PATCH /api/slots/:id/status
```

### Access

Owner / Admin / Internal services

### Request

```json
{
  "status": "MAINTENANCE"
}
```

---

# 12. Availability APIs

## 12.1 Check Availability

```http
GET /api/availability
```

### Access

Public / Authenticated

### Query Parameters

```text
parkingId
date
startTime
endTime
vehicleType
```

### Example

```http
GET /api/availability?parkingId=PARK123&date=2026-08-20&startTime=10:00&endTime=12:00&vehicleType=CAR
```

### Response

```json
{
  "success": true,
  "data": {
    "parkingId": "PARK123",
    "date": "2026-08-20",
    "startTime": "10:00",
    "endTime": "12:00",
    "availableSlots": [
      {
        "id": "SLOT001",
        "slotNumber": "A-101",
        "vehicleType": "CAR",
        "pricePerHour": 50
      },
      {
        "id": "SLOT002",
        "slotNumber": "A-102",
        "vehicleType": "CAR",
        "pricePerHour": 50
      }
    ]
  }
}
```

---

# 13. Availability Logic

The backend must check booking conflicts.

An existing booking conflicts with a requested booking when:

```text
requestedStart < existingEnd
AND
requestedEnd > existingStart
```

If a conflict exists:

```text
SLOT = UNAVAILABLE
```

Otherwise:

```text
SLOT = AVAILABLE
```

The frontend must never be trusted as the final authority for slot availability.

---

# 14. Booking APIs

## 14.1 Create Booking

```http
POST /api/bookings
```

### Access

Commuter

### Request

```json
{
  "parkingId": "PARK123",
  "slotId": "SLOT001",
  "date": "2026-08-20",
  "startTime": "10:00",
  "endTime": "12:00"
}
```

### Response

```json
{
  "success": true,
  "message": "Booking created",
  "data": {
    "bookingId": "BK20260820001",
    "status": "PENDING",
    "amount": 100
  }
}
```

---

# 14.2 Get My Bookings

```http
GET /api/bookings/my
```

### Access

Commuter

### Query

```text
?page=1
&limit=10
&status=CONFIRMED
```

---

# 14.3 Get Booking Details

```http
GET /api/bookings/:id
```

### Access

Booking owner / Parking Owner / Admin

---

# 14.4 Get Owner Bookings

```http
GET /api/owner/bookings
```

### Access

Owner

### Query

```text
?status=CONFIRMED
&page=1
&limit=20
```

---

# 14.5 Get All Bookings

```http
GET /api/admin/bookings
```

### Access

Admin

### Query

```text
?status=CONFIRMED
&date=2026-08-20
&page=1
&limit=20
```

---

# 15. Booking Status

Supported statuses:

```text
PENDING
CONFIRMED
ACTIVE
COMPLETED
CANCELLED
EXPIRED
PAYMENT_FAILED
```

### Lifecycle

```text
PENDING
   │
   ├── Payment Success → CONFIRMED
   │
   ├── Payment Failure → PAYMENT_FAILED
   │
   └── Timeout → EXPIRED

CONFIRMED
   │
   ├── Start Time → ACTIVE
   │
   └── Cancel → CANCELLED

ACTIVE
   │
   └── End Time → COMPLETED
```

---

# 16. Payment APIs

Razorpay is recommended as the primary payment provider.

---

## 16.1 Create Payment Order

```http
POST /api/payments/create-order
```

### Access

Authenticated Commuter

### Request

```json
{
  "bookingId": "BK20260820001"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "orderId": "order_ABC123",
    "amount": 100,
    "currency": "INR"
  }
}
```

---

# 16.2 Verify Payment

```http
POST /api/payments/verify
```

### Access

Authenticated

### Request

```json
{
  "bookingId": "BK20260820001",
  "razorpayOrderId": "order_ABC123",
  "razorpayPaymentId": "pay_ABC123",
  "razorpaySignature": "SIGNATURE"
}
```

### Response

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "bookingStatus": "CONFIRMED"
  }
}
```

Payment signatures must be verified on the backend.

---

# 16.3 Payment Details

```http
GET /api/payments/:id
```

### Access

Payment owner / Owner / Admin

---

# 16.4 Booking Payment History

```http
GET /api/payments/my
```

### Access

Commuter

---

# 16.5 Refund Payment

```http
POST /api/payments/:id/refund
```

### Access

Authorized backend/admin workflow

### Request

```json
{
  "reason": "Booking cancelled"
}
```

---

# 17. QR / Token APIs

## 17.1 Generate Parking QR

```http
GET /api/bookings/:id/qr
```

### Access

Booking owner

### Response

```json
{
  "success": true,
  "data": {
    "bookingId": "BK20260820001",
    "qrToken": "SECURE_TOKEN",
    "qrImage": "BASE64_OR_URL"
  }
}
```

Sensitive user information should not be embedded directly in the QR.

---

# 18. Verify QR

```http
POST /api/qr/verify
```

### Access

Owner / Authorized verifier

### Request

```json
{
  "token": "SECURE_TOKEN"
}
```

### Valid Response

```json
{
  "success": true,
  "data": {
    "valid": true,
    "bookingId": "BK20260820001",
    "slotNumber": "A-101",
    "parkingName": "City Center Parking",
    "status": "CONFIRMED"
  }
}
```

### Invalid Response

```json
{
  "success": false,
  "message": "Invalid or expired parking token",
  "error": {
    "code": "QR_INVALID"
  }
}
```

---

# 19. QR Validation Rules

The backend should verify:

```text
Token exists
Token is authentic
Booking exists
Booking is not cancelled
Booking is not expired
Booking belongs to the correct parking facility
Booking date is valid
Booking time is valid
```

---

# 20. Cancellation APIs

## 20.1 Cancel Booking

```http
PUT /api/bookings/:id/cancel
```

### Access

Booking owner

### Request

```json
{
  "reason": "Plans changed"
}
```

### Response

```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "bookingStatus": "CANCELLED",
    "refundAmount": 80
  }
}
```

---

# 21. Cancellation Rules

Example policy:

```text
More than 24 hours before start
→ Full refund

12–24 hours
→ Partial refund

Less than 12 hours
→ No refund
```

The actual cancellation policy should be configurable.

---

# 22. Occupancy APIs

## 22.1 Current Occupancy

```http
GET /api/parking/:parkingId/occupancy
```

### Access

Owner / Admin

### Response

```json
{
  "success": true,
  "data": {
    "totalSlots": 100,
    "availableSlots": 62,
    "reservedSlots": 20,
    "occupiedSlots": 15,
    "maintenanceSlots": 3,
    "occupancyRate": 35
  }
}
```

---

# 23. Owner Analytics APIs

## 23.1 Dashboard Summary

```http
GET /api/analytics/owner/summary
```

### Access

Owner

### Response

```json
{
  "success": true,
  "data": {
    "totalBookings": 450,
    "activeBookings": 18,
    "completedBookings": 390,
    "cancelledBookings": 42,
    "revenue": 125000,
    "occupancyRate": 72
  }
}
```

---

# 24. Revenue Analytics

```http
GET /api/analytics/owner/revenue
```

### Query

```text
?period=daily
&from=2026-08-01
&to=2026-08-31
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "date": "2026-08-01",
      "revenue": 5000
    },
    {
      "date": "2026-08-02",
      "revenue": 6200
    }
  ]
}
```

---

# 25. Peak Hour Analytics

```http
GET /api/analytics/owner/peak-hours
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "hour": "09:00",
      "bookings": 35
    },
    {
      "hour": "10:00",
      "bookings": 48
    },
    {
      "hour": "11:00",
      "bookings": 52
    }
  ]
}
```

---

# 26. Slot Performance

```http
GET /api/analytics/owner/slots
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "slotNumber": "A-101",
      "bookingCount": 75,
      "revenue": 37500
    },
    {
      "slotNumber": "A-102",
      "bookingCount": 62,
      "revenue": 31000
    }
  ]
}
```

---

# 27. Admin Analytics APIs

## 27.1 Platform Summary

```http
GET /api/analytics/admin/summary
```

### Access

Admin

### Response

```json
{
  "success": true,
  "data": {
    "totalUsers": 5000,
    "totalOwners": 250,
    "totalParkingFacilities": 180,
    "totalBookings": 45000,
    "totalRevenue": 8500000,
    "activeBookings": 320
  }
}
```

---

# 28. Notification APIs

## 28.1 Get Notifications

```http
GET /api/notifications
```

### Access

Authenticated user

### Query

```text
?page=1
&limit=20
&unread=true
```

---

# 28.2 Mark Notification Read

```http
PATCH /api/notifications/:id/read
```

### Access

Notification owner

---

# 28.3 Mark All Notifications Read

```http
PATCH /api/notifications/read-all
```

---

# 29. Review APIs

## 29.1 Create Review

```http
POST /api/parking/:parkingId/reviews
```

### Access

Commuter with eligible completed booking

### Request

```json
{
  "rating": 5,
  "comment": "Clean and convenient parking facility."
}
```

---

# 30. Get Parking Reviews

```http
GET /api/parking/:parkingId/reviews
```

### Query

```text
?page=1
&limit=10
&rating=5
```

---

# 31. Admin User APIs

## 31.1 Get All Users

```http
GET /api/admin/users
```

### Query

```text
?role=COMMUTER
&page=1
&limit=20
&search=mohamed
```

---

# 32. Update User Status

```http
PATCH /api/admin/users/:id/status
```

### Request

```json
{
  "status": "SUSPENDED"
}
```

Supported statuses:

```text
ACTIVE
SUSPENDED
BLOCKED
```

---

# 33. Admin Owner APIs

## Get Owners

```http
GET /api/admin/owners
```

---

## Approve Owner

```http
PUT /api/admin/owners/:id/approve
```

---

## Suspend Owner

```http
PUT /api/admin/owners/:id/suspend
```

---

# 34. Admin Booking APIs

## Get All Bookings

```http
GET /api/admin/bookings
```

### Filters

```text
status
date
parkingId
ownerId
userId
page
limit
```

---

# 35. Admin Payment APIs

## Get Payments

```http
GET /api/admin/payments
```

### Filters

```text
status
from
to
parkingId
ownerId
```

---

# 36. Health API

## Server Health

```http
GET /api/health
```

### Response

```json
{
  "success": true,
  "message": "ParkingSpot API is running",
  "data": {
    "status": "healthy",
    "timestamp": "2026-08-11T10:00:00.000Z"
  }
}
```

---

# 37. API Middleware

Every protected API should follow:

```text
Request
   │
   ▼
Rate Limiter
   │
   ▼
CORS
   │
   ▼
JWT Authentication
   │
   ▼
Role Authorization
   │
   ▼
Validation
   │
   ▼
Controller
   │
   ▼
Service
   │
   ▼
Database
```

---

# 38. Authentication Middleware

Example:

```text
authMiddleware
```

Responsibilities:

- Extract JWT
- Verify JWT
- Find user
- Attach user to request
- Reject invalid tokens

Example:

```js
req.user = {
  id: user._id,
  role: user.role
};
```

---

# 39. Role Middleware

Example:

```text
authorize("OWNER")
```

or:

```text
authorize("ADMIN", "OWNER")
```

Example:

```text
GET /api/analytics/owner/summary

Required:
OWNER
```

---

# 40. Validation

All important request bodies must be validated.

Validation should cover:

```text
Email
Password
Phone
Date
Time
Price
Coordinates
Slot ID
Parking ID
Booking ID
Payment ID
```

Invalid requests should return:

```http
422 Unprocessable Entity
```

---

# 41. Pagination

Large API responses should support pagination.

Example:

```text
?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

# 42. Search and Filtering

Parking search should support:

```text
search
location
latitude
longitude
radius
vehicleType
price
availability
rating
```

Example:

```http
GET /api/parking?search=Gandhipuram&vehicleType=CAR&maxPrice=100
```

---

# 43. Sorting

Supported examples:

```text
sort=price_asc
sort=price_desc
sort=rating
sort=distance
sort=popular
```

Example:

```http
GET /api/parking?sort=distance
```

---

# 44. Real-Time Socket API

REST APIs handle persistent operations.

Socket.IO handles real-time events.

Connection:

```text
/socket.io
```

---

# 45. Socket Events

## Slot Updated

```text
slot:updated
```

Payload:

```json
{
  "slotId": "SLOT001",
  "status": "RESERVED"
}
```

---

## Slot Released

```text
slot:released
```

Payload:

```json
{
  "slotId": "SLOT001",
  "status": "AVAILABLE"
}
```

---

## Booking Confirmed

```text
booking:confirmed
```

Payload:

```json
{
  "bookingId": "BK123",
  "slotId": "SLOT001",
  "status": "CONFIRMED"
}
```

---

## Booking Cancelled

```text
booking:cancelled
```

Payload:

```json
{
  "bookingId": "BK123",
  "slotId": "SLOT001",
  "status": "CANCELLED"
}
```

---

# 46. Booking API Flow

The recommended booking workflow is:

```text
POST /availability
        │
        ▼
Check Slots
        │
        ▼
POST /bookings
        │
        ▼
Create PENDING Booking
        │
        ▼
POST /payments/create-order
        │
        ▼
User Payment
        │
        ▼
POST /payments/verify
        │
        ▼
CONFIRMED
        │
        ▼
Generate QR
        │
        ▼
Parking Pass
```

---

# 47. Cancellation API Flow

```text
PUT /bookings/:id/cancel
        │
        ▼
Validate User
        │
        ▼
Validate Booking
        │
        ▼
Check Cancellation Policy
        │
        ▼
CANCELLED
        │
        ▼
Release Slot
        │
        ▼
Refund if Applicable
        │
        ▼
Notification
```

---

# 48. QR Verification Flow

```text
QR Scanner
    │
    ▼
POST /api/qr/verify
    │
    ▼
Validate Token
    │
    ▼
Find Booking
    │
    ▼
Validate Date
    │
    ▼
Validate Time
    │
    ▼
Validate Status
    │
    ▼
VALID / INVALID
```

---

# 49. Error Codes

Recommended error codes:

```text
AUTH_REQUIRED
INVALID_TOKEN
TOKEN_EXPIRED
ACCESS_DENIED

VALIDATION_ERROR
RESOURCE_NOT_FOUND
USER_NOT_FOUND
PARKING_NOT_FOUND
SLOT_NOT_FOUND
BOOKING_NOT_FOUND

SLOT_UNAVAILABLE
BOOKING_CONFLICT
BOOKING_EXPIRED
BOOKING_ALREADY_CANCELLED

PAYMENT_FAILED
PAYMENT_VERIFICATION_FAILED
REFUND_FAILED

QR_INVALID
QR_EXPIRED

OWNER_NOT_APPROVED
PARKING_NOT_APPROVED

RATE_LIMITED
INTERNAL_SERVER_ERROR
```

---

# 50. Security Requirements

The API must implement:

```text
JWT Authentication
Role-Based Authorization
Password Hashing
Input Validation
Rate Limiting
CORS
Helmet
Secure Environment Variables
Payment Signature Verification
QR Token Validation
Ownership Validation
```

Never return:

```text
Password
Password Hash
JWT Secret
Payment Secret
API Secret
Internal Stack Trace
```

---

# 51. Ownership Security

An owner must only access their own parking resources.

Example:

```text
Owner A
   │
   └── Parking A
```

Owner A must not be able to modify:

```text
Parking B
Parking B Slots
Parking B Bookings
Parking B Revenue
```

The backend must verify ownership even if the frontend hides those resources.

---

# 52. Booking Security

Before retrieving or modifying a booking:

```text
1. Verify JWT
2. Find booking
3. Check user ownership OR authorized role
4. Perform operation
```

Never trust a `userId` supplied by the client.

The authenticated user should come from the verified JWT.

---

# 53. Double Booking Protection

The booking API must perform availability validation immediately before reservation.

```text
Client
 ↓
Booking Request
 ↓
Backend Availability Check
 ↓
Atomic Reservation / Transaction Strategy
 ↓
Booking Created
```

A slot shown as available earlier may become unavailable before the booking request reaches the server.

The backend must always perform a final availability check.

---

# 54. API Testing with Postman

Recommended Postman collection:

```text
ParkingSpot API
│
├── 01 Authentication
│   ├── Register
│   ├── Login
│   └── Get Me
│
├── 02 Users
│
├── 03 Parking
│   ├── Create
│   ├── List
│   ├── Details
│   ├── Update
│   └── Delete
│
├── 04 Slots
│   ├── Create
│   ├── List
│   ├── Update
│   └── Delete
│
├── 05 Availability
│
├── 06 Bookings
│   ├── Create
│   ├── My Bookings
│   ├── Details
│   └── Cancel
│
├── 07 Payments
│   ├── Create Order
│   ├── Verify
│   └── Refund
│
├── 08 QR
│   ├── Generate
│   └── Verify
│
├── 09 Analytics
│   ├── Owner
│   └── Admin
│
├── 10 Notifications
│
├── 11 Reviews
│
└── 12 Admin
    ├── Users
    ├── Owners
    ├── Parking
    ├── Bookings
    └── Payments
```

---

# 55. Postman Environment

Create a Postman environment:

```json
{
  "baseUrl": "http://localhost:5000/api",
  "token": "",
  "userId": "",
  "parkingId": "",
  "slotId": "",
  "bookingId": "",
  "paymentId": ""
}
```

Then requests can use:

```text
{{baseUrl}}
{{token}}
{{parkingId}}
{{slotId}}
{{bookingId}}
```

---

# 56. Recommended API Development Order

Build APIs in this order:

```text
1. Health
2. Authentication
3. Users
4. Parking
5. Slots
6. Availability
7. Bookings
8. Payments
9. QR
10. Cancellation
11. Occupancy
12. Notifications
13. Reviews
14. Owner Analytics
15. Admin APIs
```

This order follows the actual dependency chain of the application.

---

# 57. Complete API Dependency

```text
                    AUTH
                     │
                     ▼
                  USERS
                     │
                     ▼
                 PARKING
                     │
                     ▼
                   SLOTS
                     │
                     ▼
               AVAILABILITY
                     │
                     ▼
                  BOOKING
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       PAYMENT                 QR
          │                     │
          └──────────┬──────────┘
                     ▼
                CANCELLATION
                     │
                     ▼
                 OCCUPANCY
                     │
                     ▼
                 ANALYTICS
```

---

# 58. API Completion Checklist

## Authentication

- [ ] Register
- [ ] Login
- [ ] JWT
- [ ] Current user
- [ ] Profile

## Parking

- [ ] Create
- [ ] Read
- [ ] Update
- [ ] Delete
- [ ] Search
- [ ] Filter
- [ ] Map location

## Slots

- [ ] Create
- [ ] Read
- [ ] Update
- [ ] Delete
- [ ] Status

## Availability

- [ ] Date
- [ ] Time
- [ ] Vehicle type
- [ ] Conflict detection
- [ ] Double booking prevention

## Booking

- [ ] Create
- [ ] Read
- [ ] History
- [ ] Status
- [ ] Completion
- [ ] Expiration

## Payment

- [ ] Create order
- [ ] Verify
- [ ] Transaction history
- [ ] Refund

## QR

- [ ] Generate
- [ ] Display
- [ ] Verify
- [ ] Expire

## Cancellation

- [ ] Request
- [ ] Policy
- [ ] Refund
- [ ] Release slot

## Analytics

- [ ] Revenue
- [ ] Bookings
- [ ] Occupancy
- [ ] Peak hours
- [ ] Slot performance

## Admin

- [ ] Users
- [ ] Owners
- [ ] Parking
- [ ] Bookings
- [ ] Payments
- [ ] Reports

---

# 59. Final API Architecture

```text
                         PARKINGSPOT API
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   AUTHENTICATION          PARKING                BOOKINGS
        │                      │                      │
        ▼                      ▼                      ▼
      USERS                  SLOTS                 PAYMENT
                               │                      │
                               ▼                      ▼
                         AVAILABILITY                QR
                                                      │
                                                      ▼
                                                CANCELLATION
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   NOTIFICATIONS           REVIEWS               ANALYTICS
                                                       │
                                                       ▼
                                                     ADMIN
```

---

# 60. Final API Principle

ParkingSpot follows a simple rule:

> **The frontend requests. The backend validates. The service layer decides. The database stores.**

The frontend must never independently decide:

- Whether a slot is truly available
- Whether a booking is valid
- Whether a payment succeeded
- Whether a QR token is valid
- Whether a user can access a resource
- Whether a cancellation is allowed

All critical business decisions must be enforced by the backend.

```text
React
  ↓
REST API
  ↓
JWT + RBAC
  ↓
Validation
  ↓
Controller
  ↓
Service
  ↓
MongoDB
  ↓
Response
  ↓
React
```

This API architecture provides ParkingSpot with a clean, secure, testable foundation for the complete **parking discovery → availability → booking → payment → QR verification → cancellation → analytics** lifecycle.