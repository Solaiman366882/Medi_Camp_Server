const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//usgin built in middlewares
app.use(cors());
app.use(express.json());

// *************************** MongoDB Connection Start **************************

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ea4znei.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		// ****************** Database Operation Start ******************

		const database = client.db("mediCampDB");
		const campCollection = database.collection("camps");
		const registerCollection = database.collection("registered");
		const userCollection = database.collection("users");

		//insert new user to database
		app.post("/users", async (req, res) => {
			const user = req.body;
			const query = { email: user.email };
			const isExist = await userCollection.findOne(query);
			if (isExist) {
				return res.send({ message: "user exist", insertedId: null });
			}
			const result = await userCollection.insertOne(user);
			res.send(result);
		});

		//Get All User from Database
		app.get("/users",async(req,res) => {
			const cursor = userCollection.find();
			const result = await cursor.toArray();
			res.send(result)
		});
		//delete user by id
		app.delete("/users/:id",async(req,res) => {
			const id = req.params.id;
			const query={_id:new ObjectId(id)};
			const result = await userCollection.deleteOne(query);
			res.send(result)
		})

		// insert new camp to database
		app.post("/camps", async (req, res) => {
			const newCamp = req.body;
			const result = await campCollection.insertOne(newCamp);
			res.send(result);
		});

		//get all camps data
		app.get("/camps", async (req, res) => {
			const cursor = campCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});

		//get specific single camp data
		app.get("/camps/:id", async (req, res) => {
			const id = req.params;
			const query = { _id: new ObjectId(id) };
			const result = await campCollection.findOne(query);
			res.send(result);
		});

		//update participant count
		app.patch("/participant/:id", async (req, res) => {
			const id = req.params;
			const newParticipants = req.body;
			const query = { _id: new ObjectId(id) };
			const updatedParticipants = {
				$set: {
					participants: newParticipants.participants,
				},
			};
			// const options = {upsert:true};
			const result = await campCollection.updateOne(
				query,
				updatedParticipants
			);
			console.log(newParticipants, id, result);
			res.send(result);
		});

		//make user as a camp participant
		app.post("/register", async (req, res) => {
			const registerInfo = req.body;
			const result = await registerCollection.insertOne(registerInfo);
			res.send(result);
		});

		// ****************** Database Operation End ******************

		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
		// Ensures that the client will close when you finish/error
		//await client.close();
	}
}
run().catch(console.dir);

// *************************** MongoDB Connection End **************************

app.get("/", (req, res) => {
	res.send("Medical Camp Server is running");
});
app.listen(port, () => {
	console.log(`Medical Camp server is running on port: ${port}`);
});
