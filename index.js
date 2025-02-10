const express = require('express')
const app = express();
require('dotenv').config()
const cors = require('cors');
const axios = require('axios')
const port = 4000
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const { type } = require('os');
const { error, log } = require('console');
const mongoose = require('mongoose')

app.listen(port, (error)=>{
    if(!error){
        console.log(`server running on localhost: ${port}`)
    }else{
        console.log("Error: "+error)
    }
})

app.use(express.json());
app.use(express.urlencoded({extended: true}))
app.use(cors());

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req,file,cb)=>{
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)

    }
})
const upload = multer({storage:storage})
app.use('/images', express.static('upload/images'))

app.post('/upload', upload.single('product'), (req,res)=>{
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required:true
    },
    name: {
            type: String,
            required: true
    },
    image: {
        type: String,
        required:true
    },
    category : {
        type: String,
        required: true
    },
    new_price:{
        type: Number,
        required:true
    },
    old_price: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    available: {
        type: Boolean,
        default: true
    }
})

app.post('/addproduct', async (req,res)=>{
    let products = await Product.find({})
    let id;
    if (products.length>0){
        let last_product_array = products.slice(-1)
        let last_product = last_product_array[0]
        id = last_product.id+1;

    }else{
        id=1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    })
    await product.save();
    res.json({
        success: true,
        name: req.body.name,
    })
})

app.get('/allproducts', async(req,res)=>{
    let products = await Product.find({});
    res.send(products)
})


app.post('/removeproduct', async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id})
    res.json({
        success: 1,
        name: req.body.name
    })
})



mongoose.connect("mongodb://localhost:27017/COMRADE2COMRADE1")


const Users = mongoose.model('Users', {
    name: {
        type: String,
        required: true, 
    },
    email: {
        type: String,
        unique: true, 
        required: true,

    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Object,
        default: {},
    },
    date: {
        type: Date,
        default: Date.now,
    },
});

app.post('/signup', async(req,res)=>{
    let check = await Users.findOne({email:req.body.email})
    if (check){
        return res.status(400).json({success: false, errors: "Existing user found with same email address."})
    }
        let cart = {}
        for(let i=0; i<250; i++){
            cart[i] = 0
        }
      const user = new Users({
        firstName : req.body.firstName,
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
      }) 

      await user.save();

      const data = {
        user: {
            id: user.id
        }
      }
      const token = jwt.sign(data, 'secret_ecom')
      res.json({success: true, token})
})

app.post('/login', async(req,res)=> {
    let user = await Users.findOne({email:req.body.email})
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id: user.id
                }
            }
            const token = jwt.sign(data, 'secret_ecom')
            res.json({success: true, token})
        }
        else{
            res.json({success:false, errors: "Wrong password"})
        }
    }
    else{
        res.json({success:false, errors: "Wrong email address"})
    }
})

const fetchUser = async(req,res,next)=>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors: "Please authenticate using valid token"})
    }else{
        try{
            const data = jwt.verify(token, 'secret_ecom')
            req.user = data.user
            next();
        }catch(error){
            res.status(401).send({errors:"Please authenticate using a valid token."})
        }
    }
}

app.post('/addtocart', fetchUser, async(req,res)=>{
    let userData = await Users.findOne({_id:req.user.id})
    userData.cartData[req.body.itemId]+=1
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData})    
})

app.post('/removeFromCart', fetchUser, async(req,res)=>{
    let userData = await Users.findOne({_id:req.user.id})
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId]-=1
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData})
    res.send("Removed")
})

app.post('/getcart', fetchUser,async(req,res)=>{
    let userData = await Users.findOne({_id:req.user.id})
    res.json(userData.cartData)
})




