const express = require('express');

const router = express.Router();

const {body} = require('express-validator');


const adminController = require('../controllers/admin');

const isAuth = require('../middleware/is-auth');


 router.get('/add-product',isAuth,adminController.getAddProduct);

 router.post('/add-product' ,[
     body('title').isString().isLength({min:4}).trim(),
     body('price').isFloat().trim(),
     body('description')
     .isLength({min:5 , max:400})
     .isString().trim()
 ],isAuth,adminController.postAddProduct );

 router.get('/products' ,isAuth,adminController.getProducts);

 router.get('/edit-product/:productId',isAuth , adminController.getEditProduct);

 router.post('/edit-product',[
    body('title').isString().isLength({min:4}).trim(),
    body('price').isFloat().trim(),
    body('description')
    .isLength({min:5 , max:400})
    .isString().trim()
] ,isAuth,adminController.postEditProduct );

 router.delete('/products/:productId' ,isAuth, adminController.deleteProduct);


module.exports = router;
