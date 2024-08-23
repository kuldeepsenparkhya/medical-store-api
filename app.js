const express = require('express')
require('dotenv').config()
const app = express()
const path = require('path');



const cors = require('cors')
const bodyParser = require('body-parser')

app.use(express.static(path.join(__dirname, "public")));
const morgan = require('morgan')

const { authJWT } = require('./app/middlewares/auth');
const { PORT } = require('./app/config/config');
const HOST = '192.168.0.23';




app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"],
    credentials: true
}));


app.use(bodyParser.json())
app.use(morgan('tiny'));


require('./app/routes/media')(app)
require('./app/routes/product')(app)
app.use(authJWT)


require('./app/routes/auth/auth')(app)

require('./app/routes/user')(app)
require('./app/routes/brand')(app)
require('./app/routes/productCategory')(app)






app.get('*', (req, res) => {
    res.status(400).send({
        message: 'Hunn smart!',
        error: true,
    })
})



app.listen(PORT, HOST, () => { console.log(`Server is running on http://${HOST}:${PORT}`); });


