var router = require('express').Router()
const path = require("path")

module.exports = app => {
    router.get('/media/:name', (req, res) => {

        console.log('req>>>>>>>>>>>>>>',__dirname );

        const { type, name } = req.params

        res.sendFile(path.join(__dirname, `../middlewares/upload/${name}`,))
    })

    app.use('/api', router)
};
