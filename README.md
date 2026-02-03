# RentWheels_BD – Server Side

This is the backend server of **RentWheels_BD**, a vehicle rental platform where users can rent vehicles, hosts can list their vehicles, and admins can manage the system.

The server is built using Node.js, Express, and MongoDB. It handles authentication, user roles, vehicle management, bookings, payments, and email notifications.

Live Server URL: https://rentwheels-bd-server.vercel.app  
(Replace with your deployed URL if needed)

---

## Technologies Used

- Node.js
- Express.js
- MongoDB
- JWT (cookie-based authentication)
- Stripe for payments
- Nodemailer for email notifications
- dotenv for environment configuration

---

## Authentication & Authorization

- JWT token is generated on login and stored in **HTTP-only cookies**
- Protected routes are secured using custom middleware
- Role-based access control implemented for:
  - Admin
  - Host
  - Renter (default user)

This ensures users can only access what they are allowed to.

---

## User Roles Overview

### Renter (Default Role)
- Browse available vehicles
- Book vehicles securely
- View personal bookings
- See booking statistics
- Receive confirmation emails after booking

### Host
- Add vehicles for rent
- Update and manage listed vehicles
- View bookings made on their vehicles
- Access host statistics (total bookings, earnings, etc.)

### Admin
- View overall platform statistics
- Manage users and update roles
- Monitor total users, vehicles, bookings, and revenue

---

## Vehicle Related APIs

- `GET /vehicles`  
  Get all vehicles (supports category filtering)

- `GET /vehicle/:id`  
  Get details of a single vehicle

- `POST /vehicle`  
  Add a new vehicle

- `PUT /vehicle/update/:id`  
  Update vehicle information (Host only)

- `PATCH /vehicle/status/:id`  
  Update vehicle booking status

- `GET /my_listings/:email`  
  Get all vehicles added by a host

- `DELETE /vehicle/:id`  
  Delete a vehicle

---

## Booking & Payment APIs

- `POST /booking`  
  Create a booking (JWT protected)

- `GET /my_bookings/:email`  
  Get bookings of a renter

- `GET /manage_bookings/:email`  
  Get bookings for a host

- `DELETE /booking/:id`  
  Cancel a booking

- `POST /create-payment-intent`  
  Create Stripe payment intent

Stripe is used to handle secure online payments.

---

## Dashboard & Statistics

### Admin Dashboard
- Total users
- Total vehicles
- Total bookings
- Total sales
- Sales chart data

### Host Dashboard
- Total vehicles listed
- Total bookings
- Total earnings
- Hosting start date

### Renter Dashboard
- Total bookings
- Total spending
- Booking history

---

## Email Notifications

Automatic emails are sent using Nodemailer for:
- New user registration (welcome email)
- Successful booking confirmation for renters
- Booking notification for hosts

---

## Environment Variables

Create a `.env` file in the root directory and add:

```env
PORT=8000
DB_USER=your_db_user
DB_PASS=your_db_password
ACCESS_TOKEN_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret
TRANSPORTER_EMAIL=your_email@gmail.com
TRANSPORTER_PASS=your_app_password
NODE_ENV=development
