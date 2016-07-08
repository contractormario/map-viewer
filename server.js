var express = require('express');
var app = express();

app.use(function(req, resp, next){
    console.log(req.originalUrl);
    next();
});

/* Static files */
app.use(express.static('public'));

var server = app.listen(3000, function () {
});
