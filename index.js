const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken')
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//using built in middlewares
app.use(cors());
app.use(express.json());

// ********** Custom MiddleWares Start **************

app.post('/jwt',async(req,res) => {
	const user = req.body;
	const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
		expiresIn:'1h'
	})
	res.send({token})
})

const verifyToken = (req,res,next) => {
	const authorization = req.headers.authorization;
	console.log(authorization);
	if(!authorization)
	{
		return res.status(401).send({message:'unauthorized'});
	}
	const token = authorization.split(' ')[1];
	jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) => {
		if(err)
		{
			return res.status(401).send({message:'unauthorized'});	
		}
		req.decoded = decoded;
		next()
	})
}

// ********** Custom MiddleWares End **************

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
		//await client.connect();

		// ****************** Database Operation Start ******************

		const database = client.db("mediCampDB");
		const campCollection = database.collection("camps");
		const registerCollection = database.collection("registered");
		const userCollection = database.collection("users");
		const feedbackCollection = database.collection("feedback");

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
		app.get("/users",verifyToken,async(req,res) => {
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
		});

		//make user admin
		app.patch("/users/admin/:id", async(req,res) => {
			const id=req.params.id;
			const filter = {_id : new ObjectId(id)};
			const updatedUser = {
				$set:{
					role:'admin'
				}
			}
			const result = await userCollection.updateOne(filter,updatedUser);
			res.send(result);
		});

		//verify is user an admin
		app.get("/users/admin/:email",verifyToken,async(req,res) => {
			const email = req.params.email;
			if(email !== req.decoded.email)
			{
				return res.status(403).send({message:"forbidden access"})
			}
			const query= {email:email};
			const user = await userCollection.findOne(query);
			let admin = false;
			if(user)
			{
				admin = user?.role === 'admin';
			}
			res.send({admin})
		});

		//make user Organizer
		app.patch("/users/organizer/:id", async(req,res) => {
			const id=req.params.id;
			const filter = {_id : new ObjectId(id)};
			const updatedUser = {
				$set:{
					role:'organizer'
				}
			}
			const result = await userCollection.updateOne(filter,updatedUser);
			res.send(result);
		});

		//verify is user an organizer
		app.get("/users/organizer/:email",verifyToken,async(req,res) => {
			const email = req.params.email;
			if(email !== req.decoded.email)
			{
				return res.status(403).send({message:"forbidden access"})
			}
			const query= {email:email};
			const user = await userCollection.findOne(query);
			let organizer = false;
			if(user)
			{
				organizer = user?.role === 'organizer';
			}
			res.send({organizer})
		});

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
		app.post("/register",verifyToken, async (req, res) => {
			const registerInfo = req.body;
			const result = await registerCollection.insertOne(registerInfo);
			res.send(result);
		});

		//get specific registered camps
		app.get("/register",verifyToken,async (req,res) => {
			const email =req.query.email;
			const query = {email:email};
			const cursor = registerCollection.find(query);
			const result = await cursor.toArray();
			res.send(result);
		});

		//update specific registered camps
		app.get("/status/register/:id",verifyToken,async (req,res) => {
			const id=req.params.id;
			const filter = {_id : new ObjectId(id)};
			const updatedUser = {
				$set:{
					status:'approved'
				}
			}
			const result = await registerCollection.updateOne(filter,updatedUser);
			res.send(result);
		});

		//get all registered camps
		app.get("/all/register",verifyToken,async (req,res) => {
			const cursor = registerCollection.find();
			const result = await cursor.toArray();
			res.send(result);
		});

		//delete user registered camps
		app.delete("/register/:id",verifyToken,async(req,res) => {
			const id = req.params.id;
			const query = {_id : new ObjectId(id)};
			const result = await registerCollection.deleteOne(query);
			res.send(result);
		});
		//delete user registered camps
		app.delete("/camps/:id",verifyToken,async(req,res) => {
			const id = req.params.id;
			const query = {_id : new ObjectId(id)};
			const result = await campCollection.deleteOne(query);
			res.send(result);
		});

		//get feedback from user 
		app.post("/feedback",verifyToken,async(req,res) => {
			const newFeedback = req.body;
			const result = await feedbackCollection.insertOne(newFeedback);
			res.send(result);

		});
		//get all feedback
		app.get("/feedback",async(req,res) => {
			const cursor = feedbackCollection.find();
			const result = await cursor.toArray();
			res.send(result)
		})

		//add new camps
		

		// ****************** Database Operation End ******************

		// Send a ping to confirm a successful connection
		// await client.db("admin").command({ ping: 1 });
		// console.log(
		// 	"Pinged your deployment. You successfully connected to MongoDB!"
		// );
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
