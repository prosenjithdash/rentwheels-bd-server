require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());


// get from mongodb website - connect side-> 

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kybpity.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully RentWheels-BD connected to MongoDB!"); 

      
        // create database Ren collection for Vehicles
        const vehiclesCollection = client.db('rentWheels_BD').collection('vehicles')

        // // get all VEHICLES from database
        // app.get('/vehicles', async (req, res) => {
        //     const result = await vehiclesCollection.find().toArray();
        //     res.send(result);
        // })

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







  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
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



// It's a backend project server -> Project name is RentWheels-BD
// I will at first apply nodeJS, expressJS, MongoDB Atlas, and for try use just mongoose.
// Futures part is => Data GET, POST, UPDATE & DELETE, GET SINGLE DATA, SINGLE DATA UPDATE OR DELETE.

// Also applied here JWT 
