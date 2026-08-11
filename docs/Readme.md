# 🅿️ ParkingSpot – Smart Parking Reservation

> **Find. Reserve. Park.**

A modern, software-only smart parking reservation and management platform that enables commuters to discover parking spaces, check real-time digital availability, reserve slots, make secure payments, and receive QR-based digital parking passes.

Parking owners can manage parking facilities, slots, bookings, occupancy, and revenue through a dedicated dashboard, while administrators can manage the complete platform.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [User Roles](#-user-roles)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Core Workflows](#-core-workflows)
- [Backend Services](#-backend-services)
- [Frontend Components](#-frontend-components)
- [Database](#-database)
- [API Overview](#-api-overview)
- [Security](#-security)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Project](#-running-the-project)
- [API Testing](#-api-testing)
- [Git Workflow](#-git-workflow)
- [Future Enhancements](#-future-enhancements)
- [Project Documentation](#-project-documentation)
- [License](#-license)

---

# 🌟 Overview

**ParkingSpot** is a full-stack web application designed to modernize parking reservation and management.

The platform provides a centralized digital system connecting:

```text
┌──────────────────────────────────────────┐
│              PARKINGSPOT                 │
├──────────────────────────────────────────┤
│                                          │
│   🚗 COMMUTER     🅿️ OWNER     👨‍💼 ADMIN │
│                                          │
└──────────────────────────────────────────┘
```

### Commuters can:

- Search for nearby parking
- View parking facilities
- Check digital slot availability
- Select date and time
- Reserve parking slots
- Make online payments
- Receive QR/token parking passes
- View booking history
- Cancel eligible bookings

### Parking owners can:

- Register parking facilities
- Manage digital parking slots
- Set parking prices
- Monitor reservations
- Track software-based occupancy
- Verify QR/token passes
- Monitor revenue
- Analyze peak parking hours

### Administrators can:

- Manage users
- Manage parking owners
- Approve parking facilities
- Monitor bookings
- Monitor payments
- View platform analytics
- Manage platform operations

---

# 🎯 Problem Statement

Finding parking in busy urban areas can be difficult because users often have no reliable way to know:

- Where parking is available
- How many slots are free
- How much parking costs
- Whether parking can be reserved
- Whether a parking facility is full
- How long parking will be available

Traditional parking systems also rely heavily on manual processes, creating challenges for parking operators.

### Existing Problems

```text
❌ Manual parking management
❌ Paper-based tickets
❌ No advance reservation
❌ Poor availability visibility
❌ Difficult booking management
❌ Limited occupancy tracking
❌ Limited revenue analytics
❌ Manual cancellation handling
```

---

# 💡 Solution

ParkingSpot converts the traditional parking process into a digital reservation workflow.

```text
        DISCOVER
           ↓
     CHECK AVAILABILITY
           ↓
       SELECT SLOT
           ↓
        RESERVE
           ↓
         PAY
           ↓
      QR / TOKEN
           ↓
        VERIFY
           ↓
          PARK
           ↓
       COMPLETE
```

The platform uses software-based slot management instead of requiring physical parking sensors or IoT devices.

---

# ⭐ Key Features

## 🚗 Commuter Features

- 🔐 Secure registration and login
- 📍 Location-based parking search
- 🗺️ Google Maps integration
- 🅿️ Digital parking slot visualization
- 🟢 Real-time software-based availability
- 📅 Date and time-based booking
- 🔒 Temporary slot locking
- 💳 Online payment
- 📱 QR parking pass
- 🔑 Secure booking token
- 📖 Booking history
- ❌ Booking cancellation
- 💰 Refund tracking
- 🔔 Notifications
- 👤 Profile management

---

## 🅿️ Parking Owner Features

- 🏢 Parking facility management
- 🅿️ Digital slot management
- 💰 Pricing management
- 📋 Reservation management
- 📊 Occupancy dashboard
- 💵 Revenue analytics
- 📈 Booking analytics
- 🕐 Peak-hour analysis
- 📱 QR/token verification
- 🛠️ Maintenance slot management

---

## 👨‍💼 Admin Features

- 👥 User management
- 🅿️ Parking owner management
- ✅ Parking approval
- ❌ Parking rejection
- 📋 Booking monitoring
- 💳 Payment monitoring
- 📊 Platform analytics
- 📈 Revenue statistics
- 🚫 Account suspension
- ⚙️ Platform configuration

---

# 👥 User Roles

ParkingSpot uses three primary roles:

| Role | Description |
|---|---|
| 🚗 **Commuter** | Searches and reserves parking |
| 🅿️ **Owner** | Manages parking facilities and bookings |
| 👨‍💼 **Admin** | Manages the complete platform |

### Role Hierarchy

```text
                         ADMIN
                           │
              ┌────────────┴────────────┐
              │                         │
          PARKING OWNER             COMMUTER
              │                         │
       Manage Parking              Find Parking
       Manage Slots                Book Slot
       View Bookings               Make Payment
       View Revenue                Get QR Pass
       View Analytics              Booking History
```

---

# 🏗️ System Architecture

ParkingSpot follows a **Modular Monolithic Architecture**.

```text
                         ┌────────────────────┐
                         │   React Frontend   │
                         │   Tailwind CSS     │
                         └─────────┬──────────┘
                                   │
                              HTTPS / REST
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ Node.js + Express  │
                         │    REST API        │
                         └─────────┬──────────┘
                                   │
        ┌──────────────────────────┼─────────────────────────┐
        │                          │                         │
        ▼                          ▼                         ▼
 ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
 │     Auth     │          │   Parking    │          │   Booking    │
 │    Service   │          │   Service    │          │   Service    │
 └──────────────┘          └──────────────┘          └──────────────┘
        │                          │                         │
        └──────────────────────────┼─────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
       ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
       │   Payment   │      │ QR / Token  │      │  Analytics  │
       │   Service   │      │   Service   │      │   Service   │
       └─────────────┘      └─────────────┘      └─────────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │   MongoDB    │
                            └──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
              ┌───────────┐                 ┌───────────┐
              │ Socket.IO │                 │ Cron Jobs │
              │ Real-Time │                 │ Automation│
              └───────────┘                 └───────────┘
```

---

# 🛠️ Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React.js | User interface |
| Tailwind CSS | Styling |
| React Router | Routing |
| Axios | API communication |
| Recharts | Analytics and charts |

## Backend

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| Express.js | REST API framework |
| JWT | Authentication |
| bcrypt | Password hashing |
| Socket.IO | Real-time updates |
| node-cron | Scheduled jobs |
| QRCode | QR generation |

## Database

| Technology | Purpose |
|---|---|
| MongoDB | Primary database |
| Mongoose | MongoDB ODM |

## External Services

| Service | Purpose |
|---|---|
| Google Maps API | Maps and location |
| Razorpay | Online payments |
| Stripe | Optional payment gateway |
| Cloudinary | Image storage |

## Development Tools

```text
Visual Studio Code
Git
GitHub
Postman
MongoDB Compass
Chrome DevTools
```

---

# 🗂️ Project Structure

```text
ParkingSpot/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── navigation/
│   │   │   ├── auth/
│   │   │   ├── parking/
│   │   │   ├── slots/
│   │   │   ├── booking/
│   │   │   ├── payment/
│   │   │   ├── qr/
│   │   │   ├── dashboard/
│   │   │   └── notifications/
│   │   │
│   │   ├── pages/
│   │   │   ├── public/
│   │   │   ├── commuter/
│   │   │   ├── owner/
│   │   │   └── admin/
│   │   │
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   ├── parking/
│   │   │   ├── availability/
│   │   │   ├── booking/
│   │   │   ├── payment/
│   │   │   ├── qr/
│   │   │   ├── cancellation/
│   │   │   ├── occupancy/
│   │   │   └── analytics/
│   │   ├── jobs/
│   │   ├── utils/
│   │   └── app.js
│   │
│   └── package.json
│
├── docs/
│   ├── VISION.md
│   └── SOLUTION.md
│
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

---

# 🔄 Core Workflow

```text
                         COMMUTER
                            │
                            ▼
                       Login / Register
                            │
                            ▼
                     Search Parking
                            │
                            ▼
                    Select Parking Lot
                            │
                            ▼
                   Check Availability
                            │
                            ▼
                       Select Slot
                            │
                            ▼
                    Select Date / Time
                            │
                            ▼
                     Booking Request
                            │
                            ▼
                     Temporary Lock
                            │
                            ▼
                         Payment
                            │
                            ▼
                  Backend Verification
                            │
                            ▼
                   Booking Confirmed
                            │
                            ▼
                    QR / Token Generated
                            │
                            ▼
                   Digital Parking Pass
                            │
                            ▼
                    QR / Token Verification
                            │
                            ▼
                      Active Booking
                            │
                            ▼
                         Completed
                            │
                            ▼
                       Slot Released
```

---

# 🟢 Slot Availability

ParkingSpot uses a software-based availability system.

No physical parking sensors are required.

### Slot States

```text
🟢 AVAILABLE
🔵 RESERVED
🟠 OCCUPIED
⚫ MAINTENANCE
🟡 PAYMENT_PENDING
```

### Example

```text
Parking A

A1   A2   A3   A4
🟢   🟢   🔵   🟠

B1   B2   B3   B4
🟢   🟠   🟢   ⚫
```

---

# 🔒 Double Booking Prevention

The backend checks existing reservations before creating a booking.

```text
Requested Start < Existing End
AND
Requested End > Existing Start
```

If the conditions indicate an overlap:

```text
❌ Slot Unavailable
```

Otherwise:

```text
✅ Slot Available
```

The backend remains the final authority for availability.

---

# ⏳ Temporary Slot Locking

During payment:

```text
AVAILABLE
     ↓
PAYMENT_PENDING
     ↓
┌───────────────┐
│ Payment       │
└───────┬───────┘
        │
    ┌───┴────┐
    ▼        ▼
 SUCCESS   FAILED
    │        │
    ▼        ▼
CONFIRMED AVAILABLE
```

Expired payment sessions automatically release the slot.

---

# 📱 QR / Token System

After successful payment:

```text
Booking
   ↓
Generate Secure Token
   ↓
Generate QR Code
   ↓
Digital Parking Pass
```

The pass contains:

```text
Booking ID
Parking Name
Slot Number
Date
Start Time
End Time
Verification Token
```

The QR code can be verified through the web application.

---

# ❌ Cancellation Workflow

```text
User selects booking
        ↓
Cancel Booking
        ↓
Check cancellation policy
        ↓
Calculate refund
        ↓
Cancel booking
        ↓
Release parking slot
        ↓
Process refund
```

Cancelled bookings are preserved in the database for history and auditing.

---

# 💳 Payment Workflow

```text
Booking Request
      ↓
Create Razorpay Order
      ↓
User Payment
      ↓
Payment Gateway
      ↓
Backend Signature Verification
      ↓
Payment Success
      ↓
Booking Confirmation
      ↓
QR Generation
```

The backend verifies payment before confirming the reservation.

---

# ⚡ Real-Time Updates

Socket.IO is used for real-time events.

Example:

```text
User A
  │
  │ Books A12
  ▼
Backend
  │
  ▼
MongoDB
  │
  ▼
Socket.IO
  │
  ├──────────────┐
  ▼              ▼
User B         User C
  │              │
  ▼              ▼
A12 RESERVED   A12 RESERVED
```

---

# 📊 Analytics

## Owner Analytics

```text
Total Slots
Available Slots
Reserved Slots
Occupied Slots
Total Bookings
Total Revenue
Occupancy Rate
Cancellation Rate
Peak Hours
```

## Admin Analytics

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

---

# 🗄️ Database Collections

ParkingSpot uses MongoDB.

```text
users
parkingLots
parkingSlots
bookings
payments
notifications
reviews
```

### User

```text
_id
name
email
password
phone
role
profileImage
status
createdAt
updatedAt
```

### ParkingLot

```text
_id
ownerId
name
description
address
latitude
longitude
images
openingTime
closingTime
status
createdAt
updatedAt
```

### ParkingSlot

```text
_id
parkingLotId
slotNumber
vehicleType
pricePerHour
status
createdAt
updatedAt
```

### Booking

```text
_id
bookingNumber
userId
parkingLotId
slotId
startTime
endTime
amount
bookingStatus
paymentStatus
qrToken
cancellationReason
createdAt
updatedAt
```

### Payment

```text
_id
bookingId
userId
gateway
orderId
transactionId
amount
status
refundAmount
createdAt
updatedAt
```

---

# 🔌 API Overview

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

## Parking

```http
GET    /api/parking
GET    /api/parking/:id
POST   /api/parking
PUT    /api/parking/:id
DELETE /api/parking/:id
```

## Slots

```http
GET    /api/parking/:id/slots
POST   /api/parking/:id/slots
PUT    /api/slots/:id
DELETE /api/slots/:id
```

## Availability

```http
GET /api/parking/:id/availability
```

## Bookings

```http
POST /api/bookings
GET  /api/bookings
GET  /api/bookings/:id
PUT  /api/bookings/:id/cancel
```

## Payments

```http
POST /api/payments/create-order
POST /api/payments/verify
POST /api/payments/refund
```

## QR

```http
GET  /api/bookings/:id/qr
POST /api/qr/verify
```

## Analytics

```http
GET /api/analytics/revenue
GET /api/analytics/occupancy
GET /api/analytics/bookings
GET /api/analytics/peak-hours
```

---

# 🔐 Security

ParkingSpot implements:

- JWT authentication
- bcrypt password hashing
- Role-based authorization
- Protected API routes
- Input validation
- Rate limiting
- Secure HTTP headers
- Environment variables
- Backend payment verification
- Secure QR tokens
- MongoDB validation
- Centralized error handling

Sensitive credentials must never be committed to GitHub.

---

# 💻 Installation

## Prerequisites

Install:

- Node.js
- npm
- MongoDB
- Git
- Visual Studio Code

Verify:

```bash
node --version
npm --version
git --version
```

---

# 📥 Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ParkingSpot.git
cd ParkingSpot
```

---

# 📦 Install Dependencies

### Backend

```bash
cd server
npm install
```

### Frontend

```bash
cd ../client
npm install
```

---

# 🔑 Environment Variables

Create:

```text
server/.env
```

Example:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

GOOGLE_MAPS_API_KEY=your_google_maps_key

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Create:

```text
client/.env
```

Example:

```env
VITE_API_URL=http://localhost:5000/api

VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key
```

Never commit `.env` files.

---

# ▶️ Running the Project

## Start Backend

```bash
cd server
npm run dev
```

Backend:

```text
http://localhost:5000
```

## Start Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🧪 API Testing with Postman

Import the ParkingSpot API collection into Postman.

Recommended folders:

```text
ParkingSpot API
│
├── Authentication
│   ├── Register
│   └── Login
│
├── Parking
│   ├── Create Parking
│   ├── Get Parking
│   └── Update Parking
│
├── Slots
│   ├── Create Slot
│   └── Get Slots
│
├── Availability
│   └── Check Availability
│
├── Bookings
│   ├── Create Booking
│   ├── Get Booking
│   ├── Booking History
│   └── Cancel Booking
│
├── Payments
│   ├── Create Order
│   └── Verify Payment
│
└── QR
    ├── Generate QR
    └── Verify QR
```

Use environment variables:

```text
{{baseURL}}
{{token}}
{{userId}}
{{parkingId}}
{{slotId}}
{{bookingId}}
```

---

# 🌿 Git Workflow

Recommended branches:

```text
main
develop

feature/authentication
feature/parking
feature/slots
feature/availability
feature/booking
feature/payment
feature/qr
feature/analytics
feature/admin
```

Example:

```bash
git checkout -b feature/booking

git add .

git commit -m "Add parking booking service"

git push origin feature/booking
```

---

# 🧪 Testing Strategy

The project should test:

### Authentication

- Valid registration
- Duplicate email
- Valid login
- Invalid credentials
- Expired JWT
- Unauthorized access

### Parking

- Create parking
- Update parking
- Delete parking
- Search parking
- Invalid parking ID

### Booking

- Valid booking
- Double booking prevention
- Invalid time range
- Slot unavailable
- Booking cancellation
- Booking expiration

### Payment

- Successful payment
- Failed payment
- Invalid payment signature
- Refund

### QR

- Valid QR
- Invalid token
- Expired token
- Cancelled booking token

---

# 🚫 Hardware Dependency

ParkingSpot is a **software-only solution**.

The core system does not require:

```text
❌ IoT Sensors
❌ RFID Readers
❌ Arduino
❌ ESP32
❌ Raspberry Pi
❌ Dedicated QR Scanner
❌ Automatic Parking Barrier
❌ Physical Occupancy Sensors
```

Instead, it uses:

```text
React
+
Node.js
+
Express
+
MongoDB
+
REST APIs
+
Socket.IO
+
QR / Token Verification
+
Software-Based Occupancy
```

This makes the system easier to develop, demonstrate, test, and deploy as a web application.

---

# 🚀 Future Enhancements

Planned or possible future features:

- 🤖 AI-based parking demand prediction
- 📈 Dynamic pricing
- 🧠 Intelligent parking recommendations
- 🗺️ Advanced route optimization
- 🔋 EV charging reservation
- ⭐ Parking ratings and reviews
- 🎁 Loyalty and reward system
- 📧 Email notifications
- 📱 SMS notifications
- 📄 Digital invoices
- 📱 Mobile application
- 🌍 Multi-city parking support
- 🔍 Advanced fraud detection

---

# 📚 Project Documentation

Detailed project documentation:

- [`VISION.md`](./VISION.md) – Project vision, goals, users, and long-term direction
- [`SOLUTION.md`](./SOLUTION.md) – Technical solution, architecture, modules, workflows, and implementation strategy

---

# 📈 Development Roadmap

```text
Phase 1
├── Project Setup
├── React Setup
├── Express Setup
└── MongoDB Setup

Phase 2
├── Authentication
├── JWT
└── Role-Based Access

Phase 3
├── Parking Management
├── Slot Management
└── Availability

Phase 4
├── Booking
├── Booking History
├── Cancellation
└── Slot Locking

Phase 5
├── Razorpay
├── Payment Verification
└── Refund

Phase 6
├── QR Generation
├── Token Verification
└── Digital Parking Pass

Phase 7
├── Socket.IO
├── Real-Time Availability
└── Automated Expiration

Phase 8
├── Owner Dashboard
├── Admin Dashboard
├── Analytics
└── Reports

Phase 9
├── Testing
├── Security
├── Optimization
└── Deployment
```

---

# 🎯 Project Goals

ParkingSpot aims to provide:

```text
                    PARKINGSPOT
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
      FIND            RESERVE           MANAGE
        │                │                │
        ▼                ▼                ▼
   Availability       Payment         Analytics
        │                │                │
        ▼                ▼                ▼
      MAP              QR PASS        Dashboard
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                  SMART PARKING
```

The ultimate goal is to transform parking from a **manual, uncertain process** into a **digital, predictable, and manageable experience**.

---

# 🏆 Expected Outcome

The completed ParkingSpot platform should allow:

### Commuters

> Find a parking space → Check availability → Reserve → Pay → Receive QR → Park.

### Parking Owners

> Add parking → Manage slots → Monitor bookings → Track occupancy → Analyze revenue.

### Administrators

> Manage users → Approve parking → Monitor operations → Analyze the platform.

---

# 📜 License

This project is developed for educational, academic, and demonstration purposes.

Add your preferred license here, for example:

```text
MIT License
```

---

# 👨‍💻 Development

**ParkingSpot – Smart Parking Reservation**

Built with:

```text
React.js
Tailwind CSS
Node.js
Express.js
MongoDB
JWT
Socket.IO
Razorpay
Google Maps API
Git
GitHub
Postman
Visual Studio Code
```

> **Find. Reserve. Park.**