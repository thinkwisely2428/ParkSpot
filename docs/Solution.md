# ParkingSpot – Smart Parking Reservation

# Solution Document

**Project Name:** ParkingSpot  
**Project Type:** Software-Only Smart Parking Reservation Web Application  
**Architecture:** Modular Monolithic Architecture  
**Frontend:** React.js + Tailwind CSS  
**Backend:** Node.js + Express.js  
**Database:** MongoDB  
**Authentication:** JWT  
**Real-Time Communication:** Socket.IO  
**Development Tools:** Visual Studio Code, Git, GitHub, Postman

---

# 1. Solution Overview

ParkingSpot is a software-based smart parking reservation platform designed to solve the challenges of parking discovery, availability tracking, reservation management, digital verification, and parking facility administration.

The system provides a unified web platform for three primary roles:

```text
ADMIN
OWNER
COMMUTER
```

The commuter can discover parking facilities, check availability, reserve parking slots, make payments, receive a QR/token-based parking pass, and manage bookings.

Parking owners can manage parking facilities, create and manage digital parking slots, monitor reservations, track software-based occupancy, and analyze revenue and parking utilization.

Administrators can manage users, owners, parking facilities, bookings, payments, and platform-wide analytics.

---

# 2. Problem

Traditional parking management commonly depends on manual processes.

### Problems faced by commuters

- Difficulty finding parking
- Lack of accurate availability information
- Long waiting times
- No advance reservation
- Manual ticket handling
- Unclear pricing
- Difficulty tracking previous bookings
- Limited cancellation options

### Problems faced by parking owners

- Manual slot management
- Paper-based reservations
- Difficulty tracking occupancy
- Limited revenue visibility
- No centralized booking system
- Difficult cancellation management
- Lack of analytics

---

# 3. Proposed Solution

ParkingSpot solves these problems through a centralized digital platform.

```text
                    PARKINGSPOT
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     COMMUTER          OWNER            ADMIN
        │                │                │
        ▼                ▼                ▼
 Find Parking       Manage Parking    Manage Platform
 Check Slots        Manage Slots      Manage Users
 Book Slot          View Bookings     Approve Owners
 Pay Online         Track Occupancy   View Analytics
 Get QR Pass        Revenue Reports   Manage Payments
```

---

# 4. Software-Only Approach

ParkingSpot is intentionally designed without mandatory hardware.

The system does not depend on:

- IoT parking sensors
- RFID readers
- Arduino
- ESP32
- Raspberry Pi
- Physical QR scanners
- Automated barriers
- Dedicated cameras

Instead, parking availability is managed digitally.

```text
Booking Data
     +
Current Time
     +
Slot State
     ↓
Availability Engine
     ↓
Digital Slot Status
```

This makes the project suitable for a pure web application.

---

# 5. Core Solution Modules

The system consists of the following major modules:

```text
1. Authentication
2. User Management
3. Parking Management
4. Slot Management
5. Availability Management
6. Booking Management
7. Payment Management
8. QR/Token Management
9. Cancellation Management
10. Occupancy Management
11. Real-Time Updates
12. Analytics
13. Notification Management
14. Administration
```

---

# 6. System Architecture

ParkingSpot follows a **Modular Monolithic Architecture**.

```text
                         React Frontend
                               │
                         HTTPS / REST
                               │
                               ▼
                    Node.js + Express API
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
 Authentication            Parking                 Booking
    Module                 Module                  Module
       │                       │                       │
       ▼                       ▼                       ▼
    Users                  Slots                  Reservations
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
          Payment           QR/Token         Analytics
           Module            Module            Module
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                               ▼
                           MongoDB
                               │
                  ┌────────────┴────────────┐
                  ▼                         ▼
              Socket.IO                 Cron Jobs
          Real-Time Updates        Booking Expiration
```

---

# 7. User Roles

## 7.1 Commuter

The commuter is the primary consumer of parking services.

### Features

- Registration
- Login
- Parking search
- Map-based parking discovery
- Availability checking
- Slot selection
- Booking
- Online payment
- QR generation
- Token generation
- Booking history
- Cancellation
- Refund tracking
- Profile management

---

# 8. Parking Owner

The parking owner manages one or more parking facilities.

### Features

- Owner registration
- Parking registration
- Parking information management
- Parking image management
- Slot creation
- Slot editing
- Slot deletion
- Pricing management
- Booking management
- QR verification
- Occupancy monitoring
- Revenue analytics
- Peak-hour analysis

---

# 9. Administrator

The administrator manages the overall platform.

### Features

- User management
- Owner management
- Parking approval
- Parking rejection
- Booking monitoring
- Payment monitoring
- Revenue analytics
- Platform analytics
- Account suspension
- System configuration

---

# 10. Authentication Solution

JWT-based authentication is used.

### Registration

```text
User
 ↓
Registration Form
 ↓
POST /api/auth/register
 ↓
Validate Input
 ↓
Hash Password
 ↓
Store User
 ↓
Return Success
```

### Login

```text
User
 ↓
Login
 ↓
POST /api/auth/login
 ↓
Verify Credentials
 ↓
Generate JWT
 ↓
Return Token
```

The token is used for protected API requests.

---

# 11. Role-Based Authorization

Authentication verifies who the user is.

Authorization verifies what the user can do.

Example:

```text
JWT
 ↓
Authentication Middleware
 ↓
Role Middleware
 ↓
Controller
```

Example permissions:

| Feature | Admin | Owner | Commuter |
|---|---:|---:|---:|
| Manage Users | ✅ | ❌ | ❌ |
| Manage Parking | ✅ | ✅ | ❌ |
| Manage Slots | ✅ | ✅ | ❌ |
| Search Parking | ✅ | ✅ | ✅ |
| Book Slot | ❌ | Optional | ✅ |
| Payment | ❌ | ❌ | ✅ |
| View Own Bookings | ❌ | ❌ | ✅ |
| View Parking Bookings | ✅ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ❌ |
| QR Verification | ✅ | ✅ | ❌ |

---

# 12. Parking Discovery Solution

Users can search for parking using:

- Location
- Parking name
- Date
- Time
- Vehicle type
- Price
- Availability

The frontend sends search parameters to the backend.

```text
Search Form
     ↓
React
     ↓
GET /api/parking
     ↓
Express
     ↓
MongoDB
     ↓
Filtered Parking Results
     ↓
React UI
```

---

# 13. Map Integration

Google Maps can be used to display parking locations.

Each parking facility stores:

```text
latitude
longitude
address
```

The frontend displays the parking location on the map.

Users can:

- View nearby parking
- View parking markers
- View distance
- Open parking details
- Navigate to the parking location

---

# 14. Digital Parking Slot Solution

Every parking facility contains digital slots.

Example:

```text
Parking A

A1  A2  A3  A4
🟢  🟢  🔴  🟠

B1  B2  B3  B4
🟢  🔴  🟢  🟢
```

Slot states:

```text
AVAILABLE
RESERVED
OCCUPIED
MAINTENANCE
```

---

# 15. Availability Engine

The availability engine determines whether a slot can be booked.

### Input

```text
Parking ID
Date
Start Time
End Time
```

### Processing

```text
Find Parking
     ↓
Find Slots
     ↓
Find Existing Bookings
     ↓
Check Time Conflicts
     ↓
Remove Unavailable Slots
     ↓
Return Available Slots
```

---

# 16. Double Booking Prevention

Double booking is prevented at the backend.

Example:

Existing booking:

```text
A10
10:00 AM → 12:00 PM
```

New request:

```text
A10
11:00 AM → 1:00 PM
```

The backend detects an overlap.

Result:

```text
❌ Booking rejected
```

The user must select another slot or time.

---

# 17. Temporary Slot Lock

When the user begins payment, the slot can temporarily enter:

```text
PAYMENT_PENDING
```

Workflow:

```text
AVAILABLE
     ↓
PAYMENT_PENDING
     ↓
Payment Success
     ↓
CONFIRMED
```

If payment fails:

```text
PAYMENT_PENDING
     ↓
AVAILABLE
```

A timeout mechanism automatically releases abandoned slots.

---

# 18. Booking Solution

Booking creation follows this workflow:

```text
User selects parking
        ↓
Select date/time
        ↓
Check availability
        ↓
Select slot
        ↓
Calculate price
        ↓
Temporary slot lock
        ↓
Create payment
        ↓
Payment verification
        ↓
Confirm booking
        ↓
Generate QR/token
        ↓
Booking confirmation
```

---

# 19. Booking Data

Each booking contains:

```text
Booking ID
User ID
Owner ID
Parking ID
Slot ID
Vehicle Information
Date
Start Time
End Time
Amount
Payment Status
Booking Status
QR Token
Created At
Updated At
```

---

# 20. Booking Status Lifecycle

```text
                    ┌──────────────┐
                    │    PENDING   │
                    └──────┬───────┘
                           │
                    Payment Success
                           │
                           ▼
                    ┌──────────────┐
                    │   CONFIRMED  │
                    └──────┬───────┘
                           │
                     Start Time
                           │
                           ▼
                    ┌──────────────┐
                    │    ACTIVE    │
                    └──────┬───────┘
                           │
                      End Time
                           │
                           ▼
                    ┌──────────────┐
                    │   COMPLETED  │
                    └──────────────┘

CONFIRMED
    │
    │ Cancel
    ▼
CANCELLED
```

---

# 21. Booking History Solution

The commuter can access:

```text
Upcoming
Active
Completed
Cancelled
Expired
```

Example UI:

```text
My Bookings

┌───────────────────────────┐
│ City Center Parking      │
│ Slot A12                 │
│ 15 Aug | 10 AM - 12 PM   │
│ ₹120                     │
│ CONFIRMED                │
│ [View Pass]              │
└───────────────────────────┘
```

---

# 22. Payment Solution

Razorpay can be used as the primary payment gateway.

Optional Stripe integration can be added.

### Payment Flow

```text
Booking Request
      ↓
Create Payment Order
      ↓
Razorpay
      ↓
User Payment
      ↓
Payment Response
      ↓
Backend Signature Verification
      ↓
Payment SUCCESS
      ↓
Booking CONFIRMED
```

Payment information is stored in MongoDB.

---

# 23. QR/Token Solution

After payment confirmation, ParkingSpot generates a secure digital parking pass.

The pass contains:

```text
Booking ID
Parking ID
Slot ID
Date
Time
Secure Verification Token
```

A QR code is generated using the token.

---

# 24. QR Verification

Parking owners can verify the commuter's booking.

```text
QR Scanner
     ↓
Extract Token
     ↓
POST /api/qr/verify
     ↓
Backend
     ↓
Find Booking
     ↓
Validate Token
     ↓
Validate Date/Time
     ↓
Validate Status
     ↓
VALID / INVALID
```

No dedicated hardware scanner is required.

---

# 25. Cancellation Solution

The commuter can request cancellation.

```text
Booking
   ↓
Cancel Request
   ↓
Check Booking Status
   ↓
Check Cancellation Policy
   ↓
Calculate Refund
   ↓
Cancel Booking
   ↓
Release Slot
   ↓
Process Refund
```

The booking record is preserved rather than deleted.

---

# 26. Software-Based Occupancy

ParkingSpot calculates occupancy using booking state and time.

Example:

```text
Booking:
10:00 AM → 12:00 PM

Current Time:
10:30 AM

Result:
OCCUPIED
```

At 12:01 PM:

```text
OCCUPIED
    ↓
COMPLETED
    ↓
AVAILABLE
```

This is processed automatically using backend scheduled jobs.

---

# 27. Automated Booking Expiration

Node.js scheduled jobs periodically check:

- Expired reservations
- Payment-pending bookings
- Completed bookings
- Temporary slot locks

Example:

```text
Every 1 minute
      ↓
Find expired bookings
      ↓
Update status
      ↓
Release slots
      ↓
Notify users
```

---

# 28. Real-Time Availability

Socket.IO provides real-time updates.

Example:

```text
User A
   ↓
Books Slot A12
   ↓
Express API
   ↓
MongoDB
   ↓
Socket.IO Event
   ↓
All connected clients
   ↓
A12 becomes RESERVED
```

Events:

```text
slot:updated
booking:created
booking:cancelled
booking:expired
payment:completed
```

---

# 29. Owner Dashboard Solution

The owner dashboard provides:

```text
Total Slots
Available Slots
Reserved Slots
Occupied Slots
Today's Bookings
Today's Revenue
Occupancy Rate
Peak Hours
```

Charts can display:

- Revenue trends
- Booking trends
- Occupancy trends
- Peak hours
- Cancellation trends

---

# 30. Admin Dashboard Solution

Administrators can monitor:

```text
Total Users
Total Owners
Total Parking Lots
Total Slots
Total Bookings
Total Revenue
Average Occupancy
Cancellation Rate
```

Admin tables can include:

- Users
- Owners
- Parking facilities
- Bookings
- Payments

---

# 31. Backend Services

The backend is divided into logical services/modules.

```text
Auth Service
User Service
Parking Service
Slot Service
Availability Service
Booking Service
Payment Service
QR/Token Service
Cancellation Service
Occupancy Service
Real-Time Service
Analytics Service
Notification Service
Admin Service
```

These remain inside one Node.js application rather than being deployed as separate microservices.

---

# 32. Frontend Solution

The React frontend contains role-specific interfaces.

```text
React Application
│
├── Public Pages
├── Authentication
├── Commuter Dashboard
├── Owner Dashboard
├── Admin Dashboard
├── Parking Search
├── Slot Selection
├── Booking
├── Payment
├── QR Pass
├── Analytics
└── Profile
```

Tailwind CSS provides responsive styling.

---

# 33. Frontend Component Architecture

```text
components/
│
├── common/
├── navigation/
├── auth/
├── parking/
├── slots/
├── booking/
├── payment/
├── qr/
├── dashboard/
├── analytics/
└── notifications/
```

Reusable components include:

```text
Button
Modal
Card
Input
Table
Badge
Loader
Toast
ParkingCard
ParkingSlot
BookingCard
StatCard
Chart
QRCode
```

---

# 34. Database Solution

MongoDB is used as the primary database.

### Main Collections

```text
users
parkingLots
parkingSlots
bookings
payments
notifications
reviews
```

---

# 35. User Model

```text
User
├── _id
├── name
├── email
├── password
├── phone
├── role
├── profileImage
├── status
├── createdAt
└── updatedAt
```

---

# 36. Parking Lot Model

```text
ParkingLot
├── _id
├── ownerId
├── name
├── description
├── address
├── latitude
├── longitude
├── images
├── openingTime
├── closingTime
├── status
├── createdAt
└── updatedAt
```

---

# 37. Parking Slot Model

```text
ParkingSlot
├── _id
├── parkingLotId
├── slotNumber
├── vehicleType
├── pricePerHour
├── status
├── createdAt
└── updatedAt
```

---

# 38. Booking Model

```text
Booking
├── _id
├── bookingNumber
├── userId
├── parkingLotId
├── slotId
├── startTime
├── endTime
├── amount
├── bookingStatus
├── paymentStatus
├── qrToken
├── cancellationReason
├── createdAt
└── updatedAt
```

---

# 39. Payment Model

```text
Payment
├── _id
├── bookingId
├── userId
├── gateway
├── orderId
├── transactionId
├── amount
├── status
├── refundAmount
├── createdAt
└── updatedAt
```

---

# 40. REST API Structure

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

## Parking

```text
GET    /api/parking
GET    /api/parking/:id
POST   /api/parking
PUT    /api/parking/:id
DELETE /api/parking/:id
```

## Slots

```text
GET    /api/parking/:id/slots
POST   /api/parking/:id/slots
PUT    /api/slots/:id
DELETE /api/slots/:id
```

## Availability

```text
GET /api/parking/:id/availability
```

## Bookings

```text
POST /api/bookings
GET  /api/bookings
GET  /api/bookings/:id
PUT  /api/bookings/:id/cancel
```

## Payments

```text
POST /api/payments/create-order
POST /api/payments/verify
POST /api/payments/refund
```

## QR

```text
GET  /api/bookings/:id/qr
POST /api/qr/verify
```

## Analytics

```text
GET /api/analytics/revenue
GET /api/analytics/occupancy
GET /api/analytics/bookings
GET /api/analytics/peak-hours
```

---

# 41. Security Solution

Security mechanisms include:

```text
JWT Authentication
       +
bcrypt Password Hashing
       +
Role-Based Authorization
       +
Input Validation
       +
API Rate Limiting
       +
Secure HTTP Headers
       +
Environment Variables
       +
Payment Verification
       +
Secure QR Tokens
```

Sensitive values such as:

```text
JWT_SECRET
MONGODB_URI
RAZORPAY_KEY
RAZORPAY_SECRET
GOOGLE_MAPS_KEY
CLOUDINARY_KEY
```

must be stored in environment variables.

---

# 42. Development Tools

## Visual Studio Code

Used for:

- Frontend development
- Backend development
- Debugging
- Project management
- Git integration

## Git

Used for:

- Version control
- Feature branches
- Commit history
- Collaboration

## GitHub

Used for:

- Remote repository
- Source-code management
- Pull requests
- Issue tracking
- Project documentation

## Postman

Used for:

- REST API testing
- Authentication testing
- Booking testing
- Payment API testing
- QR verification testing

---

# 43. Testing Strategy

Testing should cover:

### Authentication

```text
Register
Login
Invalid Password
Expired JWT
Unauthorized Access
```

### Booking

```text
Valid Booking
Double Booking
Expired Booking
Invalid Slot
Invalid Time
Cancellation
```

### Payment

```text
Successful Payment
Failed Payment
Invalid Signature
Refund
```

### QR

```text
Valid QR
Expired QR
Invalid Token
Already Used Token
```

---

# 44. Error Handling

The backend should provide consistent API errors.

Example:

```json
{
  "success": false,
  "message": "Parking slot is no longer available"
}
```

HTTP status codes should be used appropriately:

```text
200 → Success
201 → Created
400 → Bad Request
401 → Unauthorized
403 → Forbidden
404 → Not Found
409 → Conflict
500 → Server Error
```

---

# 45. Project Workflow

The complete system works as follows:

```text
                 USER
                  │
                  ▼
              LOGIN
                  │
                  ▼
           SEARCH PARKING
                  │
                  ▼
         SELECT PARKING LOT
                  │
                  ▼
          CHECK AVAILABILITY
                  │
                  ▼
            SELECT SLOT
                  │
                  ▼
          SELECT DATE/TIME
                  │
                  ▼
          BOOKING REQUEST
                  │
                  ▼
          TEMPORARY LOCK
                  │
                  ▼
             PAYMENT
                  │
                  ▼
       BACKEND VERIFICATION
                  │
                  ▼
          BOOKING CONFIRMED
                  │
                  ▼
            QR / TOKEN
                  │
                  ▼
          DIGITAL PARKING PASS
                  │
                  ▼
          PARKING VERIFICATION
                  │
                  ▼
            ACTIVE BOOKING
                  │
                  ▼
             EXIT / END
                  │
                  ▼
             COMPLETED
                  │
                  ▼
            SLOT RELEASED
```

---

# 46. Advantages of the Solution

### For Commuters

- Saves time
- Easy parking discovery
- Advance reservation
- Transparent pricing
- Digital parking pass
- Booking history
- Easy cancellation

### For Parking Owners

- Digital slot management
- Reduced manual work
- Better occupancy visibility
- Revenue tracking
- Booking management
- Analytics

### For Administrators

- Centralized control
- User management
- Parking approval
- Platform analytics
- Transaction monitoring

---

# 47. Scalability

The initial solution uses a modular monolithic architecture.

This is suitable for development and deployment.

If the platform grows significantly, individual modules can later be separated.

```text
Initial:

React
  ↓
Express
  ↓
MongoDB

Future:

React
  ↓
API Gateway
  ↓
┌────────┬────────┬────────┬────────┐
Auth   Parking  Booking  Payment  Analytics
Service Service Service  Service   Service
```

---

# 48. Future Enhancements

Future versions may include:

- AI parking demand prediction
- Dynamic parking pricing
- Personalized parking recommendations
- Advanced navigation
- EV charging reservation
- Loyalty rewards
- Reviews and ratings
- Digital invoices
- Email/SMS notifications
- Mobile application
- Multi-city support
- Advanced fraud detection

---

# 49. Implementation Priority

## Phase 1 – Foundation

```text
React Setup
Express Setup
MongoDB Setup
JWT Authentication
Role Management
```

## Phase 2 – Parking

```text
Parking CRUD
Slot CRUD
Parking Search
Availability
```

## Phase 3 – Booking

```text
Booking Creation
Booking History
Cancellation
Slot Locking
Automatic Expiration
```

## Phase 4 – Payment

```text
Razorpay
Payment Verification
Refund
```

## Phase 5 – QR

```text
QR Generation
Token Generation
QR Verification
Digital Parking Pass
```

## Phase 6 – Real-Time

```text
Socket.IO
Live Availability
Booking Events
```

## Phase 7 – Analytics

```text
Revenue
Occupancy
Bookings
Peak Hours
Admin Reports
```

## Phase 8 – Finalization

```text
Testing
Security
Responsive UI
Postman Collection
GitHub Documentation
Deployment
```

---

# 50. Final Solution

ParkingSpot provides a complete software-only solution for modern parking management.

The final platform connects:

```text
COMMUTER
    │
    ├── Find Parking
    ├── Check Availability
    ├── Reserve Slot
    ├── Pay
    ├── Receive QR
    └── Manage Booking

OWNER
    │
    ├── Manage Parking
    ├── Manage Slots
    ├── Monitor Bookings
    ├── Verify QR
    ├── Track Occupancy
    └── Analyze Revenue

ADMIN
    │
    ├── Manage Users
    ├── Manage Owners
    ├── Approve Parking
    ├── Monitor Bookings
    └── Analyze Platform
```

The solution transforms traditional parking management into a centralized digital workflow:

> **Discover → Check → Reserve → Pay → Verify → Park → Complete**

ParkingSpot achieves this using **React, Tailwind CSS, Node.js, Express, MongoDB, JWT, Socket.IO, QR/Token technology, Razorpay/Stripe, Google Maps, Git, GitHub, Postman, and Visual Studio Code**, without requiring dedicated parking hardware.

---

# 51. Project Outcome

The expected final outcome is a responsive, secure, scalable, and user-friendly web application capable of managing the complete parking reservation lifecycle.

The system should demonstrate:

- Secure authentication
- Role-based access
- Parking management
- Digital slot management
- Real-time software-based availability
- Reservation management
- Payment integration
- QR/token verification
- Cancellation and refunds
- Booking history
- Occupancy tracking
- Revenue analytics
- Administrative control

**ParkingSpot – Smart Parking Reservation**

> **Find. Reserve. Park.**