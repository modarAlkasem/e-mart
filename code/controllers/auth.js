const crypto = require('crypto');

const {validationResult}= require('express-validator');

const User = require('../models/user');

const bcrypt = require('bcryptjs');

const nodemailer = require('nodemailer');

const sendgridTransport = require('nodemailer-sendgrid-transport');
const user = require('../models/user');

const transporter = nodemailer.createTransport(sendgridTransport({
    auth:{
        api_key :process.env.SENDGRID_API_KEY
        //we can auth using username and pass of our account on sendgrid
    }
}));

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if(message.length>0){
        message = message[0]
    }else{
        message = null;
    }

    res.render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage:message,
      oldInput : {
            email:'',
            password : '',
            confirmPassword : ''
            },
        validationErrors :[]

    });
  };








exports.getLogin = (req , res , next)=>{
    let message = req.flash('error');
    if(message.length>0){
        message = message[0]
    }else{
        message = null;
    }
    const loggedIn = req.session.isLoggedin;
    console.log(loggedIn);

    res.render('auth/login' , {
        pageTitle : 'Login',
        path:'/login',
        errorMessage :message,
        oldInput : {
            email:'',
            password : ''
        },
        validationErrors:[]
    })
}



exports.postSignup = (req, res, next) => {

    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage:errors.array()[0].msg,
            oldInput : {
                email:email,
                password : password,
                confirmPassword : req.body.confirmPassword
            },
            validationErrors:errors.array()
          });
    }

         bcrypt.hash(password , 12)
            .then(hashedPassword=>{
                const user = new User({
                    email:email,
                    password:hashedPassword,
                    cart : {
                        items:[]
                    }
                });
                
                 user.save()
                 .then(result=>{
                    res.redirect('/login');
                    return transporter.sendMail({
                        to:email,
                        from:process.env.SENDER_EMAIL_ADDRESS,
                        subject:'Signup Succeeded',
                        html:'<h1> You successfully signed up!</h1>'
                    })
                   
                 })
                 .catch(err=>{
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                
                });
            })
  
}


exports.postLogin = (req , res, next)=>{

    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(422).render('auth/login' , {
            pageTitle : 'Login',
            path:'/login',
            errorMessage : errors.array()[0].msg,
            oldInput : {
                email:email,
                password : password
            },
            validationErrors : errors.array()
        })
    }


    User.findOne({email:email})
    .then(user=>{
        
        if(!user){
             return res.render('auth/login' , {
                pageTitle : 'Login',
                path:'/login',
                errorMessage :'Invalid email or password' ,
                oldInput : {
                    email:email,
                    password : password
                },
                validationErrors : []
            })
        }

         bcrypt.compare(password , user.password)
        .then(doMatch=>{
            if(!doMatch){
                return res.render('auth/login' , {
                    pageTitle : 'Login',
                    path:'/login',
                    errorMessage :'Invalid email or password' ,
                    oldInput : {
                        email:email,
                        password : password
                    },
                    validationErrors : []
                })
            }
            req.session.isLoggedin = true;
    
            req.session.user= user;
            
            req.session.save(err=>{
    
            console.log(err);
            res.redirect('/');
             });
    
        })
        .catch(err=>{
            console.log(err);
        })

    })
    
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });

    

    
}

exports.postLogout = (req , res, next)=>{
        req.session.destroy(err=>{
            console.log(err);
            res.redirect('/');
        })
    
 }


 exports.getReset = (req , res , next)=>{
    let message = req.flash('error');
    if(message.length>0){
        message = message[0]
    }else{
        message = null;
    }

    res.render('auth/reset' , {
        pageTitle : 'Reset Password',
        path:'/reset',
        errorMessage :message
    })
 }

 exports.postReset = (req , res , next)=>{

    User.findOne({email:req.body.email})
    .then(user=>{
        if(!user){

            req.flash('error' , 'No account with that email found.');
            return res.redirect('/reset');
        }

        crypto.randomBytes(32 ,(err , buffer)=>{
            if(err){
                console.log(err);
                return res.redirect('/reset')
            }
            const token = buffer.toString('hex');
            user.resetToken = token;
            user.resetTokenExpiration = Date.now()+3600000;
             user.save() 
             .then(result=>{
                res.redirect('/');
                return transporter.sendMail({
                    to:req.body.email,
                    from:process.env.SENDER_EMAIL_ADDRESS,
                    subject:'Password Reset',
                    html:`
                        <p> You requested a password reset</p>
                        <p>Click this <a href ="http://localhost:3000/reset/${token}" > link</a> to reset password. </p>
                    `
                })
            });
        })

    })
   
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });

 }



 exports.getNewPassword = (req , res , next)=>{

    User.findOne({resetToken:req.params.token , resetTokenExpiration:{$gt:Date.now()}})
    .then(user=>{
        if(!user){
            return res.redirect('/');
        }
        let message = req.flash('error');
        if(message.length>0){
            message = message[0]
        }else{
            message = null;
        }
    
        return res.render('auth/new-password' , {
            pageTitle : 'New Password',
            path:'/new-password',
            errorMessage :message,
            userId : user._id.toString(),
            passwordToken : req.params.token
        })
     }
    )
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });
 }

 exports.postNewPassword = (req , res , next)=>{

    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser ;
    User.findOne({
        resetToken : passwordToken,
        resetTokenExpiration : {$gt: Date.now()},
        _id : userId
    })
    .then(user=>{
        if(!user){
            return res.redirect('/');
        }
        resetUser = user;
        return bcrypt.hash(newPassword , 12)
    })
    .then(hashedPassword=>{
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    })
    .then(result=>{
        res.redirect('/login');
    })
    .catch(err=>{
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    
    });



 }