const express = require('express');

const router = express.Router();

const User = require('../models/user');

const {check  , body} = require('express-validator');

const authController = require('../controllers/auth');

router.get('/signup', authController.getSignup);

router.get('/login' , authController.getLogin);

router.get('/reset' , authController.getReset);

router.get('/reset/:token' , authController.getNewPassword);

router.post('/signup',[check('email').isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value , {req})=>{
            return User.findOne({email:value})
            .then(userDoc=>{
                if(userDoc){
                    return Promise.reject( 'E-Mail is already exists, please pick another one.')
                }
            })

        }).normalizeEmail(), body('password' ,
         'Please enter a password with only numbers and text and at least 5 characters.')
        .isLength({min:5}).isAlphanumeric().trim(),
        body('confirmPassword').trim().custom((value , {req})=>{

            if(value !== req.body.password){
                throw new Error('Passwords have to match!')
            }
            return true;
        })
        ]
        , 
        authController.postSignup);

router.post('/login',[
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email address.')
      .normalizeEmail(),
    body('password', 'Password has to be valid.')
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim()
  ], authController.postLogin);

router.post('/logout' , authController.postLogout);

router.post('/reset' , authController.postReset);

router.post('/new-password' , authController.postNewPassword);

module.exports= router;

