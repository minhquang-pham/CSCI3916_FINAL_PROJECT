require('dotenv').config();
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

try {
    mongoose.connect( process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true}, () =>
        console.log("connected"));
}catch (error) {
    console.log("could not connect");
}

mongoose.set('useCreateIndex', true);

var TransactionSchema = new Schema({

    id:{type:Number,required:true},
    cart: [String],
    date: {type:String},
    ip:{type:String}
});

TransactionSchema.pre('save',function(next){
    next();
});


//return the models to server
module.exports = mongoose.model('Transaction', TransactionSchema);