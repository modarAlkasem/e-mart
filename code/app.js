

const express = require('express');

const dotenvConfig = require('dotenv').config();

const app = express();





app.set('view engine' , 'ejs');

app.set('views' , 'views');

const bodyParser = require('body-parser'); 

const multer = require('multer');

const adminRoutes = require('./routes/admin');

const shopRoutes = require('./routes/shop');

const authRoutes = require('./routes/auth');

const path = require('path');

const errorController = require('./controllers/error');
const shopController = require('./controllers/shop');

const isAuth = require('./middleware/is-auth');
const session = require('express-session');

const MongoDBStore = require("connect-mongodb-session")(session);

const csrf = require('csurf');

const flash = require('connect-flash');

const PORT = process.env.PORT;
const HOST = process.env.HOST;

const MONGODB_URI = process.env.DB_URI;
const store =new  MongoDBStore({
    uri:MONGODB_URI,
    collection:'sessions',
    
})

const csrfProtection = csrf();


const mongoose  = require('mongoose');

const User = require('./models/user');
const product = require('./models/product');


const fileStorage = multer.diskStorage({
    destination :(req , file , cb)=>{

        cb(null , 'images');
    } ,
    filename : (req, file , cb)=>{
        
        cb(null , new Date().toISOString().replace(/:/g , '-')+ '-'+file.originalname);
    }
});

const fileFilter = (req , file , cb)=>{
    if(
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/jpeg' ||
        file.mimetype==='image/png'
    ){
        cb(null , true);

    }else{
        cb(null , false); 
    }
};


app.use(bodyParser.urlencoded({extended : false}));

app.use(multer({ storage:fileStorage , fileFilter : fileFilter}).single('image'));

app.use(express.static(path.join(__dirname , 'public')));

app.use('/images' , express.static(path.join(__dirname ,'images')));

app.use(session(
    {secret:'my Secret' ,
     resave:false ,
    saveUninitialized:false ,
    
    store:store
    }
    ));




app.use(flash());

app.use((req , res , next)=>{
    res.locals.isAuthenticated = req.session.isLoggedin;
    

    next();
});

app.use((req , res , next)=>{
    
    if(!req.session.user){
        return next();
    }
    User.findById(req.session.user._id)
    .then(user=>{
        if(!user){
            return next();
        }
      req.user = user;
      next();
    })
    .catch(error=>{
        throw new Error (error);
    })

})  ;


app.post('/create-order', isAuth, shopController.postOrder);

app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

 app.use('/admin',adminRoutes);
 app.use(shopRoutes);
 app.use(authRoutes);
 app.use('/500',errorController.get500);
app.use(errorController.get404);

app.use((error , req , res ,next)=>{
    
       console.log(error);
        res.status(500).render('500' ,{
            pageTitle: 'Error!' ,
            path : '/500',
});
            
           
})









mongoose.connect(MONGODB_URI)
.then(()=>{
     
    app.listen(PORT,HOST);
    console.log('Connected!');
})
.catch(err=>{
    console.log(err);
})