require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
const req = require('express/lib/request');
const res = require('express/lib/response');
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");

const port = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kybpity.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Send Email 
const sendEmail =  (emailAddress, emailData) => {
  
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
      user: process.env.TRANSPORTER_EMAIL,
      pass: process.env.TRANSPORTER_PASS,
    },
  });

  // verify transporter
  transporter.verify(function (error, success)  {
  if (error) {
    console.error(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

  const mailBody = {
    from: `"RentWheels_BD" <${process.env.TRANSPORTER_EMAIL}>`,
    to: emailAddress,
    subject: emailData.subject,
    html: emailData.message, // HTML version of the message
  } 
   transporter.sendMail(mailBody, (error, info) => {
    if (error) {
     console.log(error)
    } else {
      console.log('Email Sent: ' + info.response)
   }
 });


}
// Verify JWT Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log(token)

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access: No token provided' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden: Invalid token' });
    }
    req.user = decoded;
    next()
  });
};

async function run() {
    try {

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully RentWheels-BD connected to MongoDB!"); 

      
      // DB Collections
      // create database for Vehicles collection  
      const vehiclesCollection = client.db('rentWheels_BD').collection('vehicles')
      // crate database for User collection
      const usersCollection = client.db('rentWheels_BD').collection('users')
      // crate database for Booking collection
      const bookingsCollection = client.db('rentWheels_BD').collection('bookings')


      // Verify Admin middleware
     const verifyAdmin = async (req, res, next) => {
      const user = req.user;
      console.log("🔍 Checking admin for:", user?.email);

      const result = await usersCollection.findOne({ email: user?.email });
      if (!result || result?.role !== 'admin') {
        console.log("🚫 Not admin:", result?.role);
        return res.status(403).send({ message: 'Forbidden: Admin access only' });
      }
      next();
     };
      
      // Verify Host middleware
     const verifyHost = async (req, res, next) => {
      const user = req.user;
      console.log("🔍 Checking host for:", user?.email);

      const result = await usersCollection.findOne({ email: user?.email });
      if (!result || result?.role !== 'host') {
        console.log("🚫 Not host:", result?.role);
        return res.status(403).send({ message: 'Forbidden: Host access only' });
      }
      next();
     };
      
      // Verify Render middleware
     const verifyRender = async (req, res, next) => {
      const user = req.user;
      console.log("🔍 Checking render for:", user?.email);

      const result = await usersCollection.findOne({ email: user?.email });
      if (!result || result?.role !== 'render') {
        console.log("🚫 Not render:", result?.role);
        return res.status(403).send({ message: 'Forbidden: Render access only' });
      }
      next();
    };

      // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
      
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })
      
      // create-payment-intent
      app.post("/create-payment-intent", verifyToken, async (req, res) => { 
        const price = req.body.price;
        const priceInCent = parseFloat(price) * 100

        if (!price || priceInCent < 1) return;

        // generate clientSecret
        const {client_secret} = await stripe.paymentIntents.create({
          amount: priceInCent,
          currency: "usd",
          // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
          automatic_payment_methods: {
            enabled: true,
          },
        })

        // send client secret as response
        res.send({clientSecret: client_secret})

      })

        // get all VEHICLES from database
        // app.get('/vehicles', async (req, res) => {
        //     const result = await vehiclesCollection.find().toArray();
        //     res.send(result);
        // })
      
    // USER PART
    // ✅ Save or update user data in DB
    app.put('/user',verifyToken, async (req, res) => {
        try {
          const user = req.body;
          const query = { email: user?.email };

          // check if user already exists in db
          const isExist = await usersCollection.findOne(query);

          // ✅ if user already exists
          if (isExist) {
            // if same user again requests to become host
            if (user.status === 'Requested') {
              const result = await usersCollection.updateOne(query, {
                $set: { status: user?.status },
              });
              return res.send(result); // ✅ updated successfully
            } else {
              // ✅ already exist, no update needed
              return res.send(isExist); // tells frontend "Wait for approval" or already registered
            }
          }

          // ✅ save user for the first time
          const options = { upsert: true };
          const updateDoc = {
            $set: {
              ...user,
              timestamp: Date.now(),
            },
          };

          const result = await usersCollection.updateOne(query, updateDoc, options);
          res.send(result);
        } catch (error) {
          console.error('Error saving user:', error);
          res.status(500).send({ message: 'Failed to save user data' });
        }
    });

    // get all users from db
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
        const result = await usersCollection.find().toArray()
         res.send (result)
    })

    // get a user info by email from db
    app.get('/user/:email', async (req, res) => {
        const email = req.params.email
        const result = await usersCollection.findOne({email})
        res.send(result)
    })

    // update a user role
    app.patch('/users/update/:email', verifyToken, verifyAdmin,  async (req, res) => {
        const email = req.params.email
        const user = req.body
        const query = { email }
        const updateDoc = {
          $set: { ...user, timestamp: Date.now() },
        }
        const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
      
    })

    // Delete a user by email
    app.delete('/users/:email', verifyToken, verifyAdmin, async (req, res) => {
        try {
          const email = req.params.email;
          const result = await usersCollection.deleteOne({ email });

          if (result.deletedCount === 0) {
            return res.status(404).send({ message: 'User not found' });
          }

          res.send({ message: 'User deleted successfully' });
        } catch (error) {
          console.error('Error deleting user:', error);
          res.status(500).send({ message: 'Failed to delete user' });
        }
    });
    
    // VEHICLES PART
    // get all VEHICLES from database
    app.get('/vehicles', async (req, res) => {
            const category = req.query.category
            // console.log(category)
            let query = {}
            if (category && category!=='null') {
                query={category}
            }
            const result = await vehiclesCollection.find(query).toArray();
            res.send(result);
    })

    // get single VEHICLE from database
    app.get('/vehicle/:id', async (req, res) => {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({ message: 'Invalid vehicle ID format' });
        }

        const query = { _id: new ObjectId(id) };
        const result = await vehiclesCollection.findOne(query);

        if (!result) {
            return res.status(404).send({ message: 'Vehicle not found' });
        }

        res.send(result);
    });
      
    // Post Vehicle data
    app.post('/vehicle',async (req, res) => {
          const vehicleData = req.body;
          const result =await vehiclesCollection.insertOne(vehicleData)
          res.send(result)

    })
      
    // Post Booking data
    app.post('/booking',verifyToken, async (req, res) => {
          const bookingData = req.body;
          // Save room booking info
          const result =await bookingsCollection.insertOne(bookingData)
          
      // send email to render
      sendEmail(bookingData?.render?.email, {
        subject: 'Booking Successful!',
        message: `You have successfully booked a vehicle through RentWheels_BD . Transaction Id: ${bookingData?.transactionId}`
      })
          res.send(result)

    })
      
      //Update vehicle data API route
      app.put('/vehicle/update/:id', verifyToken, verifyHost, async (req, res) => {

        
        const id = req.params.id
        const vehicleData = req.body

        const query = { _id: new ObjectId(id) }


        const updateDoc = {

          $set: vehicleData,


        }
        const result = await vehiclesCollection.updateOne(query, updateDoc)
        res.send(result)
      })
    // update vehicle status
    app.patch('/vehicle/status/:id', async (req, res) => {
        const id = req.params.id
        const status = req.body.status
          const query = { _id: new ObjectId(id) }
          const updateDoc = {
            $set:{booked: status},
          }
        const result = await vehiclesCollection.updateOne(query, updateDoc)
        res.send(result)

    })

    // get all booking for a render
    app.get('/my_bookings/:email', verifyToken, async (req, res) => {
        const email = req.params.email
        const query = { 'render.email': email }
        const result = await bookingsCollection.find(query).toArray()
        res.send(result)
      })

    // Delete my_booking vehicle data 
    app.delete('/booking/:id',verifyToken, async (req, res)=> {
      const id = req.params.id;
      const query = {_id:new ObjectId(id)}
      const result = await bookingsCollection.deleteOne(query)
        res.send(result)
    })
      
     // get all bookings for a host
    app.get('/manage_bookings/:email', verifyToken, async (req, res) => {
        const email = req.params.email
        const query = { 'host.email': email }
        const result = await bookingsCollection.find(query).toArray()
        res.send(result)
    })
      
      // Admin Statistics API route
      app.get('/admin_stat', verifyToken, verifyAdmin,async (req, res) => {
        const bookingDetails = await bookingsCollection.find({}, {
          projection: {
            date: 1,
            price: 1,

          }
        }).toArray()

        const totalUsers = await usersCollection.countDocuments()
        const totalVehicles = await vehiclesCollection.countDocuments()
        const totalSales = bookingDetails.reduce((sum, booking) => sum + booking.price, 0)

        const chartData = bookingDetails.map(booking => {
          const day = new Date(booking.date).getDate()
          const month = new Date(booking.date).getMonth() + 1
          const data = [`${day}/${month}`, booking?.price]
          return data
        })
        chartData.unshift(['Day', 'Sales'])

        console.log(chartData)
        console.log(bookingDetails)

        res.send(
          {
            totalBookings: bookingDetails.length,
            totalUsers,
            totalVehicles,
            totalSales,
            chartData
          })
      })

      // Host Statistics API route
      app.get('/host_stat', verifyToken, verifyHost, async (req, res) => {
        const {email} = req.user
        const bookingDetails = await bookingsCollection.find(
          {'host.email': email},
          {
            projection: {
            date: 1,
            price: 1,

          }
        }).toArray()

        const totalVehicles = await vehiclesCollection.countDocuments(
          {'host.email': email}
        )
        const totalSales = bookingDetails.reduce((sum, booking) => sum + booking.price, 0)

        const {timestamp} = await usersCollection.findOne({email},{projection:{timestamp:1}})

        const chartData = bookingDetails.map(booking => {
          const day = new Date(booking.date).getDate()
          const month = new Date(booking.date).getMonth() + 1
          const data = [`${day}/${month}`, booking?.price]
          return data
        })
        chartData.unshift(['Day', 'Sales'])

        console.log(chartData)
        console.log(bookingDetails)

        res.send(
          {
            totalBookings: bookingDetails.length,
            totalVehicles,
            totalSales,
            chartData,
            hostSince: timestamp
          })
      })

      // Render Statistics API route
      app.get('/render_stat', verifyToken, async (req, res) => {
        const {email} = req.user
        const bookingDetails = await bookingsCollection.find(
          {'render.email': email},
          {
            projection: {
            date: 1,
            price: 1,

          }
        }).toArray()

        const totalSales = bookingDetails.reduce((sum, booking) => sum + booking.price, 0)

        const {timestamp} = await usersCollection.findOne({email},{projection:{timestamp:1}})

        const chartData = bookingDetails.map(booking => {
          const day = new Date(booking.date).getDate()
          const month = new Date(booking.date).getMonth() + 1
          const data = [`${day}/${month}`, booking?.price]
          return data
        })
        chartData.unshift(['Day', 'Sales'])

        console.log(chartData)
        console.log(bookingDetails)

        res.send(
          {
            totalBookings: bookingDetails.length,
            totalSales,
            chartData,
            renderSince: timestamp
          })
      })

      // ✅ Get all vehicles added by a specific host (My Listings)
      app.get('/my_listings/:email', verifyToken, async (req, res) => {
        try {
          const email = req.params.email;

          // 1️⃣ Security: make sure user can only access their own listings
          if (email !== req.user.email) {
            return res.status(403).send({ message: "Forbidden: Access denied" });
          }

          // 2️⃣ Query vehicles
          let query = { "host.email": email };
          const result = await vehiclesCollection.find(query).toArray();

          // 3️⃣ Check if any vehicles exist
          if (!result || result.length === 0) {
            return res.status(404).send({ message: 'No vehicles found for this host' });
          }

          // 4️⃣ Send result
          res.send(result);
        } catch (error) {
          console.error('Error fetching host vehicles:', error);
          res.status(500).send({ message: 'Failed to fetch host vehicles' });
        }
      });

      // Delete vehicle data from my_listings table
      app.delete('/vehicle/:id',verifyToken, async (req, res)=> {
        const id = req.params.id;
        const query = {_id:new ObjectId(id)}
        const result = await vehiclesCollection.deleteOne(query)
        res.send(result)
      })

  } finally {
  }
}
run().catch(console.dir);

// This is my root route
app.get('/', (req, res) => {
  res.send('Hello World From RentWheels-BD!')
})

app.listen(port, () => {
  console.log(`RentWheels-BD app listening on port ${port}`)
})
