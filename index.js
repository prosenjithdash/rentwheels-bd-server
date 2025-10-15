require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT || 8000;


// get from mongodb website - connect side-> 

const { MongoClient, ServerApiVersion } = require('mongodb');


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
      
        // create database Ren collection for Vehicles
        const vehiclesCollection = client.db('rentWheels-BD').collection('vehicles')







        

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully RentWheels-BD connected to MongoDB!"); 

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
