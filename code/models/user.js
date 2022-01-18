const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({

    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    resetToken:String,
    resetTokenExpiration : Date,
    cart:{
        items:[
            {
            productId:{type : Schema.Types.ObjectId, ref:'Product',required:true},
            quantity:{
                type:Number,
                required:true
            }
        }
    ]
    }
});

userSchema.methods.addToCart = function(product){
    let newQuantity = 1;
    let updatedCartItems = [...this.cart.items];
    
    const cartItemIndex = this.cart.items.findIndex(cp=>{

        return cp.productId.toString()=== product._id.toString();
    });
    if(cartItemIndex>=0){
        newQuantity = this.cart.items[cartItemIndex].quantity+1;
        updatedCartItems[cartItemIndex].quantity = newQuantity;
    }
    else{
        updatedCartItems.push({productId:product._id , quantity:newQuantity})
    }

    const updatedCart = {items:updatedCartItems};
    this.cart = updatedCart;
    return this.save();
}

userSchema.methods.removeFromCart = function(prodId){
    const updatedCartItems = this.cart.items.filter(item=>{
        console.log(item.productId.toString());
        return item.productId.toString()!==prodId.toString() 
    }) ;
    this.cart = {items:updatedCartItems};
    return this.save();
}
userSchema.methods.clearCart = function(){
    this.cart = {items:[]};
    return this.save();
}


module.exports = mongoose.model('User' , userSchema);

















