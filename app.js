import express from "express";
import cors from "cors";
import { ObjectId, MongoClient } from "mongodb";
import path from "path"
import { fileURLToPath } from 'url';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
const PORT = process.env.PORT || 3000;

/**
 * Takes a number as input and returns the number if it is greater than 9, otherwise it 
 * returns the number with a leading zero.
 * @param number - The parameter "number" is a number that needs to be refined.
 * @returns returns the input number if it is greater than 9, otherwise it returns the 
 * input number with a leading zero.
 */
const refineNumber = (number) => {
    return number > 9 ? number : `0` + number;
}

/**
 * The function getCurrentTimeStamp returns the current date and time in a readable format.
 * @returns The function `getCurrentTimeStamp` returns a string in the format "YYYY-MM-DD HH:MM:SS",
 * representing the current date and time.
 */
const getCurrentTimeStamp = () => {
    const date = new Date();

    const month = refineNumber(date.getMonth() + 1);
    const day = refineNumber(date.getDate());

    const readAbleDate = `${date.getFullYear()}-${month}-${day}`

    const hours = refineNumber(date.getHours())
    const minutes = refineNumber(date.getMinutes())
    const seconds = refineNumber(date.getSeconds())

    const time = `${hours}:${minutes}:${seconds}`;

    return `${readAbleDate} ${time}`;
}

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

let db;

try {

    const client = await MongoClient.connect('mongodb+srv://cruz:coursework2password@cluster0.iakaynp.mongodb.net/dopo?retryWrites=true&w=majority');
    db = client.db('dopo')

    const timeStamp = getCurrentTimeStamp()
    console.log(`💾 ${timeStamp} [Database]: Database connected`)

} catch (e) {
    console.log(`💾 ${timeStamp} [Database]: Database connection failed`)
    console.log(e)
}

// LOGGER MIDDLEWARE
app.use((req, res, next) => {
    const timeStamp = getCurrentTimeStamp();
    console.log(`🚏 ${timeStamp} [Http]: ${req.method} ${req.path}`)
    next()
})

app.get('/', (req, res, next) => {
    res.send("Backend ready")
})

// GET ACTIVITIES
app.get('/activities', async (req, res, next) => {
    try {

        const collection = db.collection('activities')
        const activities = await collection.find({}).toArray();
        console.log(activities[0].id)
        res.send(activities);

    } catch (error) {
        return next(error)
    }
})

//  GET ORDERS
app.get('/orders', async () => {
    try {

        const collection = db.collection('orders')
        const orders = await collection.find({}).toArray();
        res.send(orders);

    } catch (error) {
        return next(error)
    }
})

// UPDATE ACTIVITIES SPACES
app.put('/activities', async () => {
    const activities = req.body

    activities.map( async (activity) => {
        try {

            const filter = { _id: new ObjectId(activity._id)}
            const value = {$inc: { spaces: - activity.bookedSpaces }}
            const options = { safe: true, multi: false }

            await db.collection('activities').updateOne(filter, value, options)

            res.send({message: "Spaces updated"})

        } catch (error) {
            return next(error)
        }
    })

})

// CREATE ORDER
app.post('/orders', async (req, res, next) => {

    const body = req.body;

    try {
        
        await db.collection("orders").insertOne(body);
        res.send({message: "Order successfull"})

    } catch (error) {
        next(error)
    }

})

//  SEARCH ACTIVITIES
app.get('/activities/search', async (req, res, next) => {
    const keyword = req.query.q;

    try {
        
        const activities = await db.collection('activities').find({
            $or: [
                {location: {'$regex': keyword, '$options': 'i'}},
                {title: {'$regex': keyword, '$options': 'i'}}
            ]
        }).toArray()

        res.send(activities);

    } catch (error) {
        next(error)
    }
})


// IMAGE MIDDLEWARE
app.use('/images', async (req, res, next) => {
    const filePath = path.join(__dirname, "static", req.url, "")
    
    fs.stat(filePath, (err, fileInfo) => {
        if (err) return next(err);
        if (fileInfo.isFile()) res.sendFile(filePath);
        else next()
    })
})

app.listen(PORT, () => {
    const timeStamp = getCurrentTimeStamp()
    console.log(`📡 ${timeStamp} [Server]: Server is running @ http://localhost:${PORT}`)
})